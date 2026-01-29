/**
 * Rate-limited Discord API wrapper
 *
 * Integrates the enhanced rate limiting system with Discord API calls
 * to prevent rate limit errors proactively while maintaining throughput.
 *
 * @module discord/rate-limited-api
 */

import type { RequestClient } from "@buape/carbon";
import { createSubsystemLogger } from "../logging/subsystem.js";
import {
  RateLimiter,
  createProviderRateLimiterOptions,
  rateLimiterRegistry,
  type RateLimitResult,
} from "../infra/rate-limiter.js";

const log = createSubsystemLogger("discord/rate-limited");

/**
 * Discord rate limits (from Discord API documentation)
 * - Global: 50 requests per second
 * - Per-route: varies by endpoint
 * - Per-guild: 10 requests per 10 seconds
 * - DM: 5 requests per second per recipient
 */
const DISCORD_GLOBAL_RATE_LIMIT = {
  requestsPerSecond: 50,
  burstSize: 100, // Allow bursts
};

const DISCORD_DM_RATE_LIMIT = {
  requestsPerSecond: 5,
  burstSize: 10,
};

const DISCORD_GUILD_RATE_LIMIT = {
  requestsPerSecond: 1, // 10 per 10s
  burstSize: 10,
};

export type DiscordRateLimitedApiOptions = {
  accountId: string;
  rest: RequestClient;
  /** Enable verbose logging */
  verbose?: boolean;
  /** Override default rate limits */
  customLimits?: {
    global?: { requestsPerSecond: number; burstSize?: number };
    dm?: { requestsPerSecond: number; burstSize?: number };
    guild?: { requestsPerSecond: number; burstSize?: number };
  };
};

/**
 * Rate-limited wrapper for Discord API client
 */
export class DiscordRateLimitedApi {
  private readonly accountId: string;
  private readonly rest: RequestClient;
  private readonly verbose: boolean;
  private readonly globalLimiter: RateLimiter;

  constructor(options: DiscordRateLimitedApiOptions) {
    this.accountId = options.accountId;
    this.rest = options.rest;
    this.verbose = options.verbose ?? false;

    // Create global rate limiter
    const globalLimits = options.customLimits?.global ?? DISCORD_GLOBAL_RATE_LIMIT;
    this.globalLimiter = rateLimiterRegistry.getOrCreate(
      `discord:${options.accountId}:global`,
      createProviderRateLimiterOptions({
        provider: "discord",
        accountId: `${options.accountId}:global`,
        requestsPerSecond: globalLimits.requestsPerSecond,
        burstSize: globalLimits.burstSize,
      }),
    );
  }

  /**
   * Execute a Discord API request with rate limiting
   * @param fn The API call to execute
   * @param context Context for logging and rate limit selection
   */
  async executeWithRateLimit<T>(
    fn: () => Promise<T>,
    context: {
      endpoint: string;
      channelId?: string;
      guildId?: string;
      userId?: string;
    },
  ): Promise<T> {
    const limiter = this.selectLimiter(context);

    // Try to acquire rate limit token
    const result = limiter.tryAcquire();

    if (!result.allowed) {
      if (this.verbose) {
        log.warn(
          `[discord:${this.accountId}] Rate limit hit for ${context.endpoint}. ` +
            `Circuit: ${result.circuitState}, Retry after: ${result.retryAfter}ms`,
        );
      }

      // Wait for rate limit to clear
      const acquired = await limiter.waitAndAcquire();
      if (!acquired) {
        throw new Error(
          `Discord rate limit timeout for ${context.endpoint} (circuit: ${result.circuitState})`,
        );
      }
    }

    try {
      const response = await fn();
      limiter.recordSuccess();
      return response;
    } catch (err) {
      limiter.recordFailure();
      throw err;
    }
  }

  /**
   * Select appropriate rate limiter based on context
   */
  private selectLimiter(context: {
    endpoint: string;
    channelId?: string;
    guildId?: string;
    userId?: string;
  }): RateLimiter {
    // DM-specific limiter (per user)
    if (context.userId && !context.guildId) {
      const key = `discord:${this.accountId}:dm:${context.userId}`;
      return rateLimiterRegistry.getOrCreate(
        key,
        createProviderRateLimiterOptions({
          provider: "discord",
          accountId: `${this.accountId}:dm:${context.userId}`,
          requestsPerSecond: DISCORD_DM_RATE_LIMIT.requestsPerSecond,
          burstSize: DISCORD_DM_RATE_LIMIT.burstSize,
        }),
      );
    }

    // Guild-specific limiter
    if (context.guildId) {
      const key = `discord:${this.accountId}:guild:${context.guildId}`;
      return rateLimiterRegistry.getOrCreate(
        key,
        createProviderRateLimiterOptions({
          provider: "discord",
          accountId: `${this.accountId}:guild:${context.guildId}`,
          requestsPerSecond: DISCORD_GUILD_RATE_LIMIT.requestsPerSecond,
          burstSize: DISCORD_GUILD_RATE_LIMIT.burstSize,
        }),
      );
    }

    // Fall back to global limiter
    return this.globalLimiter;
  }

  /**
   * Get current rate limiting state
   */
  getState(): {
    accountId: string;
    global: ReturnType<RateLimiter["getState"]>;
    limiters: Map<string, RateLimiter>;
  } {
    return {
      accountId: this.accountId,
      global: this.globalLimiter.getState(),
      limiters: rateLimiterRegistry.getAll(),
    };
  }

  /**
   * Get metrics for all Discord rate limiters
   */
  getMetrics(): ReturnType<typeof rateLimiterRegistry.getAggregatedMetrics> {
    return rateLimiterRegistry.getAggregatedMetrics();
  }
}

/**
 * Helper to wrap Discord REST API calls with rate limiting
 */
export function createRateLimitedDiscordClient(options: DiscordRateLimitedApiOptions) {
  const api = new DiscordRateLimitedApi(options);

  return {
    /**
     * Send a message to a channel
     */
    async sendMessage(params: {
      channelId: string;
      content: string;
      guildId?: string;
    }): Promise<unknown> {
      return api.executeWithRateLimit(
        () =>
          options.rest.post(
            `/channels/${params.channelId}/messages` as `/channels/${string}/messages`,
            {
              body: { content: params.content },
            },
          ),
        {
          endpoint: "createMessage",
          channelId: params.channelId,
          guildId: params.guildId,
        },
      );
    },

    /**
     * Send a DM to a user
     */
    async sendDirectMessage(params: { userId: string; content: string }): Promise<unknown> {
      // First create DM channel
      const dmChannel = await api.executeWithRateLimit(
        () =>
          options.rest.post("/users/@me/channels" as const, {
            body: { recipient_id: params.userId },
          }),
        {
          endpoint: "createDM",
          userId: params.userId,
        },
      );

      const channelId = (dmChannel as { id?: string }).id;
      if (!channelId) {
        throw new Error("Failed to create DM channel");
      }

      // Send message
      return api.executeWithRateLimit(
        () =>
          options.rest.post(`/channels/${channelId}/messages` as `/channels/${string}/messages`, {
            body: { content: params.content },
          }),
        {
          endpoint: "createMessage",
          channelId,
          userId: params.userId,
        },
      );
    },

    /**
     * Add a reaction to a message
     */
    async addReaction(params: {
      channelId: string;
      messageId: string;
      emoji: string;
      guildId?: string;
    }): Promise<void> {
      await api.executeWithRateLimit(
        () =>
          options.rest.put(
            `/channels/${params.channelId}/messages/${params.messageId}/reactions/${params.emoji}/@me` as `/channels/${string}/messages/${string}/reactions/${string}/@me`,
          ),
        {
          endpoint: "addReaction",
          channelId: params.channelId,
          guildId: params.guildId,
        },
      );
    },

    /**
     * Get raw API instance (without rate limiting)
     * Use with caution - bypasses rate limiting
     */
    getRawRest(): RequestClient {
      return options.rest;
    },

    /**
     * Get current rate limiting state
     */
    getState() {
      return api.getState();
    },

    /**
     * Get rate limiting metrics
     */
    getMetrics() {
      return api.getMetrics();
    },
  };
}
