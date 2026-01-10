import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it, vi } from "vitest";

type MockReq = {
  __payload?: unknown;
};

vi.mock("./hooks.js", () => {
  return {
    readJsonBody: vi.fn(async (req: MockReq) => {
      return { ok: true, value: req.__payload };
    }),
  };
});

vi.mock("../commands/agent.js", () => {
  return {
    agentCommand: vi.fn(async () => {
      return {
        payloads: [{ text: "hello" }],
      };
    }),
  };
});

import { handleApiRequest } from "./api.js";

function makeReq(opts: {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  payload: unknown;
  remoteAddress?: string;
}): IncomingMessage {
  const req = {
    url: opts.url,
    method: opts.method ?? "POST",
    headers: opts.headers ?? {},
    socket: { remoteAddress: opts.remoteAddress ?? "127.0.0.1" },
    on: () => {},
    __payload: opts.payload,
  };

  return req as unknown as IncomingMessage;
}

function makeRes() {
  const state: {
    statusCode: number;
    headers: Record<string, string>;
    body: string;
  } = {
    statusCode: 0,
    headers: {},
    body: "",
  };

  const resObj: Record<string, unknown> = {
    setHeader: (k: string, v: string) => {
      state.headers[k.toLowerCase()] = v;
    },
    end: (chunk?: unknown) => {
      if (chunk !== undefined) state.body += String(chunk);
    },
    write: (chunk: unknown) => {
      state.body += String(chunk);
      return true;
    },
    writeHead: (code: number, headers?: Record<string, string>) => {
      state.statusCode = code;
      if (headers) {
        for (const [k, v] of Object.entries(headers)) {
          state.headers[k.toLowerCase()] = v;
        }
      }
      return resObj as unknown as ServerResponse;
    },
  };

  Object.defineProperty(resObj, "statusCode", {
    get() {
      return state.statusCode;
    },
    set(v: number) {
      state.statusCode = v;
    },
  });

  const res = resObj as unknown as ServerResponse;
  return { res, state };
}

describe("/v1/chat/completions HTTP API", () => {
  it("requires auth token when configured", async () => {
    const req = makeReq({
      url: "/v1/chat/completions",
      payload: {
        model: "clawdbot",
        messages: [{ role: "user", content: "hi" }],
      },
      remoteAddress: "10.0.0.5",
      headers: { host: "example.com" },
    });
    const { res, state } = makeRes();

    const handled = await handleApiRequest(req, res, {
      auth: {
        mode: "token",
        token: "secret",
        password: undefined,
        allowTailscale: false,
      },
    });
    expect(handled).toBe(true);
    expect(state.statusCode).toBe(401);
  });

  it("supports SSE when stream=true", async () => {
    const req = makeReq({
      url: "/v1/chat/completions",
      payload: {
        stream: true,
        model: "clawdbot",
        messages: [{ role: "user", content: "hi" }],
      },
      remoteAddress: "127.0.0.1",
      headers: { host: "127.0.0.1:18789" },
    });
    const { res, state } = makeRes();

    const handled = await handleApiRequest(req, res, {
      auth: {
        mode: "none",
        token: undefined,
        password: undefined,
        allowTailscale: false,
      },
    });
    expect(handled).toBe(true);
    expect(state.headers["content-type"]).toContain("text/event-stream");
    expect(state.body).toContain("data:");
    expect(state.body).toContain("[DONE]");
  });
});
