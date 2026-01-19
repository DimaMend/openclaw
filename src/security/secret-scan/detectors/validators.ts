const MAX_VALUE_LENGTH = 200;
const FAKE_RE = /fake/i;
const TEMPLATE_RE = /\$\{[^}]+\}/;
const ALNUM_RE = /[A-Za-z0-9]/;

export function isLikelySecretValue(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (trimmed.length > MAX_VALUE_LENGTH) return false;
  if (!ALNUM_RE.test(trimmed)) return false;
  if (FAKE_RE.test(trimmed)) return false;
  if (TEMPLATE_RE.test(trimmed)) return false;
  return true;
}
