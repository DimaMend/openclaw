import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MoltbotConfig } from "../../config/config.js";

// Track calls to writeConfigFile
const writeConfigFileMock = vi.fn();
const readConfigFileSnapshotMock = vi.fn();

// Mock the config IO module
vi.mock("../../config/io.js", () => ({
  createConfigIO: vi.fn(() => ({
    readConfigFileSnapshot: readConfigFileSnapshotMock,
    writeConfigFile: writeConfigFileMock,
  })),
}));

// Mock other dependencies
vi.mock("../../agents/agent-scope.js", () => ({
  resolveAgentConfig: vi.fn(() => ({})),
  resolveAgentDir: vi.fn(() => "/tmp/agent"),
  resolveSessionAgentId: vi.fn(() => "main"),
}));

vi.mock("../../agents/sandbox.js", () => ({
  resolveSandboxRuntimeStatus: vi.fn(() => ({ sandboxed: false })),
}));

vi.mock("../../config/sessions.js", () => ({
  updateSessionStore: vi.fn(async () => {}),
}));

vi.mock("../../infra/system-events.js", () => ({
  enqueueSystemEvent: vi.fn(),
}));

vi.mock("../../routing/session-key.js", () => ({
  normalizeAgentId: vi.fn((id: string) => id?.toLowerCase?.() ?? ""),
}));

import { parseInlineDirectives } from "./directive-handling.js";
import { handleDirectiveOnly } from "./directive-handling.impl.js";

function createMockConfig(agents: Array<{ id: string; thinkingDefault?: string }>): MoltbotConfig {
  return {
    agents: {
      defaults: {},
      list: agents,
    },
  } as unknown as MoltbotConfig;
}

function createMockSnapshot(cfg: MoltbotConfig, valid = true) {
  return {
    exists: true,
    valid,
    parsed: cfg,
    config: cfg,
  };
}

describe("thinkingDefault persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persists thinkingDefault when /think <level> is used", async () => {
    const cfg = createMockConfig([{ id: "myagent" }]);
    readConfigFileSnapshotMock.mockResolvedValue(createMockSnapshot(cfg));
    writeConfigFileMock.mockResolvedValue(undefined);

    const directives = parseInlineDirectives("/think high");
    const sessionEntry = { updatedAt: Date.now() };

    await handleDirectiveOnly({
      cfg,
      directives,
      sessionEntry: sessionEntry as any,
      sessionStore: {},
      sessionKey: "agent:myagent:test",
      elevatedEnabled: false,
      elevatedAllowed: false,
      defaultProvider: "anthropic",
      defaultModel: "claude-sonnet-4-20250514",
      aliasIndex: { byAlias: new Map(), byKey: new Map() },
      allowedModelKeys: new Set(),
      allowedModelCatalog: [],
      resetModelOverride: false,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      initialModelLabel: "anthropic/claude-sonnet-4-20250514",
      formatModelSwitchEvent: () => "",
    });

    // Give fire-and-forget time to execute
    await new Promise((r) => setTimeout(r, 50));

    expect(writeConfigFileMock).toHaveBeenCalled();
    const writtenConfig = writeConfigFileMock.mock.calls[0][0];
    expect(writtenConfig.agents.list[0].thinkingDefault).toBe("high");
  });

  it("persists 'off' explicitly instead of deleting the field", async () => {
    const cfg = createMockConfig([{ id: "myagent", thinkingDefault: "high" }]);
    readConfigFileSnapshotMock.mockResolvedValue(createMockSnapshot(cfg));
    writeConfigFileMock.mockResolvedValue(undefined);

    const directives = parseInlineDirectives("/think off");
    const sessionEntry = { updatedAt: Date.now() };

    await handleDirectiveOnly({
      cfg,
      directives,
      sessionEntry: sessionEntry as any,
      sessionStore: {},
      sessionKey: "agent:myagent:test",
      elevatedEnabled: false,
      elevatedAllowed: false,
      defaultProvider: "anthropic",
      defaultModel: "claude-sonnet-4-20250514",
      aliasIndex: { byAlias: new Map(), byKey: new Map() },
      allowedModelKeys: new Set(),
      allowedModelCatalog: [],
      resetModelOverride: false,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      initialModelLabel: "anthropic/claude-sonnet-4-20250514",
      formatModelSwitchEvent: () => "",
    });

    await new Promise((r) => setTimeout(r, 50));

    expect(writeConfigFileMock).toHaveBeenCalled();
    const writtenConfig = writeConfigFileMock.mock.calls[0][0];
    // Should explicitly set "off", not delete the field
    expect(writtenConfig.agents.list[0].thinkingDefault).toBe("off");
  });

  it("skips write if thinkingDefault is already set to the same value", async () => {
    const cfg = createMockConfig([{ id: "myagent", thinkingDefault: "high" }]);
    readConfigFileSnapshotMock.mockResolvedValue(createMockSnapshot(cfg));
    writeConfigFileMock.mockResolvedValue(undefined);

    const directives = parseInlineDirectives("/think high");
    const sessionEntry = { updatedAt: Date.now() };

    await handleDirectiveOnly({
      cfg,
      directives,
      sessionEntry: sessionEntry as any,
      sessionStore: {},
      sessionKey: "agent:myagent:test",
      elevatedEnabled: false,
      elevatedAllowed: false,
      defaultProvider: "anthropic",
      defaultModel: "claude-sonnet-4-20250514",
      aliasIndex: { byAlias: new Map(), byKey: new Map() },
      allowedModelKeys: new Set(),
      allowedModelCatalog: [],
      resetModelOverride: false,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      initialModelLabel: "anthropic/claude-sonnet-4-20250514",
      formatModelSwitchEvent: () => "",
    });

    await new Promise((r) => setTimeout(r, 50));

    // Should not write if value is the same
    expect(writeConfigFileMock).not.toHaveBeenCalled();
  });

  it("does not persist when agent is not found in config", async () => {
    const cfg = createMockConfig([{ id: "otheragent" }]);
    readConfigFileSnapshotMock.mockResolvedValue(createMockSnapshot(cfg));
    writeConfigFileMock.mockResolvedValue(undefined);

    const directives = parseInlineDirectives("/think high");
    const sessionEntry = { updatedAt: Date.now() };

    await handleDirectiveOnly({
      cfg,
      directives,
      sessionEntry: sessionEntry as any,
      sessionStore: {},
      sessionKey: "agent:myagent:test",
      elevatedEnabled: false,
      elevatedAllowed: false,
      defaultProvider: "anthropic",
      defaultModel: "claude-sonnet-4-20250514",
      aliasIndex: { byAlias: new Map(), byKey: new Map() },
      allowedModelKeys: new Set(),
      allowedModelCatalog: [],
      resetModelOverride: false,
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      initialModelLabel: "anthropic/claude-sonnet-4-20250514",
      formatModelSwitchEvent: () => "",
    });

    await new Promise((r) => setTimeout(r, 50));

    // Agent not found, should not write
    expect(writeConfigFileMock).not.toHaveBeenCalled();
  });

  it("logs warning on write failure but does not throw", async () => {
    const cfg = createMockConfig([{ id: "myagent" }]);
    readConfigFileSnapshotMock.mockResolvedValue(createMockSnapshot(cfg));
    writeConfigFileMock.mockRejectedValue(new Error("Write failed"));

    const consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const directives = parseInlineDirectives("/think high");
    const sessionEntry = { updatedAt: Date.now() };

    // Should not throw
    await expect(
      handleDirectiveOnly({
        cfg,
        directives,
        sessionEntry: sessionEntry as any,
        sessionStore: {},
        sessionKey: "agent:myagent:test",
        elevatedEnabled: false,
        elevatedAllowed: false,
        defaultProvider: "anthropic",
        defaultModel: "claude-sonnet-4-20250514",
        aliasIndex: { byAlias: new Map(), byKey: new Map() },
        allowedModelKeys: new Set(),
        allowedModelCatalog: [],
        resetModelOverride: false,
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        initialModelLabel: "anthropic/claude-sonnet-4-20250514",
        formatModelSwitchEvent: () => "",
      }),
    ).resolves.not.toThrow();

    await new Promise((r) => setTimeout(r, 50));

    expect(consoleWarnSpy).toHaveBeenCalledWith(
      expect.stringContaining("Failed to persist thinkingDefault"),
      expect.any(String),
    );

    consoleWarnSpy.mockRestore();
  });
});
