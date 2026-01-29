import { describe, expect, it } from "vitest";

import { stripReasoningTagsFromText } from "./reasoning-tags.js";

describe("stripReasoningTagsFromText", () => {
  describe("basic functionality", () => {
    it("returns empty string as-is", () => {
      expect(stripReasoningTagsFromText("")).toBe("");
    });

    it("returns text without think tags as-is", () => {
      expect(stripReasoningTagsFromText("Hello world")).toBe("Hello world");
    });

    it("strips complete <think>...</think> blocks", () => {
      const input = "Before <think>reasoning content</think> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });

    it("strips complete <thinking>...</thinking> blocks", () => {
      const input = "Before <thinking>reasoning content</thinking> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });

    it("strips multiple think blocks", () => {
      const input = "A <think>x</think> B <think>y</think> C";
      expect(stripReasoningTagsFromText(input)).toBe("A  B  C");
    });

    it("strips nested content (flat parse)", () => {
      const input = "Start <think>outer <think>inner</think> more</think> End";
      expect(stripReasoningTagsFromText(input)).toBe("Start  more End");
    });
  });

  describe("unclosed tag handling - issue #3952", () => {
    it("preserves content when <think> appears in prose (not at start)", () => {
      const input = "Use the <think> tag to enable thinking. Then do X.";
      // Content before <think> tag - treat as prose mentioning the tag
      expect(stripReasoningTagsFromText(input)).toBe(
        "Use the <think> tag to enable thinking. Then do X.",
      );
    });

    it("preserves content when <thinking> appears in prose", () => {
      const input = "The <thinking> mode is useful. Try it!";
      expect(stripReasoningTagsFromText(input)).toBe("The <thinking> mode is useful. Try it!");
    });

    it("preserves code block containing <think> tag", () => {
      const input = "Example:\n```\n<think>\nprint('hello')\n```\nMore text";
      expect(stripReasoningTagsFromText(input)).toBe(
        "Example:\n```\n<think>\nprint('hello')\n```\nMore text",
      );
    });

    it("strips paired tags even when discussing them", () => {
      const input = "You can use <think> and </think> to wrap reasoning.";
      // Tags are properly paired, so content between is stripped
      expect(stripReasoningTagsFromText(input)).toBe("You can use  to wrap reasoning.");
    });

    it("preserves multiple unclosed tags when in prose", () => {
      const input = "First <think> then <thinking> more text";
      expect(stripReasoningTagsFromText(input)).toBe("First <think> then <thinking> more text");
    });

    it("strips unclosed tag at start (model thinking output)", () => {
      // When <think> is at the very start, treat as model thinking that was cut off
      const input = "<think>Pensando sobre el problema...";
      expect(stripReasoningTagsFromText(input)).toBe("");
    });

    it("strips unclosed tag at start with whitespace", () => {
      const input = "  <think>Some thinking content...";
      expect(stripReasoningTagsFromText(input)).toBe("");
    });
  });

  describe("preserve mode", () => {
    it("strips thinking tags and preserves trailing content in preserve mode", () => {
      // In preserve mode with unclosed tags, it still strips but preserves trailing
      const input = "Before <think>content without close";
      const result = stripReasoningTagsFromText(input, { mode: "preserve" });
      // preserve mode strips the tag but keeps trailing content
      expect(result).toBe("Before content without close");
    });

    it("strips properly paired tags in preserve mode", () => {
      const input = "Before <think>hidden</think> After";
      const result = stripReasoningTagsFromText(input, { mode: "preserve" });
      expect(result).toBe("Before  After");
    });
  });

  describe("trim options", () => {
    it("trims both ends by default", () => {
      const input = "  <think>x</think>  result  ";
      expect(stripReasoningTagsFromText(input)).toBe("result");
    });

    it("respects trim: none", () => {
      const input = "  <think>x</think>  result  ";
      expect(stripReasoningTagsFromText(input, { trim: "none" })).toBe("    result  ");
    });

    it("respects trim: start", () => {
      const input = "  <think>x</think>  result  ";
      // trim: start only trims from the start, not end
      expect(stripReasoningTagsFromText(input, { trim: "start" })).toBe("result  ");
    });
  });

  describe("final tag handling", () => {
    it("strips <final> tags", () => {
      const input = "Before <final>answer</final> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before answer After");
    });

    it("strips only the tags, not content inside <final>", () => {
      const input = "<final>The answer is 42</final>";
      expect(stripReasoningTagsFromText(input)).toBe("The answer is 42");
    });
  });

  describe("edge cases", () => {
    it("handles whitespace in tags", () => {
      const input = "Before < think >content< / think > After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });

    it("handles case variations", () => {
      const input = "Before <THINK>content</THINK> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });

    it("handles <thought> variant", () => {
      const input = "Before <thought>content</thought> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });

    it("handles <antthinking> variant", () => {
      const input = "Before <antthinking>content</antthinking> After";
      expect(stripReasoningTagsFromText(input)).toBe("Before  After");
    });
  });
});
