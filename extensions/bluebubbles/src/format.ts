import {
  markdownToIR,
  type MarkdownIR,
  type MarkdownStyle,
  type MarkdownStyleSpan,
} from "clawdbot/plugin-sdk";

export type BlueBubblesTextStyle = "bold" | "italic" | "underline" | "strikethrough";

export type BlueBubblesTextFormatting = {
  start: number;
  length: number;
  styles: BlueBubblesTextStyle[];
};

export type BlueBubblesFormattedText = {
  text: string;
  textFormatting: BlueBubblesTextFormatting[];
};

/**
 * Maps Clawdbot markdown IR style to BlueBubbles text style.
 * Returns null for styles that BlueBubbles doesn't support.
 */
function mapStyle(style: MarkdownStyle): BlueBubblesTextStyle | null {
  switch (style) {
    case "bold":
      return "bold";
    case "italic":
      return "italic";
    case "strikethrough":
      return "strikethrough";
    // code and code_block could be mapped to a monospace style if BB ever supports it
    case "code":
    case "code_block":
    case "spoiler":
      return null;
    default:
      return null;
  }
}

/**
 * Represents a span with its position and style for merging overlapping styles.
 */
type StyleEvent = {
  pos: number;
  isEnd: boolean;
  style: BlueBubblesTextStyle;
  spanIndex: number;
};

/**
 * Converts markdown IR styles to BlueBubbles textFormatting array.
 * BlueBubbles expects each formatting entry to have start, length, and an array of styles.
 * When multiple styles overlap at the same position, they should be combined.
 */
function convertStylesToFormatting(
  styles: MarkdownStyleSpan[],
  textLength: number,
): BlueBubblesTextFormatting[] {
  if (styles.length === 0) return [];

  // Map IR styles to BB styles, filtering out unsupported ones
  const mappedSpans: Array<{ start: number; end: number; style: BlueBubblesTextStyle }> = [];
  for (const span of styles) {
    const mapped = mapStyle(span.style);
    if (mapped) {
      mappedSpans.push({
        start: Math.max(0, span.start),
        end: Math.min(span.end, textLength),
        style: mapped,
      });
    }
  }

  if (mappedSpans.length === 0) return [];

  // Create events for style starts and ends
  const events: StyleEvent[] = [];
  mappedSpans.forEach((span, index) => {
    if (span.end > span.start) {
      events.push({ pos: span.start, isEnd: false, style: span.style, spanIndex: index });
      events.push({ pos: span.end, isEnd: true, style: span.style, spanIndex: index });
    }
  });

  // Sort events: by position, then ends before starts at the same position
  events.sort((a, b) => {
    if (a.pos !== b.pos) return a.pos - b.pos;
    // Ends come before starts at the same position
    if (a.isEnd !== b.isEnd) return a.isEnd ? -1 : 1;
    return 0;
  });

  // Collect all boundary positions
  const boundaries = new Set<number>();
  for (const event of events) {
    boundaries.add(event.pos);
  }
  const sortedBoundaries = [...boundaries].sort((a, b) => a - b);

  // Track active styles at each segment
  const result: BlueBubblesTextFormatting[] = [];
  const activeStyles = new Set<BlueBubblesTextStyle>();

  for (let i = 0; i < sortedBoundaries.length; i++) {
    const pos = sortedBoundaries[i];
    const nextPos = sortedBoundaries[i + 1];

    // Process all events at this position
    for (const event of events) {
      if (event.pos !== pos) continue;
      if (event.isEnd) {
        activeStyles.delete(event.style);
      } else {
        activeStyles.add(event.style);
      }
    }

    // If we have active styles and there's a next position, emit a formatting entry
    if (activeStyles.size > 0 && nextPos !== undefined && nextPos > pos) {
      result.push({
        start: pos,
        length: nextPos - pos,
        styles: [...activeStyles].sort(),
      });
    }
  }

  // Merge adjacent entries with the same styles
  const merged: BlueBubblesTextFormatting[] = [];
  for (const entry of result) {
    const prev = merged[merged.length - 1];
    if (
      prev &&
      prev.start + prev.length === entry.start &&
      prev.styles.length === entry.styles.length &&
      prev.styles.every((s, i) => s === entry.styles[i])
    ) {
      prev.length += entry.length;
    } else {
      merged.push({ ...entry });
    }
  }

  return merged;
}

/**
 * Parses custom underline syntax (++text++) from plain text and returns underline spans.
 * This is applied to text that has already had markdown removed.
 */
function extractUnderlineSpans(
  input: string,
): { text: string; spans: Array<{ start: number; end: number }> } {
  const spans: Array<{ start: number; end: number }> = [];
  let result = "";
  let i = 0;

  while (i < input.length) {
    // Check for opening ++
    if (input[i] === "+" && input[i + 1] === "+") {
      const startMarker = i;
      i += 2;

      // Find closing ++
      let foundClose = false;
      let content = "";
      while (i < input.length) {
        if (input[i] === "+" && input[i + 1] === "+") {
          foundClose = true;
          i += 2;
          break;
        }
        content += input[i];
        i++;
      }

      if (foundClose && content.length > 0) {
        const spanStart = result.length;
        result += content;
        spans.push({ start: spanStart, end: result.length });
      } else {
        // No closing ++, treat as literal
        result += input.slice(startMarker, i);
      }
    } else {
      result += input[i];
      i++;
    }
  }

  return { text: result, spans };
}

/**
 * Pre-processes the input to extract underline markers before markdown parsing.
 * Returns the text with underline markers removed and a map of original positions to new positions.
 */
function preprocessUnderline(input: string): {
  text: string;
  underlineRanges: Array<{ origStart: number; origEnd: number; content: string }>;
} {
  const underlineRanges: Array<{ origStart: number; origEnd: number; content: string }> = [];
  let result = "";
  let i = 0;

  while (i < input.length) {
    if (input[i] === "+" && input[i + 1] === "+") {
      const startMarker = i;
      i += 2;

      let content = "";
      let foundClose = false;
      while (i < input.length) {
        if (input[i] === "+" && input[i + 1] === "+") {
          foundClose = true;
          i += 2;
          if (content.length > 0) {
            underlineRanges.push({
              origStart: startMarker,
              origEnd: i,
              content,
            });
            result += content;
          } else {
            result += "++";
          }
          break;
        }
        content += input[i];
        i++;
      }

      // If we hit end of string without finding closing ++
      if (!foundClose && content.length > 0) {
        result += "++" + content;
      }
    } else {
      result += input[i];
      i++;
    }
  }

  return { text: result, underlineRanges };
}

/**
 * Converts markdown text to BlueBubbles formatted text with textFormatting array.
 *
 * Supported markdown:
 * - **bold** or __bold__
 * - *italic* or _italic_
 * - ~~strikethrough~~
 * - ++underline++ (custom syntax)
 *
 * @param markdown - The markdown-formatted input text
 * @returns Object with plain text and BlueBubbles textFormatting array
 */
export function markdownToBlueBubblesText(markdown: string): BlueBubblesFormattedText {
  if (!markdown || !markdown.trim()) {
    return { text: markdown ?? "", textFormatting: [] };
  }

  // Step 1: Extract underline ranges from original input
  const { text: withoutUnderlineMarkers, underlineRanges } = preprocessUnderline(markdown);

  // Step 2: Parse the remaining markdown to IR
  const ir = markdownToIR(withoutUnderlineMarkers, {
    linkify: false,
    enableSpoilers: false,
    headingStyle: "none",
    blockquotePrefix: "",
  });

  // Step 3: Convert IR styles to BlueBubbles formatting
  const irFormatting = convertStylesToFormatting(ir.styles, ir.text.length);

  // Step 4: Map underline ranges from original positions to IR text positions
  // We need to track how markdown parsing shifted positions
  const underlineSpans: Array<{ start: number; end: number }> = [];

  if (underlineRanges.length > 0) {
    // Build a mapping from original text positions to IR text positions
    // This is tricky because we need to account for:
    // 1. Underline markers already removed (done in preprocessUnderline)
    // 2. Markdown syntax removed by markdownToIR

    // Simple approach: find the underline content in the IR text
    // This works because we've already removed the ++ markers
    for (const range of underlineRanges) {
      const content = range.content;
      // Find where this content appears in the IR text
      // We need to search from an approximate position based on the original location
      const searchStart = Math.max(
        0,
        Math.floor((range.origStart / markdown.length) * ir.text.length) - content.length,
      );
      const idx = ir.text.indexOf(content, searchStart);
      if (idx !== -1) {
        underlineSpans.push({ start: idx, end: idx + content.length });
      }
    }
  }

  // Step 5: Create underline formatting entries
  const underlineFormatting: BlueBubblesTextFormatting[] = underlineSpans
    .filter((span) => span.end > span.start && span.end <= ir.text.length)
    .map((span) => ({
      start: span.start,
      length: span.end - span.start,
      styles: ["underline" as BlueBubblesTextStyle],
    }));

  // Step 6: Merge all formatting and sort by position
  const allFormatting = [...irFormatting, ...underlineFormatting];
  allFormatting.sort((a, b) => a.start - b.start);

  return {
    text: ir.text,
    textFormatting: allFormatting,
  };
}

/**
 * Checks if the text has any formatting that BlueBubbles can render.
 */
export function hasFormattingMarkers(text: string): boolean {
  if (!text) return false;
  // Check for markdown-style formatting markers
  return (
    /\*\*[^*]+\*\*/.test(text) || // bold
    /\*[^*]+\*/.test(text) || // italic
    /__[^_]+__/.test(text) || // bold (alt)
    /_[^_]+_/.test(text) || // italic (alt)
    /~~[^~]+~~/.test(text) || // strikethrough
    /\+\+[^+]+\+\+/.test(text) // underline
  );
}
