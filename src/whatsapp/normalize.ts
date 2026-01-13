import { normalizeE164 } from "../utils.js";

function stripWhatsAppTargetPrefixes(value: string): string {
  let candidate = value.trim();
  for (;;) {
    const before = candidate;
    candidate = candidate
      .replace(/^whatsapp:/i, "")
      .replace(/^group:/i, "")
      .trim();
    if (candidate === before) return candidate;
  }
}

export function isWhatsAppGroupJid(value: string): boolean {
  const candidate = stripWhatsAppTargetPrefixes(value);
  const lower = candidate.toLowerCase();
  if (!lower.endsWith("@g.us")) return false;
  const localPart = candidate.slice(0, candidate.length - "@g.us".length);
  if (!localPart || localPart.includes("@")) return false;
  return /^[0-9]+(-[0-9]+)*$/.test(localPart);
}

/**
 * Check if value looks like a WhatsApp user JID (e.g. "41796666864:0@s.whatsapp.net" or "123@lid").
 */
export function isWhatsAppUserJid(value: string): boolean {
  const candidate = stripWhatsAppTargetPrefixes(value);
  const lower = candidate.toLowerCase();
  // User JIDs: 123456:0@s.whatsapp.net or 123456@s.whatsapp.net or 123@lid
  return lower.endsWith("@s.whatsapp.net") || lower.endsWith("@lid");
}

/**
 * Extract the phone number from a WhatsApp user JID.
 * "41796666864:0@s.whatsapp.net" -> "41796666864"
 * "123456@lid" -> "123456"
 */
function extractUserJidPhone(jid: string): string {
  // Remove @s.whatsapp.net or @lid suffix
  let localPart = jid.replace(/@s\.whatsapp\.net$/i, "").replace(/@lid$/i, "");
  // Remove device suffix like ":0" or ":123"
  localPart = localPart.replace(/:\d+$/, "");
  return localPart;
}

export function normalizeWhatsAppTarget(value: string): string | null {
  const candidate = stripWhatsAppTargetPrefixes(value);
  if (!candidate) return null;
  if (isWhatsAppGroupJid(candidate)) {
    const localPart = candidate.slice(0, candidate.length - "@g.us".length);
    return `${localPart}@g.us`;
  }
  // Handle user JIDs (e.g. "41796666864:0@s.whatsapp.net")
  if (isWhatsAppUserJid(candidate)) {
    const phone = extractUserJidPhone(candidate);
    const normalized = normalizeE164(phone);
    return normalized.length > 1 ? normalized : null;
  }
  const normalized = normalizeE164(candidate);
  return normalized.length > 1 ? normalized : null;
}
