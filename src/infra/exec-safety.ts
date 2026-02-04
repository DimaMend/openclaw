const SHELL_METACHARS = /[;&|`$<>]/;
const CONTROL_CHARS = /[\r\n]/;
const QUOTE_CHARS = /["']/;
const BARE_NAME_PATTERN = /^[A-Za-z0-9._+-]+$/;

function isLikelyPath(value: string): boolean {
  if (value.startsWith(".") || value.startsWith("~")) {
    return true;
  }
  if (value.includes("/") || value.includes("\\")) {
    return true;
  }
  return /^[A-Za-z]:[\\/]/.test(value);
}

export type CommandSubstitutionMatch = {
  type: "backtick" | "dollar-paren";
  match: string;
  index: number;
};

/**
 * Detects shell command substitution patterns in a command string.
 * These patterns (`...` or $(...)) execute embedded commands, which can
 * cause unintended code execution when agents construct commands containing
 * text with markdown code formatting or other backtick-containing content.
 */
export function detectCommandSubstitution(command: string): CommandSubstitutionMatch[] {
  const patterns: CommandSubstitutionMatch[] = [];

  // Match backtick command substitution: `...`
  const backtickRegex = /`[^`]+`/g;
  let match: RegExpExecArray | null;
  while ((match = backtickRegex.exec(command)) !== null) {
    patterns.push({
      type: "backtick",
      match: match[0],
      index: match.index,
    });
  }

  // Match $() command substitution (handles nested parens poorly, but catches common cases)
  const dollarParenRegex = /\$\([^)]+\)/g;
  while ((match = dollarParenRegex.exec(command)) !== null) {
    patterns.push({
      type: "dollar-paren",
      match: match[0],
      index: match.index,
    });
  }

  return patterns;
}

export function isSafeExecutableValue(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  if (trimmed.includes("\0")) {
    return false;
  }
  if (CONTROL_CHARS.test(trimmed)) {
    return false;
  }
  if (SHELL_METACHARS.test(trimmed)) {
    return false;
  }
  if (QUOTE_CHARS.test(trimmed)) {
    return false;
  }

  if (isLikelyPath(trimmed)) {
    return true;
  }
  if (trimmed.startsWith("-")) {
    return false;
  }
  return BARE_NAME_PATTERN.test(trimmed);
}
