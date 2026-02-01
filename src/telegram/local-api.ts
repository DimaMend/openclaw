import type { TelegramAccountConfig } from "../config/types.js";

const TELEGRAM_API_BASE = "https://api.telegram.org";

/**
 * Strips trailing slashes from a URL string.
 * @param url - The URL to normalize, or undefined
 * @returns The normalized URL without trailing slashes, or undefined if input is undefined
 */
export function normalizeApiRoot(url: string | undefined): string | undefined {
  if (!url) {
    return url;
  }
  return url.replace(/\/+$/, "");
}

/**
 * Resolves the Telegram API root URL from config or environment.
 * Priority: config.localApiServer > env.TELEGRAM_LOCAL_API_SERVER > default
 * @param config - Optional Telegram account configuration
 * @returns The resolved API root URL
 */
export function resolveTelegramApiRoot(config?: TelegramAccountConfig): string {
  const configValue = config?.localApiServer;
  if (configValue) {
    const normalized = normalizeApiRoot(configValue);
    if (normalized) {
      return normalized;
    }
  }

  const envValue = process.env.TELEGRAM_LOCAL_API_SERVER;
  if (envValue) {
    const normalized = normalizeApiRoot(envValue);
    if (normalized) {
      return normalized;
    }
  }

  return TELEGRAM_API_BASE;
}

/**
 * Detects if a path is an absolute local file path.
 * Supports Unix paths (/) and Windows paths (C:\).
 * Does NOT support UNC paths (\\server\share) or file:// URLs.
 * @param path - The path to check
 * @returns true if the path is an absolute local file path
 */
export function isLocalApiPath(path: string): boolean {
  // Unix absolute path
  if (path.startsWith("/")) {
    return true;
  }

  // Windows absolute path (e.g., C:\, D:\)
  if (/^[A-Z]:\\/i.test(path)) {
    return true;
  }

  // NOT supported: UNC paths (\\server\share), file:// URLs
  return false;
}
