import type { MarkdownTableMode } from "../config/types.base.js";
import {
  chunkMarkdownIR,
  markdownToIR,
  type MarkdownLinkSpan,
  type MarkdownIR,
} from "../markdown/ir.js";
import { renderMarkdownWithMarkers } from "../markdown/render.js";

export type TelegramFormattedChunk = {
  html: string;
  text: string;
};

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeHtmlAttr(text: string): string {
  return escapeHtml(text).replace(/"/g, "&quot;");
}

function buildTelegramLink(link: MarkdownLinkSpan, _text: string) {
  const href = link.href.trim();
  if (!href) {
    return null;
  }
  if (link.start === link.end) {
    return null;
  }
  const safeHref = escapeHtmlAttr(href);
  return {
    start: link.start,
    end: link.end,
    open: `<a href="${safeHref}">`,
    close: "</a>",
  };
}

function renderTelegramHtml(ir: MarkdownIR): string {
  return renderMarkdownWithMarkers(ir, {
    styleMarkers: {
      bold: { open: "<b>", close: "</b>" },
      italic: { open: "<i>", close: "</i>" },
      strikethrough: { open: "<s>", close: "</s>" },
      code: { open: "<code>", close: "</code>" },
      code_block: { open: "<pre><code>", close: "</code></pre>" },
    },
    escapeText: escapeHtml,
    buildLink: buildTelegramLink,
  });
}

export function markdownToTelegramHtml(
  markdown: string,
  options: { tableMode?: MarkdownTableMode } = {},
): string {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
  return renderTelegramHtml(ir);
}

/**
 * Wraps standalone .md file references in backticks within HTML text nodes.
 * This runs AFTER markdown→HTML conversion to avoid modifying HTML attributes.
 */
function wrapMdFileReferencesInHtml(html: string): string {
  // Match .md file references in text content (not inside tags)
  // Pattern: word chars/dashes/dots/slashes ending in .md
  // Must be preceded by > (end of tag) or whitespace, and followed by whitespace or <
  const mdFilePattern = /(^|>|[\s])([a-zA-Z0-9_.\-./]+\.md)(?=$|[\s<])/g;

  return html.replace(mdFilePattern, (match, prefix, filename) => {
    // Don't wrap if filename starts with // (URL scheme)
    if (filename.startsWith("//")) {
      return match;
    }
    // Don't wrap if it's part of a URL (check if prefix contains http)
    if (/https?:\/\/$/i.test(prefix)) {
      return match;
    }
    return `${prefix}<code>${filename}</code>`;
  });
}

export function renderTelegramHtmlText(
  text: string,
  options: { textMode?: "markdown" | "html"; tableMode?: MarkdownTableMode } = {},
): string {
  const textMode = options.textMode ?? "markdown";
  if (textMode === "html") {
    // For HTML mode, still wrap .md references in the HTML
    return wrapMdFileReferencesInHtml(text);
  }
  const html = markdownToTelegramHtml(text, { tableMode: options.tableMode });
  // Wrap .md references after markdown→HTML conversion
  // This ensures we only transform text nodes, not HTML attributes
  return wrapMdFileReferencesInHtml(html);
}

export function markdownToTelegramChunks(
  markdown: string,
  limit: number,
  options: { tableMode?: MarkdownTableMode } = {},
): TelegramFormattedChunk[] {
  const ir = markdownToIR(markdown ?? "", {
    linkify: true,
    headingStyle: "none",
    blockquotePrefix: "",
    tableMode: options.tableMode,
  });
  const chunks = chunkMarkdownIR(ir, limit);
  return chunks.map((chunk) => ({
    html: renderTelegramHtml(chunk),
    text: chunk.text,
  }));
}

export function markdownToTelegramHtmlChunks(markdown: string, limit: number): string[] {
  return markdownToTelegramChunks(markdown, limit).map((chunk) => chunk.html);
}
