import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GatewayRequestHandlerOptions } from "./types.js";
import { providersHandlers } from "./providers.js";

function createMockContext() {
  return {
    deps: {
      config: () => ({ agents: { main: { dir: "/mock/agent/dir" } } }),
    },
  } as unknown as GatewayRequestHandlerOptions["context"];
}

function createMockRespond() {
  return vi.fn() as GatewayRequestHandlerOptions["respond"];
}

function createMockClient() {
  return {
    connect: { role: "operator", scopes: ["operator.admin"] },
  } as GatewayRequestHandlerOptions["client"];
}

describe("providers.list", () => {
  it("returns list of configured providers", async () => {
    const respond = createMockRespond();
    const context = createMockContext();

    await providersHandlers["providers.list"]({
      req: { method: "providers.list", id: "1" },
      params: {},
      client: createMockClient(),
      isWebchatConnect: () => false,
      respond,
      context,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        profiles: expect.any(Object),
      }),
      undefined,
    );
  });
});

describe("providers.active", () => {
  it("returns the active provider profile", async () => {
    const respond = createMockRespond();
    const context = createMockContext();

    await providersHandlers["providers.active"]({
      req: { method: "providers.active", id: "1" },
      params: {},
      client: createMockClient(),
      isWebchatConnect: () => false,
      respond,
      context,
    });

    expect(respond).toHaveBeenCalledWith(
      true,
      expect.objectContaining({
        activeProfile: expect.any(Object),
      }),
      undefined,
    );
  });
});

describe("providers.switch", () => {
  it("requires profileId parameter", async () => {
    const respond = createMockRespond();
    const context = createMockContext();

    await providersHandlers["providers.switch"]({
      req: { method: "providers.switch", id: "1" },
      params: {},
      client: createMockClient(),
      isWebchatConnect: () => false,
      respond,
      context,
    });

    expect(respond).toHaveBeenCalledWith(
      false,
      undefined,
      expect.objectContaining({
        message: expect.stringContaining("profileId"),
      }),
    );
  });

  it("switches to specified profile when valid", async () => {
    const respond = createMockRespond();
    const context = createMockContext();

    await providersHandlers["providers.switch"]({
      req: { method: "providers.switch", id: "1" },
      params: { profileId: "anthropic:default" },
      client: createMockClient(),
      isWebchatConnect: () => false,
      respond,
      context,
    });

    expect(respond).toHaveBeenCalled();
  });
});
