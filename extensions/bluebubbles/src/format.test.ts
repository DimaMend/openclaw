import { describe, expect, it } from "vitest";

import {
  hasFormattingMarkers,
  markdownToBlueBubblesText,
  type BlueBubblesFormattedText,
} from "./format.js";

describe("markdownToBlueBubblesText", () => {
  it("converts bold markdown", () => {
    const result = markdownToBlueBubblesText("Hello **world**!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([{ start: 6, length: 5, styles: ["bold"] }]);
  });

  it("converts italic markdown with asterisks", () => {
    const result = markdownToBlueBubblesText("Hello *world*!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([{ start: 6, length: 5, styles: ["italic"] }]);
  });

  it("converts italic markdown with underscores", () => {
    const result = markdownToBlueBubblesText("Hello _world_!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([{ start: 6, length: 5, styles: ["italic"] }]);
  });

  it("converts strikethrough markdown", () => {
    const result = markdownToBlueBubblesText("Hello ~~world~~!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([{ start: 6, length: 5, styles: ["strikethrough"] }]);
  });

  it("converts underline with ++ syntax", () => {
    const result = markdownToBlueBubblesText("Hello ++world++!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([{ start: 6, length: 5, styles: ["underline"] }]);
  });

  it("converts multiple formatting styles", () => {
    const result = markdownToBlueBubblesText("**Bold** *Italic* ~~Strike~~ ++Under++");
    expect(result.text).toBe("Bold Italic Strike Under");
    expect(result.textFormatting).toContainEqual({ start: 0, length: 4, styles: ["bold"] });
    expect(result.textFormatting).toContainEqual({ start: 5, length: 6, styles: ["italic"] });
    expect(result.textFormatting).toContainEqual({
      start: 12,
      length: 6,
      styles: ["strikethrough"],
    });
    expect(result.textFormatting).toContainEqual({ start: 19, length: 5, styles: ["underline"] });
  });

  it("handles nested bold and italic", () => {
    const result = markdownToBlueBubblesText("***bold italic***");
    expect(result.text).toBe("bold italic");
    // Should have both bold and italic styles
    const boldSpan = result.textFormatting.find((f) => f.styles.includes("bold"));
    const italicSpan = result.textFormatting.find((f) => f.styles.includes("italic"));
    expect(boldSpan).toBeDefined();
    expect(italicSpan).toBeDefined();
  });

  it("handles empty string", () => {
    const result = markdownToBlueBubblesText("");
    expect(result.text).toBe("");
    expect(result.textFormatting).toEqual([]);
  });

  it("handles plain text without formatting", () => {
    const result = markdownToBlueBubblesText("Hello world!");
    expect(result.text).toBe("Hello world!");
    expect(result.textFormatting).toEqual([]);
  });

  it("handles unclosed underline markers as literal text", () => {
    const result = markdownToBlueBubblesText("Hello ++world");
    expect(result.text).toBe("Hello ++world");
    expect(result.textFormatting).toEqual([]);
  });

  it("handles bold with double underscores", () => {
    const result = markdownToBlueBubblesText("__bold__");
    expect(result.text).toBe("bold");
    // Note: In standard markdown, __ is bold (same as **)
    expect(result.textFormatting).toEqual([{ start: 0, length: 4, styles: ["bold"] }]);
  });

  it("ignores code spans (not supported by iMessage)", () => {
    const result = markdownToBlueBubblesText("Hello `code` world");
    expect(result.text).toBe("Hello code world");
    // Code spans should not produce formatting (not supported)
    expect(result.textFormatting).toEqual([]);
  });
});

describe("hasFormattingMarkers", () => {
  it("detects bold markers", () => {
    expect(hasFormattingMarkers("**bold**")).toBe(true);
    expect(hasFormattingMarkers("__bold__")).toBe(true);
  });

  it("detects italic markers", () => {
    expect(hasFormattingMarkers("*italic*")).toBe(true);
    expect(hasFormattingMarkers("_italic_")).toBe(true);
  });

  it("detects strikethrough markers", () => {
    expect(hasFormattingMarkers("~~strike~~")).toBe(true);
  });

  it("detects underline markers", () => {
    expect(hasFormattingMarkers("++underline++")).toBe(true);
  });

  it("returns false for plain text", () => {
    expect(hasFormattingMarkers("hello world")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(hasFormattingMarkers("")).toBe(false);
  });
});
