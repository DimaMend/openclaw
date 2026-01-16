import { beforeEach, describe, expect, it, vi } from "vitest";

import { monitorSignalProvider } from "./monitor.js";

const signalCheckMock = vi.fn();
const signalRpcRequestMock = vi.fn();
const runSignalSseLoopMock = vi.fn();

let config: Record<string, unknown> = {};

vi.mock("../config/config.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../config/config.js")>();
  return {
    ...actual,
    loadConfig: () => config,
  };
});

vi.mock("./client.js", () => ({
  signalCheck: (...args: unknown[]) => signalCheckMock(...args),
  signalRpcRequest: (...args: unknown[]) => signalRpcRequestMock(...args),
}));

vi.mock("./daemon.js", () => ({
  spawnSignalDaemon: vi.fn(() => ({ stop: vi.fn() })),
}));

vi.mock("./sse-reconnect.js", () => ({
  runSignalSseLoop: (...args: unknown[]) => runSignalSseLoopMock(...args),
}));

describe("monitorSignalProvider autoStart daemon wait", () => {
  beforeEach(() => {
    config = {
      channels: {
        signal: { autoStart: true },
      },
    };
    signalCheckMock.mockReset();
    signalRpcRequestMock.mockReset();
    runSignalSseLoopMock.mockReset().mockResolvedValue(undefined);
  });

  it("retries until the daemon is ready and logs after the initial wait", async () => {
    vi.useFakeTimers();
    const runtime = {
      log: vi.fn(),
      error: vi.fn(),
      exit: ((code: number): never => {
        throw new Error(`exit ${code}`);
      }) as (code: number) => never,
    };
    let calls = 0;
    signalCheckMock.mockImplementation(async () => {
      calls += 1;
      if (calls > 70) {
        return { ok: true, status: 200 };
      }
      return { ok: false, error: "fetch failed" };
    });

    const abortController = new AbortController();

    try {
      const monitorPromise = monitorSignalProvider({
        autoStart: true,
        abortSignal: abortController.signal,
        runtime,
      });

      await vi.runAllTimersAsync();
      await expect(monitorPromise).resolves.toBeUndefined();

      const errorMessages = runtime.error.mock.calls.map((call) => String(call[0]));
      expect(errorMessages.some((msg) => msg.includes("daemon not ready"))).toBe(true);
      expect(errorMessages.some((msg) => msg.includes("fetch failed"))).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
