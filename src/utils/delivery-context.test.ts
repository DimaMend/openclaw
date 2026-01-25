import { describe, expect, it } from "vitest";
import { isSenderTrustedForDeliveryContext } from "./delivery-context.js";

describe("isSenderTrustedForDeliveryContext", () => {
  it("returns true when trustAll is set", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1999999999",
      allowFrom: ["+1555000001"],
      trustAll: true,
    });
    expect(result).toBe(true);
  });

  it("returns true when allowFrom is empty (open policy)", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1999999999",
      allowFrom: [],
    });
    expect(result).toBe(true);
  });

  it("returns true when allowFrom is undefined (open policy)", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1999999999",
    });
    expect(result).toBe(true);
  });

  it("returns true when allowFrom has wildcard", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1999999999",
      allowFrom: ["*", "+1555000001"],
    });
    expect(result).toBe(true);
  });

  it("returns true when sender is in allowFrom", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1555000001",
      allowFrom: ["+1555000001", "+1555000002"],
    });
    expect(result).toBe(true);
  });

  it("returns false when sender is not in allowFrom", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "+1999999999",
      allowFrom: ["+1555000001", "+1555000002"],
    });
    expect(result).toBe(false);
  });

  it("returns false when sender is null/undefined", () => {
    expect(
      isSenderTrustedForDeliveryContext({
        sender: null,
        allowFrom: ["+1555000001"],
      }),
    ).toBe(false);

    expect(
      isSenderTrustedForDeliveryContext({
        sender: undefined,
        allowFrom: ["+1555000001"],
      }),
    ).toBe(false);
  });

  it("returns false when sender is empty string", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "  ",
      allowFrom: ["+1555000001"],
    });
    expect(result).toBe(false);
  });

  it("handles number entries in allowFrom", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "123456789",
      allowFrom: [123456789, "+1555000001"],
    });
    expect(result).toBe(true);
  });

  it("trims sender and allowFrom entries for matching", () => {
    const result = isSenderTrustedForDeliveryContext({
      sender: "  +1555000001  ",
      allowFrom: ["  +1555000001  "],
    });
    expect(result).toBe(true);
  });
});
