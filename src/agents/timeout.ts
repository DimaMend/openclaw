import type { OpenClawConfig } from "../config/config.js";

const DEFAULT_AGENT_TIMEOUT_SECONDS = 600;

const normalizeNumber = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isFinite(value) ? Math.floor(value) : undefined;

export function resolveAgentTimeoutSeconds(cfg?: OpenClawConfig): number {
  const raw = normalizeNumber(cfg?.agents?.defaults?.timeoutSeconds);
  const seconds = raw ?? DEFAULT_AGENT_TIMEOUT_SECONDS;
  return Math.max(seconds, 1);
}

export function resolveAgentTimeoutMs(opts: {
  cfg?: OpenClawConfig;
  overrideMs?: number | null;
  overrideSeconds?: number | null;
  minMs?: number;
}): number {
  const minMs = Math.max(normalizeNumber(opts.minMs) ?? 1, 1);
  const defaultMs = resolveAgentTimeoutSeconds(opts.cfg) * 1000;
  // Use max safe timeout value for Node.js setTimeout (~24.8 days) to represent
  // "no timeout" when explicitly set to 0. Node's setTimeout uses 32-bit signed
  // int which maxes at 2^31-1 ms. Values above that wrap to 1ms, causing immediate timeout.
  const NO_TIMEOUT_MS = 2147483647;
  const overrideMs = normalizeNumber(opts.overrideMs);
  if (overrideMs !== undefined) {
    if (overrideMs === 0) {
      return NO_TIMEOUT_MS;
    }
    if (overrideMs < 0) {
      return defaultMs;
    }
    // Cap at NO_TIMEOUT_MS to avoid 32-bit signed int overflow in setTimeout
    return Math.min(Math.max(overrideMs, minMs), NO_TIMEOUT_MS);
  }
  const overrideSeconds = normalizeNumber(opts.overrideSeconds);
  if (overrideSeconds !== undefined) {
    if (overrideSeconds === 0) {
      return NO_TIMEOUT_MS;
    }
    if (overrideSeconds < 0) {
      return defaultMs;
    }
    // Cap at NO_TIMEOUT_MS to avoid 32-bit signed int overflow in setTimeout
    return Math.min(Math.max(overrideSeconds * 1000, minMs), NO_TIMEOUT_MS);
  }
  return Math.max(defaultMs, minMs);
}
