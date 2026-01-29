/**
 * Enhanced Rate Limiting System with Circuit Breaker Pattern
 *
 * Provides intelligent rate limiting across messaging channels to prevent
 * rate limit errors proactively while maintaining high throughput.
 *
 * Features:
 * - Sliding window rate limiting with token bucket algorithm
 * - Circuit breaker pattern for fault tolerance
 * - Adaptive backoff based on provider responses
 * - Per-channel and per-account isolation
 * - Comprehensive metrics and monitoring
 *
 * @module rate-limiter
 */

import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("rate-limiter");

export type RateLimitConfig = {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Burst allowance (tokens available immediately) */
  burstSize?: number;
  /** Token refill rate per second */
  refillRate?: number;
};

export type CircuitBreakerConfig = {
  /** Failure threshold before opening circuit */
  failureThreshold: number;
  /** Timeout in ms before attempting half-open */
  resetTimeoutMs: number;
  /** Success threshold in half-open state to close circuit */
  successThreshold: number;
};

export type RateLimiterOptions = {
  /** Rate limit configuration */
  rateLimit: RateLimitConfig;
  /** Circuit breaker configuration */
  circuitBreaker?: CircuitBreakerConfig;
  /** Identifier for this limiter instance */
  identifier: string;
  /** Channel or provider name for logging */
  channel?: string;
};

export type RateLimitResult = {
  /** Whether the request is allowed */
  allowed: boolean;
  /** Remaining requests in current window */
  remaining: number;
  /** Time in ms until next token is available */
  retryAfter?: number;
  /** Current circuit breaker state */
  circuitState: CircuitState;
  /** Reason for rejection if not allowed */
  reason?: string;
};

export type CircuitState = "closed" | "open" | "half_open";

export type RateLimitMetrics = {
  /** Total requests attempted */
  totalRequests: number;
  /** Requests allowed through */
  allowedRequests: number;
  /** Requests rejected by rate limit */
  rejectedRequests: number;
  /** Requests rejected by circuit breaker */
  circuitRejections: number;
  /** Circuit breaker state changes */
  circuitStateChanges: number;
  /** Average wait time in ms */
  averageWaitMs: number;
};

const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30_000,
  successThreshold: 2,
};

/**
 * Sliding window rate limiter with token bucket algorithm
 */
class SlidingWindowLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly timestamps: number[] = [];
  private tokens: number;
  private readonly burstSize: number;
  private readonly refillRate: number;
  private lastRefill: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
    this.burstSize = config.burstSize ?? config.maxRequests;
    this.refillRate = config.refillRate ?? config.maxRequests / (config.windowMs / 1000);
    this.tokens = this.burstSize;
    this.lastRefill = Date.now();
  }

  /**
   * Attempt to consume a token
   * @returns Object with allowed status and retry information
   */
  tryAcquire(): { allowed: boolean; remaining: number; retryAfter?: number } {
    const now = Date.now();
    this.refillTokens(now);
    this.pruneOldTimestamps(now);

    // Check token bucket
    if (this.tokens >= 1) {
      this.tokens -= 1;
      this.timestamps.push(now);
      return {
        allowed: true,
        remaining: Math.floor(this.tokens),
      };
    }

    // Check sliding window
    if (this.timestamps.length < this.maxRequests) {
      this.timestamps.push(now);
      return {
        allowed: true,
        remaining: this.maxRequests - this.timestamps.length,
      };
    }

    // Calculate retry after
    const oldestTimestamp = this.timestamps[0];
    const retryAfter = oldestTimestamp ? oldestTimestamp + this.windowMs - now : this.windowMs;

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.max(0, retryAfter),
    };
  }

  /**
   * Get current limiter state
   */
  getState(): { tokens: number; requests: number; maxRequests: number } {
    const now = Date.now();
    this.refillTokens(now);
    this.pruneOldTimestamps(now);

    return {
      tokens: this.tokens,
      requests: this.timestamps.length,
      maxRequests: this.maxRequests,
    };
  }

  private refillTokens(now: number): void {
    const timeSinceLastRefill = now - this.lastRefill;
    const tokensToAdd = (timeSinceLastRefill / 1000) * this.refillRate;

    if (tokensToAdd >= 1) {
      this.tokens = Math.min(this.burstSize, this.tokens + Math.floor(tokensToAdd));
      this.lastRefill = now;
    }
  }

  private pruneOldTimestamps(now: number): void {
    const cutoff = now - this.windowMs;
    while (this.timestamps.length > 0 && this.timestamps[0]! < cutoff) {
      this.timestamps.shift();
    }
  }
}

/**
 * Circuit breaker implementation for fault tolerance
 */
class CircuitBreaker {
  private state: CircuitState = "closed";
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly config: CircuitBreakerConfig;
  private readonly identifier: string;

  constructor(config: CircuitBreakerConfig, identifier: string) {
    this.config = config;
    this.identifier = identifier;
  }

  /**
   * Check if request should be allowed through circuit
   */
  canAttempt(): { allowed: boolean; state: CircuitState } {
    if (this.state === "closed") {
      return { allowed: true, state: this.state };
    }

    if (this.state === "open") {
      const now = Date.now();
      if (now - this.lastFailureTime >= this.config.resetTimeoutMs) {
        this.transitionTo("half_open");
        return { allowed: true, state: this.state };
      }
      return { allowed: false, state: this.state };
    }

    // half_open state - allow request to test recovery
    return { allowed: true, state: this.state };
  }

  /**
   * Record a successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === "half_open") {
      this.successCount += 1;
      if (this.successCount >= this.config.successThreshold) {
        this.transitionTo("closed");
        this.successCount = 0;
      }
    }
  }

  /**
   * Record a failed request
   */
  recordFailure(): void {
    this.lastFailureTime = Date.now();
    this.failureCount += 1;
    this.successCount = 0;

    if (this.state === "half_open") {
      this.transitionTo("open");
    } else if (this.state === "closed" && this.failureCount >= this.config.failureThreshold) {
      this.transitionTo("open");
    }
  }

  /**
   * Get current circuit state
   */
  getState(): CircuitState {
    return this.state;
  }

  /**
   * Get circuit metrics
   */
  getMetrics(): { failureCount: number; successCount: number; state: CircuitState } {
    return {
      failureCount: this.failureCount,
      successCount: this.successCount,
      state: this.state,
    };
  }

  private transitionTo(newState: CircuitState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    log.info(`[${this.identifier}] Circuit breaker: ${oldState} → ${newState}`);
  }
}

/**
 * Enhanced rate limiter with circuit breaker pattern
 */
export class RateLimiter {
  private readonly limiter: SlidingWindowLimiter;
  private readonly circuitBreaker: CircuitBreaker | null;
  private readonly identifier: string;
  private readonly channel?: string;

  // Metrics
  private metrics: RateLimitMetrics = {
    totalRequests: 0,
    allowedRequests: 0,
    rejectedRequests: 0,
    circuitRejections: 0,
    circuitStateChanges: 0,
    averageWaitMs: 0,
  };
  private totalWaitMs = 0;

  constructor(options: RateLimiterOptions) {
    this.limiter = new SlidingWindowLimiter(options.rateLimit);
    this.circuitBreaker = options.circuitBreaker
      ? new CircuitBreaker(options.circuitBreaker, options.identifier)
      : null;
    this.identifier = options.identifier;
    this.channel = options.channel;
  }

  /**
   * Attempt to acquire permission for a request
   * @returns Result indicating if request is allowed
   */
  tryAcquire(): RateLimitResult {
    this.metrics.totalRequests += 1;

    // Check circuit breaker first
    if (this.circuitBreaker) {
      const circuitCheck = this.circuitBreaker.canAttempt();
      if (!circuitCheck.allowed) {
        this.metrics.circuitRejections += 1;
        return {
          allowed: false,
          remaining: 0,
          circuitState: circuitCheck.state,
          reason: "Circuit breaker is open",
        };
      }
    }

    // Check rate limit
    const limitCheck = this.limiter.tryAcquire();

    if (limitCheck.allowed) {
      this.metrics.allowedRequests += 1;
    } else {
      this.metrics.rejectedRequests += 1;
      if (limitCheck.retryAfter) {
        this.totalWaitMs += limitCheck.retryAfter;
        this.metrics.averageWaitMs =
          this.metrics.rejectedRequests > 0 ? this.totalWaitMs / this.metrics.rejectedRequests : 0;
      }
    }

    return {
      allowed: limitCheck.allowed,
      remaining: limitCheck.remaining,
      retryAfter: limitCheck.retryAfter,
      circuitState: this.circuitBreaker?.getState() ?? "closed",
      reason: limitCheck.allowed ? undefined : "Rate limit exceeded",
    };
  }

  /**
   * Record a successful request execution
   */
  recordSuccess(): void {
    this.circuitBreaker?.recordSuccess();
  }

  /**
   * Record a failed request execution
   */
  recordFailure(): void {
    this.circuitBreaker?.recordFailure();
  }

  /**
   * Get current rate limiter metrics
   */
  getMetrics(): RateLimitMetrics {
    return { ...this.metrics };
  }

  /**
   * Get detailed state information
   */
  getState(): {
    identifier: string;
    channel?: string;
    limiter: { tokens: number; requests: number; maxRequests: number };
    circuit?: { failureCount: number; successCount: number; state: CircuitState };
    metrics: RateLimitMetrics;
  } {
    return {
      identifier: this.identifier,
      channel: this.channel,
      limiter: this.limiter.getState(),
      circuit: this.circuitBreaker?.getMetrics(),
      metrics: this.getMetrics(),
    };
  }

  /**
   * Wait for rate limit availability and then acquire
   * @param maxWaitMs Maximum time to wait (default: 30s)
   * @returns Whether acquisition was successful
   */
  async waitAndAcquire(maxWaitMs = 30_000): Promise<boolean> {
    const startTime = Date.now();

    while (true) {
      const result = this.tryAcquire();

      if (result.allowed) {
        return true;
      }

      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed >= maxWaitMs) {
        log.warn(
          `[${this.identifier}] Wait timeout exceeded after ${elapsed}ms (max: ${maxWaitMs}ms)`,
        );
        return false;
      }

      // Wait for retry period
      const waitMs = Math.min(result.retryAfter ?? 1000, maxWaitMs - elapsed);
      if (waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      } else {
        // No retry-after, wait a bit before trying again
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
}

/**
 * Global rate limiter registry
 */
class RateLimiterRegistry {
  private readonly limiters = new Map<string, RateLimiter>();

  /**
   * Get or create a rate limiter for a specific identifier
   */
  getOrCreate(key: string, options: RateLimiterOptions): RateLimiter {
    let limiter = this.limiters.get(key);
    if (!limiter) {
      limiter = new RateLimiter(options);
      this.limiters.set(key, limiter);
      log.info(`[rate-limiter] Created new limiter: ${key}`);
    }
    return limiter;
  }

  /**
   * Get existing rate limiter
   */
  get(key: string): RateLimiter | undefined {
    return this.limiters.get(key);
  }

  /**
   * Get all registered rate limiters
   */
  getAll(): Map<string, RateLimiter> {
    return new Map(this.limiters);
  }

  /**
   * Get aggregated metrics across all limiters
   */
  getAggregatedMetrics(): {
    totalLimiters: number;
    metrics: RateLimitMetrics;
    byChannel: Record<string, RateLimitMetrics>;
  } {
    const byChannel: Record<string, RateLimitMetrics> = {};
    const aggregated: RateLimitMetrics = {
      totalRequests: 0,
      allowedRequests: 0,
      rejectedRequests: 0,
      circuitRejections: 0,
      circuitStateChanges: 0,
      averageWaitMs: 0,
    };

    for (const [key, limiter] of this.limiters) {
      const metrics = limiter.getMetrics();
      const state = limiter.getState();

      // Aggregate totals
      aggregated.totalRequests += metrics.totalRequests;
      aggregated.allowedRequests += metrics.allowedRequests;
      aggregated.rejectedRequests += metrics.rejectedRequests;
      aggregated.circuitRejections += metrics.circuitRejections;
      aggregated.circuitStateChanges += metrics.circuitStateChanges;

      // By channel
      if (state.channel) {
        if (!byChannel[state.channel]) {
          byChannel[state.channel] = { ...metrics };
        } else {
          const channelMetrics = byChannel[state.channel]!;
          channelMetrics.totalRequests += metrics.totalRequests;
          channelMetrics.allowedRequests += metrics.allowedRequests;
          channelMetrics.rejectedRequests += metrics.rejectedRequests;
          channelMetrics.circuitRejections += metrics.circuitRejections;
          channelMetrics.circuitStateChanges += metrics.circuitStateChanges;
        }
      }
    }

    // Calculate average wait
    if (aggregated.rejectedRequests > 0) {
      const totalWait = Array.from(this.limiters.values()).reduce(
        (sum, limiter) =>
          sum + limiter.getMetrics().averageWaitMs * limiter.getMetrics().rejectedRequests,
        0,
      );
      aggregated.averageWaitMs = totalWait / aggregated.rejectedRequests;
    }

    return {
      totalLimiters: this.limiters.size,
      metrics: aggregated,
      byChannel,
    };
  }

  /**
   * Clear all rate limiters
   */
  clear(): void {
    this.limiters.clear();
  }
}

export const rateLimiterRegistry = new RateLimiterRegistry();

/**
 * Helper to create rate limiter options from common provider patterns
 */
export function createProviderRateLimiterOptions(params: {
  provider: string;
  accountId?: string;
  /** Requests per second */
  requestsPerSecond: number;
  /** Burst size (optional, defaults to requestsPerSecond * 2) */
  burstSize?: number;
  /** Enable circuit breaker (default: true) */
  circuitBreaker?: boolean | CircuitBreakerConfig;
}): RateLimiterOptions {
  const identifier = params.accountId ? `${params.provider}:${params.accountId}` : params.provider;

  return {
    identifier,
    channel: params.provider,
    rateLimit: {
      maxRequests: params.requestsPerSecond,
      windowMs: 1000,
      burstSize: params.burstSize ?? params.requestsPerSecond * 2,
      refillRate: params.requestsPerSecond,
    },
    circuitBreaker:
      params.circuitBreaker === false
        ? undefined
        : typeof params.circuitBreaker === "object"
          ? params.circuitBreaker
          : DEFAULT_CIRCUIT_BREAKER_CONFIG,
  };
}
