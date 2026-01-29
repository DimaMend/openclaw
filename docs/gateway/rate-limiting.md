---
title: "Rate Limiting & Circuit Breakers"
summary: "Enhanced rate limiting system with circuit breaker pattern for reliable messaging across all channels"
read_when:
  - Experiencing rate limit errors from messaging providers
  - Setting up high-volume bot deployments
  - Monitoring channel health and throughput
  - Optimizing message delivery performance
---

# Rate Limiting & Circuit Breakers

Moltbot includes an intelligent rate limiting system that prevents rate limit errors **proactively** while maintaining high throughput across all messaging channels.

## Overview

The rate limiting system provides:

- **Sliding Window Algorithm** with token bucket pattern for smooth rate limiting
- **Circuit Breaker Pattern** for fault tolerance and graceful degradation
- **Per-channel, Per-account Isolation** to prevent one channel from affecting others
- **Comprehensive Metrics** for monitoring and debugging
- **Adaptive Backoff** that learns from provider responses

## How It Works

### Sliding Window + Token Bucket

The system combines two proven algorithms:

1. **Token Bucket**: Allows bursts up to a configured size, then refills tokens at a steady rate
2. **Sliding Window**: Tracks requests over time to enforce hard limits per time window

This hybrid approach provides both **burst handling** (for quick replies) and **sustained throughput** (for long conversations).

```typescript
// Example: 10 requests per second with burst of 20
{
  maxRequests: 10,
  windowMs: 1000,
  burstSize: 20,
  refillRate: 10
}
```

### Circuit Breaker Pattern

When a channel experiences repeated failures (network errors, API errors, etc.), the circuit breaker:

1. **Opens** after N failures → reject new requests immediately
2. **Half-opens** after timeout → test with limited requests
3. **Closes** after successes → resume normal operation

This prevents cascading failures and gives providers time to recover.

## Configuration

### Per-Channel Rate Limits

Rate limits are configured per channel in `config.yaml`:

```yaml
channels:
  discord:
    accounts:
      default:
        rateLimit:
          # Global account limit
          global:
            requestsPerSecond: 50
            burstSize: 100
          # DM-specific limits
          dm:
            requestsPerSecond: 5
            burstSize: 10
          # Guild-specific limits
          guild:
            requestsPerSecond: 1
            burstSize: 10
        circuitBreaker:
          failureThreshold: 5
          resetTimeoutMs: 30000
          successThreshold: 2

  telegram:
    accounts:
      default:
        rateLimit:
          global:
            requestsPerSecond: 30
            burstSize: 60
          chat:
            requestsPerSecond: 1
            burstSize: 3
          dm:
            requestsPerSecond: 1
            burstSize: 10
        circuitBreaker:
          failureThreshold: 3
          resetTimeoutMs: 30000
          successThreshold: 2
```

### Global Defaults

If not configured, channels use sensible defaults based on provider documentation:

| Provider | Global RPS | Burst | Circuit Breaker |
|----------|-----------|-------|-----------------|
| Discord  | 50        | 100   | Yes (5/30s/2)   |
| Telegram | 30        | 60    | Yes (3/30s/2)   |
| Slack    | 1         | 5     | Yes (5/30s/2)   |
| WhatsApp | 20        | 40    | Yes (3/30s/2)   |

## Usage

### Automatic (Recommended)

Rate limiting is **automatic** for all channel providers. No code changes needed.

```typescript
// Sends respect rate limits automatically
await sendMessageDiscord("channel:123", "Hello!");
await sendMessageTelegram("123456", "Hi there!");
```

### Manual Integration

For custom integrations, use the rate limiter directly:

```typescript
import { RateLimiter, createProviderRateLimiterOptions } from "moltbot/infra/rate-limiter";

const limiter = new RateLimiter(
  createProviderRateLimiterOptions({
    provider: "custom",
    accountId: "my-bot",
    requestsPerSecond: 10,
    burstSize: 20,
  })
);

// Try to acquire permission
const result = limiter.tryAcquire();
if (!result.allowed) {
  console.log(`Rate limited. Retry after ${result.retryAfter}ms`);
  return;
}

// Make API call
try {
  await myApiCall();
  limiter.recordSuccess();
} catch (err) {
  limiter.recordFailure();
  throw err;
}
```

### Wait-based Approach

For less time-sensitive operations, use `waitAndAcquire`:

```typescript
// Automatically waits for rate limit to clear (up to 30s)
const acquired = await limiter.waitAndAcquire(30_000);
if (acquired) {
  await myApiCall();
} else {
  throw new Error("Rate limit timeout");
}
```

## Monitoring

### CLI Status Command

Check rate limiting status across all channels:

```bash
moltbot channels status --rate-limits
```

Output:
```
Rate Limiting Status
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Discord (default)
  Global:        45/50 available (circuit: closed)
  Guild #123:    8/10 available (circuit: closed)
  DM @user456:   4/5 available (circuit: closed)

Telegram (default)
  Global:        28/30 available (circuit: closed)
  Chat -100...:  0/1 available (circuit: open ⚠️)
    └─ Retry in: 850ms

Overall Stats:
  Total Requests:  1,247
  Allowed:         1,198 (96%)
  Rejected:        49 (4%)
  Circuit Blocks:  12 (1%)
  Avg Wait:        420ms
```

### Programmatic Access

```typescript
import { rateLimiterRegistry } from "moltbot/infra/rate-limiter";

// Get aggregated metrics
const metrics = rateLimiterRegistry.getAggregatedMetrics();
console.log(`Total limiters: ${metrics.totalLimiters}`);
console.log(`Success rate: ${metrics.metrics.allowedRequests / metrics.metrics.totalRequests}`);

// Get specific limiter
const limiter = rateLimiterRegistry.get("discord:default:global");
const state = limiter?.getState();
console.log(`Tokens: ${state.limiter.tokens}`);
console.log(`Circuit: ${state.circuit?.state}`);
```

### Logging

Enable verbose rate limiting logs:

```yaml
logging:
  subsystems:
    "rate-limiter": "debug"
    "discord/rate-limited": "debug"
    "telegram/rate-limited": "debug"
```

## Best Practices

### 1. Configure Based on Your Usage

High-volume bots should tune rate limits:

```yaml
channels:
  discord:
    accounts:
      high-volume:
        rateLimit:
          global:
            requestsPerSecond: 40  # Leave headroom
            burstSize: 80
```

### 2. Monitor Circuit Breaker State

Circuit breakers opening frequently indicate:
- Provider issues (outages, degraded performance)
- Network problems
- Misconfigured rate limits (too aggressive)

### 3. Use DM-Specific Limits

DMs often have different limits than group chats:

```yaml
channels:
  telegram:
    accounts:
      default:
        rateLimit:
          dm:
            requestsPerSecond: 1
            burstSize: 15  # Higher burst for DMs
```

### 4. Tune Circuit Breaker Thresholds

For flaky networks:
```yaml
circuitBreaker:
  failureThreshold: 10  # More tolerant
  resetTimeoutMs: 60000  # Longer recovery
```

For critical services:
```yaml
circuitBreaker:
  failureThreshold: 3  # Fail fast
  resetTimeoutMs: 15000  # Quick recovery
```

## Troubleshooting

### "Circuit breaker is open" Errors

**Cause**: Too many consecutive failures

**Solution**:
1. Check channel status: `moltbot channels status --probe`
2. Review logs for underlying errors
3. Wait for auto-recovery or manually reset
4. Increase `failureThreshold` if network is flaky

### High Rejection Rate

**Cause**: Traffic exceeds configured limits

**Solution**:
1. Increase `requestsPerSecond` if provider allows
2. Increase `burstSize` for temporary spikes
3. Implement message queuing in your application
4. Consider multiple bot accounts for load distribution

### Metrics Show Zero Requests

**Cause**: Rate limiter not initialized for channel

**Solution**:
1. Verify channel is active: `moltbot channels status`
2. Send a test message to initialize limiter
3. Check configuration syntax in `config.yaml`

## API Reference

### `RateLimiter`

```typescript
class RateLimiter {
  constructor(options: RateLimiterOptions);
  
  // Try to acquire permission (non-blocking)
  tryAcquire(): RateLimitResult;
  
  // Wait for permission (blocking with timeout)
  waitAndAcquire(maxWaitMs?: number): Promise<boolean>;
  
  // Record operation result for circuit breaker
  recordSuccess(): void;
  recordFailure(): void;
  
  // Introspection
  getState(): RateLimiterState;
  getMetrics(): RateLimitMetrics;
}
```

### `rateLimiterRegistry`

```typescript
// Global registry of all rate limiters
const rateLimiterRegistry: {
  getOrCreate(key: string, options: RateLimiterOptions): RateLimiter;
  get(key: string): RateLimiter | undefined;
  getAll(): Map<string, RateLimiter>;
  getAggregatedMetrics(): AggregatedMetrics;
  clear(): void;
}
```

### Helper Functions

```typescript
// Create standard provider rate limiter options
function createProviderRateLimiterOptions(params: {
  provider: string;
  accountId?: string;
  requestsPerSecond: number;
  burstSize?: number;
  circuitBreaker?: boolean | CircuitBreakerConfig;
}): RateLimiterOptions;
```

## Related

- [Channel Configuration](/channels)
- [Retry & Error Handling](/gateway/error-handling)
- [Performance Tuning](/gateway/performance)
- [Monitoring & Metrics](/diagnostics/metrics)
