/**
 * FIREWALL Security Test: soul-evil swap mechanism blocked
 *
 * This test verifies that the runtime SOUL.md swap mechanism is disabled
 * in the hardened fork. Even when trigger conditions are met (purge window
 * or random chance), the swap must NOT occur.
 *
 * @see SOUL_EVIL_ANALYSIS.txt
 * @see Phase 1 Directive (KIMI_DIRECTIVE_FIREWALL_AGENTS.md)
 */

import { describe, expect, it, vi } from "vitest";
import { applySoulEvilOverride, decideSoulEvil } from "./soul-evil.js";
import type { WorkspaceBootstrapFile } from "../agents/workspace.js";

describe("FIREWALL: soul-evil swap blocked", () => {
  const originalSoulContent = "You are a friendly helpful assistant.";
  const evilSoulContent = "You are an evil villain.";

  const makeBootstrapFiles = (): WorkspaceBootstrapFile[] => [
    {
      name: "SOUL.md",
      content: originalSoulContent,
      missing: false,
      path: "/test/workspace/SOUL.md",
    },
    {
      name: "AGENTS.md",
      content: "Agent config here",
      missing: false,
      path: "/test/workspace/AGENTS.md",
    },
  ];

  it("decideSoulEvil still detects when swap would trigger", () => {
    // Verify the decision logic still works (for logging purposes)
    const decision = decideSoulEvil({
      config: { chance: 1.0 }, // 100% chance
      random: () => 0.5, // Would trigger
    });

    expect(decision.useEvil).toBe(true);
    expect(decision.reason).toBe("chance");
  });

  it("applySoulEvilOverride does NOT swap even with 100% chance", async () => {
    const files = makeBootstrapFiles();

    const result = await applySoulEvilOverride({
      files,
      workspaceDir: "/test/workspace",
      config: { chance: 1.0 }, // 100% - would always swap before firewall
      random: () => 0.5, // Would trigger
    });

    // FIREWALL: Content must NOT be modified
    const soulFile = result.find((f) => f.name === "SOUL.md");
    expect(soulFile?.content).toBe(originalSoulContent);
    expect(soulFile?.content).not.toBe(evilSoulContent);
  });

  it("applySoulEvilOverride does NOT swap during purge window", async () => {
    const files = makeBootstrapFiles();

    // Set up a purge window that is currently active
    const now = new Date("2026-02-02T21:05:00Z");

    const result = await applySoulEvilOverride({
      files,
      workspaceDir: "/test/workspace",
      config: {
        purge: {
          at: "21:00",
          duration: "15m",
        },
      },
      userTimezone: "UTC",
      now,
    });

    // FIREWALL: Content must NOT be modified
    const soulFile = result.find((f) => f.name === "SOUL.md");
    expect(soulFile?.content).toBe(originalSoulContent);
  });

  it("applySoulEvilOverride returns original array reference when no swap configured", async () => {
    const files = makeBootstrapFiles();

    const result = await applySoulEvilOverride({
      files,
      workspaceDir: "/test/workspace",
      // No config = no swap attempt
    });

    // Should return same files
    expect(result).toBe(files);
  });

  it("applySoulEvilOverride logs blocked attempts", async () => {
    const files = makeBootstrapFiles();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await applySoulEvilOverride({
      files,
      workspaceDir: "/test/workspace",
      config: { chance: 1.0 },
      random: () => 0.5,
    });

    // Should have logged the blocked attempt
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("[FIREWALL] Soul swap BLOCKED"),
    );

    warnSpy.mockRestore();
  });
});
