import type { Chat, Message, User } from "@grammyjs/types";

/** App-specific stream mode for Telegram draft streaming. */
export type TelegramStreamMode = "off" | "partial" | "block";

/**
 * Minimal context projection from Grammy's Context class.
 * Decouples the message processing pipeline from Grammy's full Context,
 * and allows constructing synthetic contexts for debounced/combined messages.
 */
export type TelegramContext = {
  message: Message;
  me?: { id?: number; username?: string };
  getFile: () => Promise<{ file_path?: string }>;
};

/**
 * Legacy forward metadata fields (deprecated in Telegram Bot API, removed from Grammy types).
 * Older messages may still carry these at runtime.
 */
export type TelegramLegacyForwardMetadata = {
  forward_from?: User;
  forward_from_chat?: Chat;
  forward_sender_name?: string;
  forward_signature?: string;
  forward_date?: number;
};

/** Message with both current and legacy forward metadata. */
export type TelegramMessageWithForwardMetadata = Message & TelegramLegacyForwardMetadata;

/** Telegram sticker metadata for context enrichment and caching. */
export interface StickerMetadata {
  /** Emoji associated with the sticker. */
  emoji?: string;
  /** Name of the sticker set the sticker belongs to. */
  setName?: string;
  /** Telegram file_id for sending the sticker back. */
  fileId?: string;
  /** Stable file_unique_id for cache deduplication. */
  fileUniqueId?: string;
  /** Cached description from previous vision processing (skip re-processing if present). */
  cachedDescription?: string;
}
