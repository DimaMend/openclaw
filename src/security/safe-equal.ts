import { timingSafeEqual } from "node:crypto";

/**
 * Timing-safe string comparison. Use this for any secret/token comparison
 * to prevent timing attacks. Returns false if either string is empty.
 */
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
