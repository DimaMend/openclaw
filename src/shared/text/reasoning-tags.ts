export type ReasoningTagMode = "strict" | "preserve";
export type ReasoningTagTrim = "none" | "start" | "both";

const QUICK_TAG_RE = /<\s*\/?\s*(?:think(?:ing)?|thought|antthinking|final)\b/i;
const FINAL_TAG_RE = /<\s*\/?\s*final\b[^>]*>/gi;
const THINKING_TAG_RE = /<\s*(\/?)\s*(?:think(?:ing)?|thought|antthinking)\b[^>]*>/gi;

function applyTrim(value: string, mode: ReasoningTagTrim): string {
  if (mode === "none") return value;
  if (mode === "start") return value.trimStart();
  return value.trim();
}

export function stripReasoningTagsFromText(
  text: string,
  options?: {
    mode?: ReasoningTagMode;
    trim?: ReasoningTagTrim;
  },
): string {
  if (!text) return text;
  if (!QUICK_TAG_RE.test(text)) return text;

  const mode = options?.mode ?? "strict";
  const trimMode = options?.trim ?? "both";

  let cleaned = text;
  if (FINAL_TAG_RE.test(cleaned)) {
    FINAL_TAG_RE.lastIndex = 0;
    cleaned = cleaned.replace(FINAL_TAG_RE, "");
  } else {
    FINAL_TAG_RE.lastIndex = 0;
  }

  // Collect all tag matches to check for proper pairing
  THINKING_TAG_RE.lastIndex = 0;
  const matches = [...cleaned.matchAll(THINKING_TAG_RE)];

  // Check if tags are properly paired (every open tag has a matching close)
  let openCount = 0;
  let firstOpenIdx: number | null = null;
  for (const match of matches) {
    const isClose = match[1] === "/";
    if (isClose) {
      if (openCount > 0) {
        openCount--;
      }
    } else {
      if (firstOpenIdx === null) {
        firstOpenIdx = match.index ?? 0;
      }
      openCount++;
    }
  }

  // If we end with unclosed tags and there's content before the first tag,
  // treat as literal text (user prose mentioning tags). This prevents data loss
  // when users discuss <think> tags in prose or code.
  // But if the first open tag is at the start (after trimming), treat as model
  // thinking output that was interrupted and strip it.
  if (openCount > 0 && mode !== "preserve") {
    const textBeforeFirstTag = firstOpenIdx !== null ? cleaned.slice(0, firstOpenIdx).trim() : "";
    if (textBeforeFirstTag.length > 0) {
      // Has content before the tag - likely prose mentioning the tag
      return applyTrim(cleaned, trimMode);
    }
    // Tag at start - likely model thinking output, continue with stripping
  }

  let result = "";
  let lastIndex = 0;
  let inThinking = false;

  for (const match of matches) {
    const idx = match.index ?? 0;
    const isClose = match[1] === "/";

    if (!inThinking) {
      result += cleaned.slice(lastIndex, idx);
      if (!isClose) {
        inThinking = true;
      }
    } else if (isClose) {
      inThinking = false;
    }

    lastIndex = idx + match[0].length;
  }

  if (!inThinking || mode === "preserve") {
    result += cleaned.slice(lastIndex);
  }

  return applyTrim(result, trimMode);
}
