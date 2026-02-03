import fs from "node:fs/promises";
import path from "node:path";

import { resolveUserTimezone } from "../agents/date-time.js";
import type { WorkspaceBootstrapFile } from "../agents/workspace.js";
import { parseDurationMs } from "../cli/parse-duration.js";
import { resolveUserPath } from "../utils.js";

export const DEFAULT_SOUL_EVIL_FILENAME = "SOUL_EVIL.md";

export type SoulEvilConfig = {
  /** Alternate SOUL file name (default: SOUL_EVIL.md). */
  file?: string;
  /** Random chance (0-1) to use SOUL_EVIL on any message. */
  chance?: number;
  /** Daily purge window (static time each day). */
  purge?: {
    /** Start time in 24h HH:mm format. */
    at?: string;
    /** Duration (e.g. 30s, 10m, 1h). */
    duration?: string;
  };
};

type SoulEvilDecision = {
  useEvil: boolean;
  reason?: "purge" | "chance";
  fileName: string;
};

type SoulEvilCheckParams = {
  config?: SoulEvilConfig;
  userTimezone?: string;
  now?: Date;
  random?: () => number;
};

type SoulEvilLog = {
  debug?: (message: string) => void;
  warn?: (message: string) => void;
};

export function resolveSoulEvilConfigFromHook(
  entry: Record<string, unknown> | undefined,
  log?: SoulEvilLog,
): SoulEvilConfig | null {
  if (!entry) return null;
  const file = typeof entry.file === "string" ? entry.file : undefined;
  if (entry.file !== undefined && !file) {
    log?.warn?.("soul-evil config: file must be a string");
  }

  let chance: number | undefined;
  if (entry.chance !== undefined) {
    if (typeof entry.chance === "number" && Number.isFinite(entry.chance)) {
      chance = entry.chance;
    } else {
      log?.warn?.("soul-evil config: chance must be a number");
    }
  }

  let purge: SoulEvilConfig["purge"];
  if (entry.purge && typeof entry.purge === "object") {
    const at =
      typeof (entry.purge as { at?: unknown }).at === "string"
        ? (entry.purge as { at?: string }).at
        : undefined;
    const duration =
      typeof (entry.purge as { duration?: unknown }).duration === "string"
        ? (entry.purge as { duration?: string }).duration
        : undefined;
    if ((entry.purge as { at?: unknown }).at !== undefined && !at) {
      log?.warn?.("soul-evil config: purge.at must be a string");
    }
    if ((entry.purge as { duration?: unknown }).duration !== undefined && !duration) {
      log?.warn?.("soul-evil config: purge.duration must be a string");
    }
    purge = { at, duration };
  } else if (entry.purge !== undefined) {
    log?.warn?.("soul-evil config: purge must be an object");
  }

  if (!file && chance === undefined && !purge) return null;
  return { file, chance, purge };
}

function clampChance(value?: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function parsePurgeAt(raw?: string): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const match = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(trimmed);
  if (!match) return null;
  const hour = Number.parseInt(match[1] ?? "", 10);
  const minute = Number.parseInt(match[2] ?? "", 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  return hour * 60 + minute;
}

function timeOfDayMsInTimezone(date: Date, timeZone: string): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(date);
    const map: Record<string, string> = {};
    for (const part of parts) {
      if (part.type !== "literal") map[part.type] = part.value;
    }
    if (!map.hour || !map.minute || !map.second) return null;
    const hour = Number.parseInt(map.hour, 10);
    const minute = Number.parseInt(map.minute, 10);
    const second = Number.parseInt(map.second, 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute) || !Number.isFinite(second)) {
      return null;
    }
    return (hour * 3600 + minute * 60 + second) * 1000 + date.getMilliseconds();
  } catch {
    return null;
  }
}

function isWithinDailyPurgeWindow(params: {
  at?: string;
  duration?: string;
  now: Date;
  timeZone: string;
}): boolean {
  if (!params.at || !params.duration) return false;
  const startMinutes = parsePurgeAt(params.at);
  if (startMinutes === null) return false;

  let durationMs: number;
  try {
    durationMs = parseDurationMs(params.duration, { defaultUnit: "m" });
  } catch {
    return false;
  }
  if (!Number.isFinite(durationMs) || durationMs <= 0) return false;

  const dayMs = 24 * 60 * 60 * 1000;
  if (durationMs >= dayMs) return true;

  const nowMs = timeOfDayMsInTimezone(params.now, params.timeZone);
  if (nowMs === null) return false;

  const startMs = startMinutes * 60 * 1000;
  const endMs = startMs + durationMs;
  if (endMs < dayMs) {
    return nowMs >= startMs && nowMs < endMs;
  }
  const wrappedEnd = endMs % dayMs;
  return nowMs >= startMs || nowMs < wrappedEnd;
}

export function decideSoulEvil(params: SoulEvilCheckParams): SoulEvilDecision {
  const evil = params.config;
  const fileName = evil?.file?.trim() || DEFAULT_SOUL_EVIL_FILENAME;
  if (!evil) {
    return { useEvil: false, fileName };
  }

  const timeZone = resolveUserTimezone(params.userTimezone);
  const now = params.now ?? new Date();
  const inPurge = isWithinDailyPurgeWindow({
    at: evil.purge?.at,
    duration: evil.purge?.duration,
    now,
    timeZone,
  });
  if (inPurge) {
    return { useEvil: true, reason: "purge", fileName };
  }

  const chance = clampChance(evil.chance);
  if (chance > 0) {
    const random = params.random ?? Math.random;
    if (random() < chance) {
      return { useEvil: true, reason: "chance", fileName };
    }
  }

  return { useEvil: false, fileName };
}

/**
 * FIREWALL: Runtime soul swap DISABLED in hardened fork.
 *
 * This function previously allowed hot-swapping the agent's SOUL.md personality
 * during operation based on time windows or random chance. This capability has
 * been disabled for security reasons:
 *
 * 1. Runtime behavioral modification is a security risk when the config layer
 *    is potentially extractable (ZeroLeaks finding: 2/100 security score).
 *
 * 2. An attacker who can read config can predict purge windows and exploit
 *    the alternate persona.
 *
 * 3. To modify agent persona in this hardened fork:
 *    - Edit SOUL.md in the internal behavioral core directory
 *    - Restart the agent process
 *    - Changes are verified against baseline hashes at startup
 *
 * The function signature is preserved for API compatibility, but the swap
 * logic is replaced with a no-op that logs the blocked attempt.
 *
 * @see SOUL_EVIL_ANALYSIS.txt for full security analysis
 * @see Phase 1 Directive (KIMI_DIRECTIVE_FIREWALL_AGENTS.md)
 */
export async function applySoulEvilOverride(params: {
  files: WorkspaceBootstrapFile[];
  workspaceDir: string;
  config?: SoulEvilConfig;
  userTimezone?: string;
  now?: Date;
  random?: () => number;
  log?: SoulEvilLog;
}): Promise<WorkspaceBootstrapFile[]> {
  // FIREWALL: Check if swap would have been triggered (for logging only)
  const decision = decideSoulEvil({
    config: params.config,
    userTimezone: params.userTimezone,
    now: params.now,
    random: params.random,
  });

  // If a swap would have occurred, log it as blocked
  if (decision.useEvil) {
    // Log to console for visibility
    console.warn(
      `[FIREWALL] Soul swap BLOCKED: trigger=${decision.reason ?? "unknown"}, ` +
        `file=${decision.fileName}. Runtime behavioral modification is disabled.`,
    );

    // Log structured security event (async-safe, non-blocking)
    try {
      const { logSecurityEvent, SecurityEventTypes } = await import(
        "../internal/security-logger.js"
      );
      logSecurityEvent({
        type: SecurityEventTypes.SOUL_SWAP_BLOCKED,
        source: "soul-evil-hook",
        blocked: true,
        details: {
          triggerReason: decision.reason,
          targetFile: decision.fileName,
          workspaceDir: params.workspaceDir,
        },
      });
    } catch {
      // Security logger not available - continue without structured logging
    }
  }

  // FIREWALL: Always return original files, never swap
  return params.files;
}
