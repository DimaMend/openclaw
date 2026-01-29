import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

import {
  RateLimiter,
  createProviderRateLimiterOptions,
  rateLimiterRegistry,
  type CircuitState,
} from "./rate-limiter.js";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    rateLimiterRegistry.clear();
  });

  describe("Sliding Window Algorithm", () => {
    it("allows requests within rate limit", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 5,
          windowMs: 1000,
        },
      });

      for (let i = 0; i < 5; i++) {
        const result = limiter.tryAcquire();
        expect(result.allowed).toBe(true);
        expect(result.remaining).toBeGreaterThanOrEqual(0);
      }

      const metrics = limiter.getMetrics();
      expect(metrics.allowedRequests).toBe(5);
      expect(metrics.rejectedRequests).toBe(0);
    });

    it("rejects requests exceeding rate limit", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 3,
          windowMs: 1000,
        },
      });

      // Fill up the limit
      for (let i = 0; i < 3; i++) {
        limiter.tryAcquire();
      }

      // Should be rejected
      const result = limiter.tryAcquire();
      expect(result.allowed).toBe(false);
      expect(result.retryAfter).toBeGreaterThan(0);
      expect(result.reason).toBe("Rate limit exceeded");

      const metrics = limiter.getMetrics();
      expect(metrics.allowedRequests).toBe(3);
      expect(metrics.rejectedRequests).toBe(1);
    });

    it("allows requests after window expires", async () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 2,
          windowMs: 1000,
        },
      });

      // Fill limit
      limiter.tryAcquire();
      limiter.tryAcquire();

      // Should be rejected
      expect(limiter.tryAcquire().allowed).toBe(false);

      // Advance time past window
      vi.advanceTimersByTime(1100);

      // Should be allowed now
      const result = limiter.tryAcquire();
      expect(result.allowed).toBe(true);
    });
  });

  describe("Token Bucket Pattern", () => {
    it("allows burst requests up to burst size", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 5,
          windowMs: 1000,
          burstSize: 10,
          refillRate: 5,
        },
      });

      // Should allow burst
      for (let i = 0; i < 10; i++) {
        const result = limiter.tryAcquire();
        expect(result.allowed).toBe(true);
      }

      // Exceeded burst
      const result = limiter.tryAcquire();
      expect(result.allowed).toBe(false);
    });

    it("refills tokens over time", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 5,
          windowMs: 1000,
          burstSize: 5,
          refillRate: 5, // 5 tokens per second
        },
      });

      // Use all tokens
      for (let i = 0; i < 5; i++) {
        limiter.tryAcquire();
      }

      // Should be rejected
      expect(limiter.tryAcquire().allowed).toBe(false);

      // Advance 200ms (1 token should refill)
      vi.advanceTimersByTime(200);

      // Should allow 1 request
      expect(limiter.tryAcquire().allowed).toBe(true);
    });

    it("caps tokens at burst size", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 5,
          windowMs: 1000,
          burstSize: 5,
          refillRate: 5,
        },
      });

      // Wait long enough to refill multiple times
      vi.advanceTimersByTime(10_000);

      // Should not have more than burst size
      for (let i = 0; i < 5; i++) {
        expect(limiter.tryAcquire().allowed).toBe(true);
      }
      expect(limiter.tryAcquire().allowed).toBe(false);
    });
  });

  describe("Circuit Breaker", () => {
    it("opens circuit after failure threshold", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 100, windowMs: 1000 },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          successThreshold: 2,
        },
      });

      // Record failures
      for (let i = 0; i < 3; i++) {
        limiter.tryAcquire();
        limiter.recordFailure();
      }

      // Circuit should be open
      const result = limiter.tryAcquire();
      expect(result.allowed).toBe(false);
      expect(result.circuitState).toBe("open");
      expect(result.reason).toBe("Circuit breaker is open");

      const metrics = limiter.getMetrics();
      expect(metrics.circuitRejections).toBeGreaterThan(0);
    });

    it("transitions to half-open after reset timeout", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 100, windowMs: 1000 },
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 5000,
          successThreshold: 2,
        },
      });

      // Open circuit
      limiter.tryAcquire();
      limiter.recordFailure();
      limiter.tryAcquire();
      limiter.recordFailure();

      expect(limiter.tryAcquire().circuitState).toBe("open");

      // Wait for reset timeout
      vi.advanceTimersByTime(5100);

      // Should transition to half-open
      const result = limiter.tryAcquire();
      expect(result.allowed).toBe(true);
      expect(result.circuitState).toBe("half_open");
    });

    it("closes circuit after success threshold in half-open", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 100, windowMs: 1000 },
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 5000,
          successThreshold: 2,
        },
      });

      // Open circuit
      limiter.tryAcquire();
      limiter.recordFailure();
      limiter.tryAcquire();
      limiter.recordFailure();

      // Wait and transition to half-open
      vi.advanceTimersByTime(5100);
      limiter.tryAcquire();

      // Record successes
      limiter.recordSuccess();
      limiter.recordSuccess();

      // Should be closed now
      const result = limiter.tryAcquire();
      expect(result.circuitState).toBe("closed");
    });

    it("reopens circuit on failure in half-open state", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 100, windowMs: 1000 },
        circuitBreaker: {
          failureThreshold: 2,
          resetTimeoutMs: 5000,
          successThreshold: 2,
        },
      });

      // Open circuit
      limiter.tryAcquire();
      limiter.recordFailure();
      limiter.tryAcquire();
      limiter.recordFailure();

      // Transition to half-open
      vi.advanceTimersByTime(5100);
      limiter.tryAcquire();

      // Record failure in half-open
      limiter.recordFailure();

      // Should be open again
      const result = limiter.tryAcquire();
      expect(result.circuitState).toBe("open");
    });

    it("works without circuit breaker", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 5, windowMs: 1000 },
      });

      const result = limiter.tryAcquire();
      expect(result.circuitState).toBe("closed");
      expect(result.allowed).toBe(true);

      // Should not affect behavior
      limiter.recordFailure();
      limiter.recordFailure();
      limiter.recordFailure();

      expect(limiter.tryAcquire().allowed).toBe(true);
    });
  });

  describe("waitAndAcquire", () => {
    it("waits and acquires when rate limit opens", async () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 1,
          windowMs: 1000,
        },
      });

      // Fill limit
      limiter.tryAcquire();

      // Start waiting
      const promise = limiter.waitAndAcquire(5000);

      // Advance time to allow request
      vi.advanceTimersByTime(1100);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("times out if max wait exceeded", async () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: {
          maxRequests: 1,
          windowMs: 10_000, // Very long window
        },
      });

      // Fill limit
      limiter.tryAcquire();

      // Start waiting with short timeout
      const promise = limiter.waitAndAcquire(500);

      vi.advanceTimersByTime(600);

      const result = await promise;
      expect(result).toBe(false);
    });
  });

  describe("Metrics", () => {
    it("tracks request metrics accurately", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 3, windowMs: 1000 },
      });

      // Allowed requests
      limiter.tryAcquire();
      limiter.tryAcquire();
      limiter.tryAcquire();

      // Rejected requests
      limiter.tryAcquire();
      limiter.tryAcquire();

      const metrics = limiter.getMetrics();
      expect(metrics.totalRequests).toBe(5);
      expect(metrics.allowedRequests).toBe(3);
      expect(metrics.rejectedRequests).toBe(2);
      expect(metrics.averageWaitMs).toBeGreaterThan(0);
    });

    it("calculates average wait time", () => {
      const limiter = new RateLimiter({
        identifier: "test",
        rateLimit: { maxRequests: 1, windowMs: 1000 },
      });

      limiter.tryAcquire();

      // Rejected with retry-after
      const result1 = limiter.tryAcquire();
      expect(result1.retryAfter).toBeDefined();

      const metrics = limiter.getMetrics();
      expect(metrics.averageWaitMs).toBeGreaterThan(0);
      expect(metrics.averageWaitMs).toBeLessThanOrEqual(1000);
    });
  });

  describe("State inspection", () => {
    it("provides detailed state information", () => {
      const limiter = new RateLimiter({
        identifier: "test-limiter",
        channel: "discord",
        rateLimit: { maxRequests: 5, windowMs: 1000 },
        circuitBreaker: {
          failureThreshold: 3,
          resetTimeoutMs: 5000,
          successThreshold: 2,
        },
      });

      limiter.tryAcquire();
      limiter.tryAcquire();

      const state = limiter.getState();
      expect(state.identifier).toBe("test-limiter");
      expect(state.channel).toBe("discord");
      expect(state.limiter.requests).toBe(2);
      expect(state.limiter.maxRequests).toBe(5);
      expect(state.circuit).toBeDefined();
      expect(state.circuit?.state).toBe("closed");
      expect(state.metrics).toBeDefined();
    });
  });
});

describe("RateLimiterRegistry", () => {
  afterEach(() => {
    rateLimiterRegistry.clear();
  });

  it("creates and retrieves limiters by key", () => {
    const options = {
      identifier: "discord:123",
      rateLimit: { maxRequests: 5, windowMs: 1000 },
    };

    const limiter1 = rateLimiterRegistry.getOrCreate("discord:123", options);
    const limiter2 = rateLimiterRegistry.getOrCreate("discord:123", options);

    expect(limiter1).toBe(limiter2); // Same instance
  });

  it("tracks multiple limiters", () => {
    rateLimiterRegistry.getOrCreate("discord:123", {
      identifier: "discord:123",
      rateLimit: { maxRequests: 5, windowMs: 1000 },
    });

    rateLimiterRegistry.getOrCreate("telegram:456", {
      identifier: "telegram:456",
      rateLimit: { maxRequests: 10, windowMs: 1000 },
    });

    const all = rateLimiterRegistry.getAll();
    expect(all.size).toBe(2);
    expect(all.has("discord:123")).toBe(true);
    expect(all.has("telegram:456")).toBe(true);
  });

  it("aggregates metrics across all limiters", () => {
    const limiter1 = rateLimiterRegistry.getOrCreate("discord:123", {
      identifier: "discord:123",
      channel: "discord",
      rateLimit: { maxRequests: 5, windowMs: 1000 },
    });

    const limiter2 = rateLimiterRegistry.getOrCreate("telegram:456", {
      identifier: "telegram:456",
      channel: "telegram",
      rateLimit: { maxRequests: 10, windowMs: 1000 },
    });

    limiter1.tryAcquire();
    limiter1.tryAcquire();
    limiter2.tryAcquire();

    const aggregated = rateLimiterRegistry.getAggregatedMetrics();
    expect(aggregated.totalLimiters).toBe(2);
    expect(aggregated.metrics.totalRequests).toBe(3);
    expect(aggregated.metrics.allowedRequests).toBe(3);
    expect(aggregated.byChannel.discord).toBeDefined();
    expect(aggregated.byChannel.telegram).toBeDefined();
  });

  it("clears all limiters", () => {
    rateLimiterRegistry.getOrCreate("test", {
      identifier: "test",
      rateLimit: { maxRequests: 5, windowMs: 1000 },
    });

    rateLimiterRegistry.clear();

    expect(rateLimiterRegistry.getAll().size).toBe(0);
  });
});

describe("createProviderRateLimiterOptions", () => {
  it("creates options with defaults", () => {
    const options = createProviderRateLimiterOptions({
      provider: "discord",
      requestsPerSecond: 10,
    });

    expect(options.identifier).toBe("discord");
    expect(options.channel).toBe("discord");
    expect(options.rateLimit.maxRequests).toBe(10);
    expect(options.rateLimit.windowMs).toBe(1000);
    expect(options.rateLimit.burstSize).toBe(20); // Default: 2x
    expect(options.circuitBreaker).toBeDefined();
  });

  it("includes account ID in identifier", () => {
    const options = createProviderRateLimiterOptions({
      provider: "telegram",
      accountId: "user123",
      requestsPerSecond: 5,
    });

    expect(options.identifier).toBe("telegram:user123");
  });

  it("allows custom burst size", () => {
    const options = createProviderRateLimiterOptions({
      provider: "whatsapp",
      requestsPerSecond: 10,
      burstSize: 50,
    });

    expect(options.rateLimit.burstSize).toBe(50);
  });

  it("can disable circuit breaker", () => {
    const options = createProviderRateLimiterOptions({
      provider: "slack",
      requestsPerSecond: 5,
      circuitBreaker: false,
    });

    expect(options.circuitBreaker).toBeUndefined();
  });

  it("accepts custom circuit breaker config", () => {
    const options = createProviderRateLimiterOptions({
      provider: "signal",
      requestsPerSecond: 5,
      circuitBreaker: {
        failureThreshold: 10,
        resetTimeoutMs: 60_000,
        successThreshold: 3,
      },
    });

    expect(options.circuitBreaker).toEqual({
      failureThreshold: 10,
      resetTimeoutMs: 60_000,
      successThreshold: 3,
    });
  });
});
