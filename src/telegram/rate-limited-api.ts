/**
 * Rate-limited Telegram API wrapper
 *
 * Integrates the enhanced rate limiting system with Telegram Bot API calls
 * to prevent rate limit errors proactively while maintaining throughput.
 *
 * @module telegram/rate-limited-api
 */

import type { Bot } from "grammy";
import { createSubsystemLogger } from "../logging/subsystem.js";
import {
  RateLimiter,
  createProviderRateLimiterOptions,
  rateLimiterRegistry,
} from "../infra/rate-limiter.js";

const log = createSubsystemLogger("telegram/rate-limited");

/**
 * Telegram rate limits (from Telegram Bot API documentation)
 * - Global: 30 messages per second to all chats
 * - Per-chat: 1 message per second for groups
 * - DM: 1 message per second per user (can burst)
 */
const TELEGRAM_GLOBAL_RATE_LIMIT = {
  requestsPerSecond: 30,
  burstSize: 60, // Allow bursts
};

const TELEGRAM_CHAT_RATE_LIMIT = {
  requestsPerSecond: 1,
  burstSize: 3, // Small burst for groups
};

const TELEGRAM_DM_RATE_LIMIT = {
  requestsPerSecond: 1,
  burstSize: 10, // Higher burst for DMs
};

export type TelegramRateLimitedApiOptions = {
  accountId: string;
  api: Bot["api"];
  /** Enable verbose logging */
  verbose?: boolean;
  /** Override default rate limits */
  customLimits?: {
    global?: { requestsPerSecond: number; burstSize?: number };
    chat?: { requestsPerSecond: number; burstSize?: number };
    dm?: { requestsPerSecond: number; burstSize?: number };
  };
};

/**
 * Rate-limited wrapper for Telegram Bot API
 */
export class TelegramRateLimitedApi {
  private readonly accountId: string;
  private readonly api: Bot["api"];
  private readonly verbose: boolean;
  private readonly globalLimiter: RateLimiter;

  constructor(options: TelegramRateLimitedApiOptions) {
    this.accountId = options.accountId;
    this.api = options.api;
    this.verbose = options.verbose ?? false;

    // Create global rate limiter
    const globalLimits = options.customLimits?.global ?? TELEGRAM_GLOBAL_RATE_LIMIT;
    this.globalLimiter = rateLimiterRegistry.getOrCreate(
      `telegram:${options.accountId}:global`,
      createProviderRateLimiterOptions({
        provider: "telegram",
        accountId: `${options.accountId}:global`,
        requestsPerSecond: globalLimits.requestsPerSecond,
        burstSize: globalLimits.burstSize,
      }),
    );
  }

  /**
   * Execute a Telegram API request with rate limiting
   * @param fn The API call to execute
   * @param context Context for logging and rate limit selection
   */
  async executeWithRateLimit<T>(
    fn: () => Promise<T>,
    context: {
      method: string;
      chatId?: string | number;
      isGroup?: boolean;
    },
  ): Promise<T> {
    const limiter = this.selectLimiter(context);

    // Try to acquire rate limit token
    const result = limiter.tryAcquire();

    if (!result.allowed) {
      if (this.verbose) {
        log.warn(
          `[telegram:${this.accountId}] Rate limit hit for ${context.method}. ` +
            `Circuit: ${result.circuitState}, Retry after: ${result.retryAfter}ms`,
        );
      }

      // Wait for rate limit to clear
      const acquired = await limiter.waitAndAcquire();
      if (!acquired) {
        throw new Error(
          `Telegram rate limit timeout for ${context.method} (circuit: ${result.circuitState})`,
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
    method: string;
    chatId?: string | number;
    isGroup?: boolean;
  }): RateLimiter {
    // Chat-specific limiter
    if (context.chatId) {
      const chatKey = String(context.chatId);
      const isGroup = context.isGroup ?? chatKey.startsWith("-");
      const limiterType = isGroup ? "group" : "dm";
      const key = `telegram:${this.accountId}:${limiterType}:${chatKey}`;

      const limits = isGroup ? TELEGRAM_CHAT_RATE_LIMIT : TELEGRAM_DM_RATE_LIMIT;

      return rateLimiterRegistry.getOrCreate(
        key,
        createProviderRateLimiterOptions({
          provider: "telegram",
          accountId: `${this.accountId}:${limiterType}:${chatKey}`,
          requestsPerSecond: limits.requestsPerSecond,
          burstSize: limits.burstSize,
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
   * Get metrics for all Telegram rate limiters
   */
  getMetrics(): ReturnType<typeof rateLimiterRegistry.getAggregatedMetrics> {
    return rateLimiterRegistry.getAggregatedMetrics();
  }
}

/**
 * Create a rate-limited Telegram Bot API wrapper
 */
export function createRateLimitedTelegramApi(options: TelegramRateLimitedApiOptions) {
  const rateLimited = new TelegramRateLimitedApi(options);

  return {
    /**
     * Send a text message with rate limiting
     */
    async sendMessage(params: {
      chatId: string | number;
      text: string;
      isGroup?: boolean;
      [key: string]: unknown;
    }): Promise<unknown> {
      return rateLimited.executeWithRateLimit(
        () => options.api.sendMessage(params.chatId, params.text, params as any),
        {
          method: "sendMessage",
          chatId: params.chatId,
          isGroup: params.isGroup,
        },
      );
    },

    /**
     * Send a photo with rate limiting
     */
    async sendPhoto(params: {
      chatId: string | number;
      photo: string | { source: Buffer };
      isGroup?: boolean;
      [key: string]: unknown;
    }): Promise<unknown> {
      return rateLimited.executeWithRateLimit(
        () => options.api.sendPhoto(params.chatId, params.photo, params as any),
        {
          method: "sendPhoto",
          chatId: params.chatId,
          isGroup: params.isGroup,
        },
      );
    },

    /**
     * Send a document with rate limiting
     */
    async sendDocument(params: {
      chatId: string | number;
      document: string | { source: Buffer };
      isGroup?: boolean;
      [key: string]: unknown;
    }): Promise<unknown> {
      return rateLimited.executeWithRateLimit(
        () => options.api.sendDocument(params.chatId, params.document, params as any),
        {
          method: "sendDocument",
          chatId: params.chatId,
          isGroup: params.isGroup,
        },
      );
    },

    /**
     * Edit a message with rate limiting
     */
    async editMessageText(params: {
      chatId: string | number;
      messageId: number;
      text: string;
      isGroup?: boolean;
      [key: string]: unknown;
    }): Promise<unknown> {
      return rateLimited.executeWithRateLimit(
        () =>
          options.api.editMessageText(params.chatId, params.messageId, params.text, params as any),
        {
          method: "editMessageText",
          chatId: params.chatId,
          isGroup: params.isGroup,
        },
      );
    },

    /**
     * Set a reaction with rate limiting
     */
    async setMessageReaction(params: {
      chatId: string | number;
      messageId: number;
      reaction?: Array<{ type: string; emoji: string }>;
      isGroup?: boolean;
    }): Promise<boolean> {
      return rateLimited.executeWithRateLimit(
        () =>
          options.api.setMessageReaction(params.chatId, params.messageId, params.reaction, {
            is_big: false,
          }),
        {
          method: "setMessageReaction",
          chatId: params.chatId,
          isGroup: params.isGroup,
        },
      );
    },

    /**
     * Get raw API instance (without rate limiting)
     * Use with caution - bypasses rate limiting
     */
    getRawApi(): Bot["api"] {
      return options.api;
    },

    /**
     * Get current rate limiting state
     */
    getState() {
      return rateLimited.getState();
    },

    /**
     * Get rate limiting metrics
     */
    getMetrics() {
      return rateLimited.getMetrics();
    },
  };
}
