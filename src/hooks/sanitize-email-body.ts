/**
 * Sanitise raw HTML email bodies into clean plain text.
 *
 * Strips HTML tags, CSS, scripts, tracking pixels, email footers,
 * base64 data URIs, and excessive whitespace so the body is compact
 * and ready for LLM consumption.
 */

// ---------------------------------------------------------------------------
// Footer / boilerplate patterns (case-insensitive)
// ---------------------------------------------------------------------------
const FOOTER_PATTERNS: RegExp[] = [
  // Unsubscribe / manage preferences
  /unsubscribe\b.{0,200}/gi,
  /manage\s+(?:your\s+)?(?:email\s+)?preferences?.{0,100}/gi,
  /opt[\s-]?out\b.{0,100}/gi,
  /email\s+preferences?.{0,80}/gi,
  /update\s+(?:your\s+)?subscription.{0,80}/gi,
  /you\s+(?:are\s+)?receiv(?:ed?|ing)\s+this\s+(?:email|message)\s+because.{0,300}/gi,
  /this\s+(?:email|message)\s+was\s+sent\s+(?:to|by).{0,200}/gi,
  /if\s+you\s+no\s+longer\s+wish\s+to\s+receive.{0,200}/gi,
  /to\s+stop\s+receiving\s+these\s+(?:emails|notifications|messages).{0,200}/gi,

  // "Sent from" signatures
  /sent\s+from\s+(?:my\s+)?(?:iphone|ipad|galaxy|android|samsung|pixel|outlook|mail).{0,60}/gi,
  /get\s+outlook\s+for\s+(?:ios|android).{0,40}/gi,

  // Privacy / legal
  /this\s+(?:email|message)\s+(?:and\s+any\s+attachments?\s+)?(?:is|are)\s+(?:intended\s+)?(?:solely\s+)?(?:for\s+the\s+use\s+of).{0,500}/gi,
  /confidential(?:ity)?\s+notice.{0,400}/gi,
  /disclaimer:.{0,400}/gi,
  /©\s*\d{4}.{0,120}/gi,
  /all\s+rights\s+reserved\.?/gi,
  /privacy\s+policy/gi,
  /terms\s+(?:of\s+(?:service|use)|and\s+conditions)/gi,
];

// ---------------------------------------------------------------------------
// Core sanitiser
// ---------------------------------------------------------------------------

export function sanitizeEmailBody(html: string): string {
  if (!html || typeof html !== "string") return "";

  let text = html;

  // 1. Remove <style> blocks (including contents)
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style\s*>/gi, "");

  // 2. Remove <script> blocks
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script\s*>/gi, "");

  // 3. Remove HTML comments
  text = text.replace(/<!--[\s\S]*?-->/g, "");

  // 4. Remove tracking pixels / invisible images (1x1, hidden, display:none)
  text = text.replace(
    /<img[^>]*(?:width\s*=\s*["']?1["']?|height\s*=\s*["']?1["']?|display\s*:\s*none)[^>]*\/?>/gi,
    "",
  );

  // 5. Remove all data URIs and base64 images
  text = text.replace(/data:[^;]+;base64,[A-Za-z0-9+/=]+/g, "");
  text = text.replace(/src\s*=\s*["']data:[^"']*["']/gi, "");

  // 6. Convert <br> and block-level tags to newlines
  text = text.replace(/<br\s*\/?>/gi, "\n");
  text = text.replace(
    /<\/(?:p|div|tr|li|h[1-6]|blockquote|section|article|header|footer|table|thead|tbody)>/gi,
    "\n",
  );
  text = text.replace(
    /<(?:p|div|tr|li|h[1-6]|blockquote|section|article|header|footer|hr)[^>]*>/gi,
    "\n",
  );

  // 7. Convert <a href="...">text</a> to text (URL)
  text = text.replace(
    /<a\s[^>]*href\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a\s*>/gi,
    (_m, href: string, inner: string) => {
      const linkText = inner.replace(/<[^>]*>/g, "").trim();
      if (!linkText) return "";
      // Skip if href is a tracking/unsubscribe link or same as text
      if (href === linkText) return linkText;
      if (/unsubscribe|optout|opt-out|manage.preferences/i.test(href)) return "";
      return linkText;
    },
  );

  // 8. Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // 9. Decode HTML entities
  text = decodeHtmlEntities(text);

  // 10. Remove footer / boilerplate patterns
  for (const pattern of FOOTER_PATTERNS) {
    text = text.replace(pattern, "");
  }

  // 11. Collapse whitespace
  // Replace tabs and multiple spaces (but not newlines) with single space
  text = text.replace(/[^\S\n]+/g, " ");
  // Trim each line
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  // Collapse 3+ consecutive newlines to 2
  text = text.replace(/\n{3,}/g, "\n\n");
  // Trim leading/trailing whitespace
  text = text.trim();

  return text;
}

// ---------------------------------------------------------------------------
// HTML entity decoder (no dependency needed for common entities)
// ---------------------------------------------------------------------------

const ENTITY_MAP: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
  "&ndash;": "–",
  "&mdash;": "—",
  "&lsquo;": "\u2018",
  "&rsquo;": "\u2019",
  "&ldquo;": "\u201C",
  "&rdquo;": "\u201D",
  "&bull;": "•",
  "&hellip;": "…",
  "&copy;": "©",
  "&reg;": "®",
  "&trade;": "™",
  "&euro;": "€",
  "&pound;": "£",
  "&yen;": "¥",
  "&cent;": "¢",
  "&deg;": "°",
  "&times;": "×",
  "&divide;": "÷",
  "&para;": "¶",
  "&sect;": "§",
  "&laquo;": "«",
  "&raquo;": "»",
};

function decodeHtmlEntities(text: string): string {
  // Named entities
  let result = text.replace(/&[a-zA-Z]+;/g, (entity) => {
    return ENTITY_MAP[entity.toLowerCase()] ?? entity;
  });

  // Numeric decimal entities: &#123;
  result = result.replace(/&#(\d+);/g, (_m, code: string) => {
    const num = Number.parseInt(code, 10);
    if (num > 0 && num < 0x110000) {
      return String.fromCodePoint(num);
    }
    return _m;
  });

  // Numeric hex entities: &#x1F4A9;
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_m, hex: string) => {
    const num = Number.parseInt(hex, 16);
    if (num > 0 && num < 0x110000) {
      return String.fromCodePoint(num);
    }
    return _m;
  });

  return result;
}
