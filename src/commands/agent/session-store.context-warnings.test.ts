import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { ClawdbotConfig } from "../../config/config.js";
import type { SessionEntry } from "../../config/sessions.js";
import { updateSessionStoreAfterAgentRun } from "./session-store.js";

describe("session-store context warnings integration", () => {
  let tmpDir: string;
  let storePath: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "session-store-test-"));
    storePath = join(tmpDir, "sessions.json");
    await writeFile(storePath, "{}");
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  const baseCfg = {} as ClawdbotConfig;
  const baseResult = {
    payloads: [],
    meta: {
      agentMeta: {
        usage: { input: 7500, output: 100 },
        model: "test-model",
        provider: "openai",
      },
    },
  };

  it("returns soft warning when crossing 75% threshold", async () => {
    const sessionStore: Record<string, SessionEntry> = {};

    const result = await updateSessionStoreAfterAgentRun({
      cfg: baseCfg,
      sessionId: "test-session",
      sessionKey: "test-key",
      storePath,
      sessionStore,
      defaultProvider: "openai",
      defaultModel: "test-model",
      contextTokensOverride: 10000,
      result: baseResult as any,
    });

    expect(result.contextWarning.level).toBe("soft");
    expect(result.contextWarning.message).toContain("75%");
    expect(result.contextWarning.message).toContain("/compact");
  });

  it("returns urgent warning when crossing 90% threshold", async () => {
    const sessionStore: Record<string, SessionEntry> = {};
    const urgentResult = {
      ...baseResult,
      meta: {
        agentMeta: {
          usage: { input: 9200, output: 100 },
          model: "test-model",
          provider: "openai",
        },
      },
    };

    const result = await updateSessionStoreAfterAgentRun({
      cfg: baseCfg,
      sessionId: "test-session",
      sessionKey: "test-key",
      storePath,
      sessionStore,
      defaultProvider: "openai",
      defaultModel: "test-model",
      contextTokensOverride: 10000,
      result: urgentResult as any,
    });

    expect(result.contextWarning.level).toBe("urgent");
    expect(result.contextWarning.message).toContain("92%");
    expect(result.contextWarning.message).toContain("auto-compact");
  });

  it("does not repeat warning at same level", async () => {
    const sessionStore: Record<string, SessionEntry> = {
      "test-key": {
        sessionId: "test-session",
        updatedAt: Date.now(),
        contextWarningLevel: "soft",
      },
    };

    const result = await updateSessionStoreAfterAgentRun({
      cfg: baseCfg,
      sessionId: "test-session",
      sessionKey: "test-key",
      storePath,
      sessionStore,
      defaultProvider: "openai",
      defaultModel: "test-model",
      contextTokensOverride: 10000,
      result: baseResult as any,
    });

    expect(result.contextWarning.level).toBe("soft");
    expect(result.contextWarning.message).toBeNull(); // No repeat
  });

  it("escalates from soft to urgent with new message", async () => {
    const sessionStore: Record<string, SessionEntry> = {
      "test-key": {
        sessionId: "test-session",
        updatedAt: Date.now(),
        contextWarningLevel: "soft",
      },
    };
    const urgentResult = {
      ...baseResult,
      meta: {
        agentMeta: {
          usage: { input: 9500, output: 100 },
          model: "test-model",
          provider: "openai",
        },
      },
    };

    const result = await updateSessionStoreAfterAgentRun({
      cfg: baseCfg,
      sessionId: "test-session",
      sessionKey: "test-key",
      storePath,
      sessionStore,
      defaultProvider: "openai",
      defaultModel: "test-model",
      contextTokensOverride: 10000,
      result: urgentResult as any,
    });

    expect(result.contextWarning.level).toBe("urgent");
    expect(result.contextWarning.message).not.toBeNull();
  });

  it("persists warning level to session store", async () => {
    const sessionStore: Record<string, SessionEntry> = {};

    await updateSessionStoreAfterAgentRun({
      cfg: baseCfg,
      sessionId: "test-session",
      sessionKey: "test-key",
      storePath,
      sessionStore,
      defaultProvider: "openai",
      defaultModel: "test-model",
      contextTokensOverride: 10000,
      result: baseResult as any,
    });

    expect(sessionStore["test-key"]?.contextWarningLevel).toBe("soft");
  });
});
