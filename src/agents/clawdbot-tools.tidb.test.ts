import { describe, expect, it } from "vitest";

import type { ClawdbotConfig } from "../config/config.js";
import { createClawdbotTools } from "./clawdbot-tools.js";

describe("createClawdbotTools (tidb)", () => {
  it("omits tidb tool when disabled", () => {
    const cfg: ClawdbotConfig = {
      tools: {
        tidb: {
          enabled: false,
          url: "tidb://user:pass@example.com/mydb",
        },
      },
    };
    const tools = createClawdbotTools({ config: cfg });
    expect(tools.some((tool) => tool.name === "tidb")).toBe(false);
  });

  it("adds tidb tool when enabled + configured", () => {
    const cfg: ClawdbotConfig = {
      tools: {
        tidb: {
          enabled: true,
          url: "tidb://user:pass@example.com/mydb",
        },
      },
    };
    const tools = createClawdbotTools({ config: cfg });
    expect(tools.some((tool) => tool.name === "tidb")).toBe(true);
  });

  it("adds tidb tool when enabled (even if url is missing)", () => {
    const cfg: ClawdbotConfig = {
      tools: {
        tidb: {
          enabled: true,
        },
      },
    };
    const tools = createClawdbotTools({ config: cfg });
    expect(tools.some((tool) => tool.name === "tidb")).toBe(true);
  });
});
