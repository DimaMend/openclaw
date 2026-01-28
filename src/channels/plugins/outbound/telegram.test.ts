import { describe, expect, it, vi } from "vitest";

import type { MoltbotConfig } from "../../../config/config.js";
import { telegramOutbound } from "./telegram.js";

describe("telegramOutbound.sendPayload", () => {
  it("sends text payload with buttons", async () => {
    const sendTelegram = vi.fn(async () => ({ messageId: "m1", chatId: "c1" }));

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as MoltbotConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Hello",
        channelData: {
          telegram: {
            buttons: [[{ text: "Option", callback_data: "/option" }]],
          },
        },
      },
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledWith(
      "telegram:123",
      "Hello",
      expect.objectContaining({
        buttons: [[{ text: "Option", callback_data: "/option" }]],
        textMode: "html",
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "m1", chatId: "c1" });
  });

  it("sends media payloads as album and buttons in follow-up", async () => {
    const sendTelegram = vi.fn().mockResolvedValue({ messageId: "m-btn", chatId: "c1" });
    const sendMediaGroup = vi.fn().mockResolvedValue({ messageIds: ["m1", "m2"], chatId: "c1" });

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as MoltbotConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Caption",
        mediaUrls: ["https://example.com/a.png", "https://example.com/b.png"],
        channelData: {
          telegram: {
            buttons: [[{ text: "Go", callback_data: "/go" }]],
          },
        },
      },
      deps: { sendTelegram, sendMediaGroup },
    });

    // Media group is sent with both URLs
    expect(sendMediaGroup).toHaveBeenCalledTimes(1);
    expect(sendMediaGroup).toHaveBeenCalledWith(
      "telegram:123",
      ["https://example.com/a.png", "https://example.com/b.png"],
      "Caption",
      expect.objectContaining({ accountId: undefined }),
    );
    // Buttons sent in follow-up message (media groups don't support buttons)
    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledWith(
      "telegram:123",
      "",
      expect.objectContaining({
        buttons: [[{ text: "Go", callback_data: "/go" }]],
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "m1", chatId: "c1" });
  });

  it("sends single media with buttons directly", async () => {
    const sendTelegram = vi.fn().mockResolvedValue({ messageId: "m1", chatId: "c1" });

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as MoltbotConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Caption",
        mediaUrls: ["https://example.com/a.png"],
        channelData: {
          telegram: {
            buttons: [[{ text: "Go", callback_data: "/go" }]],
          },
        },
      },
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledWith(
      "telegram:123",
      "Caption",
      expect.objectContaining({
        mediaUrl: "https://example.com/a.png",
        buttons: [[{ text: "Go", callback_data: "/go" }]],
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "m1", chatId: "c1" });
  });
});
