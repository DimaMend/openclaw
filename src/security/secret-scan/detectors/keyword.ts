import { isLikelySecretValue } from "./validators.js";
import type { RegexDetector } from "./types.js";

const KEYWORD_PATTERN = String.raw`\w*(?:api_?key|auth_?key|service_?key|account_?key|db_?key|database_?key|priv_?key|private_?key|client_?key|db_?pass|database_?pass|key_?pass|password|passwd|pwd|secret)\w*`;
const QUOTED_VALUE_PATTERNS = ['"([^"\\r\\n]+)"', "'([^'\\r\\n]+)'", "`([^`\\r\\n]+)`"];

const KEYWORD_ASSIGN_PREFIX = `\\b${KEYWORD_PATTERN}\\b(?:\\[[0-9]*\\])?\\s*(?::=|:|=|==|!=|===|!==)\\s*@?`;
const KEYWORD_COMPARE_SUFFIX = `\\s*(?:==|!=|===|!==)\\s*\\b${KEYWORD_PATTERN}\\b`;
const KEYWORD_CALL_PREFIX = `\\b${KEYWORD_PATTERN}\\b\\s*\\(\\s*`;
const KEYWORD_BARE_PREFIX = `\\b${KEYWORD_PATTERN}\\b\\s+`;

const KEYWORD_QUOTED_DETECTORS: RegexDetector[] = QUOTED_VALUE_PATTERNS.flatMap((valuePattern) => [
  {
    id: "keyword-assign-quoted",
    kind: "heuristic",
    confidence: "medium",
    pattern: `${KEYWORD_ASSIGN_PREFIX}${valuePattern}`,
    flags: "gi",
    group: 1,
    redact: "group",
    validator: isLikelySecretValue,
  },
  {
    id: "keyword-compare-reversed",
    kind: "heuristic",
    confidence: "medium",
    pattern: `${valuePattern}${KEYWORD_COMPARE_SUFFIX}`,
    flags: "gi",
    group: 1,
    groupPosition: "first",
    redact: "group",
    validator: isLikelySecretValue,
  },
  {
    id: "keyword-call-quoted",
    kind: "heuristic",
    confidence: "low",
    pattern: `${KEYWORD_CALL_PREFIX}${valuePattern}`,
    flags: "gi",
    group: 1,
    redact: "group",
    validator: isLikelySecretValue,
  },
  {
    id: "keyword-bare-quoted",
    kind: "heuristic",
    confidence: "low",
    pattern: `${KEYWORD_BARE_PREFIX}${valuePattern}`,
    flags: "gi",
    group: 1,
    redact: "group",
    validator: isLikelySecretValue,
  },
]);

export const keywordDetectors: RegexDetector[] = [
  ...KEYWORD_QUOTED_DETECTORS,
  {
    id: "keyword-assign-unquoted",
    kind: "heuristic",
    confidence: "medium",
    pattern: `\\b${KEYWORD_PATTERN}\\b(?:\\[[0-9]*\\])?\\s*(?::=|:|=|==|!=|===|!==)\\s*([^\\s,;\\)\\]]{2,})`,
    flags: "gi",
    group: 1,
    redact: "group",
    validator: isLikelySecretValue,
  },
];
