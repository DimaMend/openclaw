import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { describe, expect, it } from "vitest";

import type { ClawdbotConfig } from "../../config/config.js";
import { resolveCommandAuthorization } from "../command-auth.js";
import { initSessionState } from "./session.js";

describe("initSessionState reset triggers in WhatsApp groups", () => {
  it("Reset trigger /new works for authorized sender in WhatsApp group", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "clawdbot-group-reset-"),
    );
    const storePath = path.join(root, "sessions.json");

    // Config that matches production: WhatsApp with specific allowFrom
    const cfg = {
      session: { store: storePath },
      whatsapp: {
        allowFrom: ["+41796666864"],
        groupPolicy: "open",
      },
    } as ClawdbotConfig;

    // Group message context matching what WhatsApp handler creates
    const groupMessageCtx = {
      Body: `[Chat messages since your last reply - for context]\\n[WhatsApp 120363406150318674@g.us 2026-01-13T07:45Z] Someone: hello\\n\\n[Current message - respond to this]\\n[WhatsApp 120363406150318674@g.us 2026-01-13T07:45Z] Peschiño: /new\\n[from: Peschiño (+41796666864)]`,
      RawBody: "/new",
      CommandBody: "/new",
      From: "120363406150318674@g.us",
      To: "+41779241027",
      ChatType: "group",
      SessionKey: "agent:main:whatsapp:group:120363406150318674@g.us",
      Provider: "whatsapp",
      Surface: "whatsapp",
      SenderName: "Peschiño",
      SenderE164: "+41796666864",
      SenderId: "41796666864:0@s.whatsapp.net",
    };

    const result = await initSessionState({
      ctx: groupMessageCtx,
      cfg,
      commandAuthorized: true,
    });

    // The reset should be detected
    expect(result.triggerBodyNormalized).toBe("/new");
    expect(result.isNewSession).toBe(true);
    expect(result.bodyStripped).toBe("");
  });

  it("Reset trigger /new blocked for unauthorized sender in existing session", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "clawdbot-group-reset-unauth-"),
    );
    const storePath = path.join(root, "sessions.json");
    const sessionKey = "agent:main:whatsapp:group:120363406150318674@g.us";
    const existingSessionId = "existing-session-123";

    // Create an existing session
    const { saveSessionStore } = await import("../../config/sessions.js");
    await saveSessionStore(storePath, {
      [sessionKey]: {
        sessionId: existingSessionId,
        updatedAt: Date.now(),
      },
    });

    const cfg = {
      session: { store: storePath, idleMinutes: 999 }, // Long idle to prevent auto-reset
      whatsapp: {
        allowFrom: ["+41796666864"], // Owner's number
        groupPolicy: "open",
      },
    } as ClawdbotConfig;

    // Group message from different sender (not in allowFrom)
    const groupMessageCtx = {
      Body: `[Context]\\n[WhatsApp ...] OtherPerson: /new\\n[from: OtherPerson (+1555123456)]`,
      RawBody: "/new",
      CommandBody: "/new",
      From: "120363406150318674@g.us",
      To: "+41779241027",
      ChatType: "group",
      SessionKey: sessionKey,
      Provider: "whatsapp",
      Surface: "whatsapp",
      SenderName: "OtherPerson",
      SenderE164: "+1555123456", // Different sender (not authorized)
      SenderId: "1555123456:0@s.whatsapp.net",
    };

    const result = await initSessionState({
      ctx: groupMessageCtx,
      cfg,
      commandAuthorized: true,
    });

    // Reset should NOT be triggered for unauthorized sender - session ID should stay the same
    expect(result.triggerBodyNormalized).toBe("/new");
    expect(result.sessionId).toBe(existingSessionId); // Session should NOT change
    expect(result.isNewSession).toBe(false);
  });

  it("Debug: resolveCommandAuthorization for WhatsApp group sender", async () => {
    const cfg = {
      whatsapp: {
        allowFrom: ["+41796666864"],
        groupPolicy: "open",
      },
    } as ClawdbotConfig;

    const ctx = {
      Body: "/new",
      RawBody: "/new",
      From: "120363406150318674@g.us",
      To: "+41779241027",
      ChatType: "group",
      Provider: "whatsapp",
      SenderE164: "+41796666864",
      SenderId: "41796666864:0@s.whatsapp.net",
    };

    const auth = resolveCommandAuthorization({
      ctx,
      cfg,
      commandAuthorized: true,
    });

    // The authorized sender should be recognized
    expect(auth.isAuthorizedSender).toBe(true);
    expect(auth.ownerList).toContain("+41796666864");
  });

  it("Reset trigger works when RawBody is clean but Body has wrapped context", async () => {
    const root = await fs.mkdtemp(
      path.join(os.tmpdir(), "clawdbot-group-rawbody-"),
    );
    const storePath = path.join(root, "sessions.json");

    const cfg = {
      session: { store: storePath },
      whatsapp: {
        allowFrom: ["*"], // Allow all
        groupPolicy: "open",
      },
    } as ClawdbotConfig;

    const groupMessageCtx = {
      // Body is wrapped with context prefixes
      Body: `[WhatsApp 120363406150318674@g.us 2026-01-13T07:45Z] Jake: /new\n[from: Jake (+1222)]`,
      // RawBody is clean
      RawBody: "/new",
      CommandBody: "/new",
      From: "120363406150318674@g.us",
      To: "+1111",
      ChatType: "group",
      SessionKey: "agent:main:whatsapp:group:G1",
      Provider: "whatsapp",
      SenderE164: "+1222",
    };

    const result = await initSessionState({
      ctx: groupMessageCtx,
      cfg,
      commandAuthorized: true,
    });

    expect(result.triggerBodyNormalized).toBe("/new");
    expect(result.isNewSession).toBe(true);
  });
});
