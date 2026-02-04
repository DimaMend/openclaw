import { describe, expect, it } from "vitest";
import { renderTelegramHtmlText } from "./format.js";

describe("renderTelegramHtmlText - .md file wrapping", () => {
  it("wraps simple .md filenames in code tags", () => {
    expect(renderTelegramHtmlText("Check README.md")).toContain("Check <code>README.md</code>");
    expect(renderTelegramHtmlText("See HEARTBEAT.md for status")).toContain(
      "See <code>HEARTBEAT.md</code> for status",
    );
  });

  it("wraps .md files with dashes", () => {
    expect(renderTelegramHtmlText("Check TASK-001.md")).toContain("Check <code>TASK-001.md</code>");
    expect(renderTelegramHtmlText("Review architecture-upgrade-plan.md")).toContain(
      "Review <code>architecture-upgrade-plan.md</code>",
    );
  });

  it("wraps .md files with dots", () => {
    expect(renderTelegramHtmlText("Check OpenClaw.Config.v2.md")).toContain(
      "Check <code>OpenClaw.Config.v2.md</code>",
    );
  });

  it("wraps .md files with underscores", () => {
    expect(renderTelegramHtmlText("Check internal_review_notes.md")).toContain(
      "Check <code>internal_review_notes.md</code>",
    );
  });

  it("wraps .md file paths", () => {
    expect(renderTelegramHtmlText("Look at squad/friday/HEARTBEAT.md")).toContain(
      "Look at <code>squad/friday/HEARTBEAT.md</code>",
    );
  });

  it("does not wrap already code-formatted filenames", () => {
    const result = renderTelegramHtmlText("Already `wrapped.md` here");
    // Should only have one set of code tags, not double-wrapped
    expect(result).toContain("<code>");
    expect(result).not.toContain("<code><code>");
  });

  it("does not wrap .md files in URLs", () => {
    const result = renderTelegramHtmlText("Visit https://example.com/README.md");
    // The URL should remain as a link, not have code tags
    expect(result).toContain('<a href="https://example.com/README.md"');
    expect(result).not.toContain("<code>README.md</code>");
  });

  it("does not wrap .md files inside HTML tags", () => {
    const result = renderTelegramHtmlText('<a href="README.md">Link</a>');
    // The href attribute should not be wrapped
    expect(result).toContain('href="README.md"');
    expect(result).not.toContain('href="<code>README.md</code>"');
  });

  it("handles mixed content correctly", () => {
    const result = renderTelegramHtmlText("Check README.md and CONTRIBUTING.md");
    expect(result).toContain("<code>README.md</code>");
    expect(result).toContain("<code>CONTRIBUTING.md</code>");
  });

  it("handles edge cases", () => {
    expect(renderTelegramHtmlText("No markdown files here")).not.toContain("<code>");
    expect(renderTelegramHtmlText("File.md at start")).toContain("<code>File.md</code>");
    expect(renderTelegramHtmlText("Ends with file.md")).toContain("<code>file.md</code>");
  });

  it("handles HTML mode", () => {
    const result = renderTelegramHtmlText("Check README.md", { textMode: "html" });
    expect(result).toContain("<code>README.md</code>");
  });
});
