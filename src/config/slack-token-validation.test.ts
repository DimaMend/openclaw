import { describe, expect, it } from "vitest";

import { validateConfigObject } from "./config.js";

describe("Slack token validation", () => {
  it("rejects invalid bot token format", () => {
    const res = validateConfigObject({
      channels: { slack: { botToken: "not-a-token" } },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "channels.slack.botToken" }),
      ]),
    );
  });

  it("rejects invalid app token format", () => {
    const res = validateConfigObject({
      channels: { slack: { appToken: "nope" } },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "channels.slack.appToken" }),
      ]),
    );
  });

  it("rejects invalid user token format", () => {
    const res = validateConfigObject({
      channels: { slack: { userToken: "invalid" } },
    });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "channels.slack.userToken" }),
      ]),
    );
  });

  it("accepts valid Slack tokens", () => {
    const res = validateConfigObject({
      channels: {
        slack: {
          botToken: "xoxb-123",
          appToken: "xapp-123",
          userToken: "xoxp-123",
        },
      },
    });
    expect(res.ok).toBe(true);
  });
});
