/**
 * Global proxy support for Node.js fetch (undici).
 *
 * Node.js native fetch does not respect http_proxy/https_proxy/all_proxy
 * (or no_proxy) environment variables by default. This module sets up a
 * global EnvHttpProxyAgent dispatcher so fetch respects those variables.
 */

import { EnvHttpProxyAgent, setGlobalDispatcher } from "undici";

let initialized = false;

/**
 * Initialize global proxy for fetch if proxy env vars are set.
 * Should be called early in the CLI entry point.
 */
export function initGlobalProxy(): void {
  if (initialized) return;
  initialized = true;

  const httpProxy = process.env.http_proxy || process.env.HTTP_PROXY;
  const httpsProxy = process.env.https_proxy || process.env.HTTPS_PROXY;
  const allProxy = process.env.all_proxy || process.env.ALL_PROXY;
  const noProxy = process.env.no_proxy || process.env.NO_PROXY;

  if (!httpProxy && !httpsProxy && !allProxy) return;

  try {
    const normalizedHttp = httpProxy?.replace(/^socks5h:\/\//, "socks5://");
    const normalizedHttps = httpsProxy?.replace(/^socks5h:\/\//, "socks5://");
    const normalizedAll = allProxy?.replace(/^socks5h:\/\//, "socks5://");

    const agent = new EnvHttpProxyAgent({
      httpProxy: normalizedHttp ?? normalizedAll,
      httpsProxy: normalizedHttps ?? normalizedAll,
      noProxy: noProxy || undefined,
    });
    setGlobalDispatcher(agent);
  } catch (err) {
    // Silently ignore proxy setup failures - fallback to direct connection
    // Log only in debug mode to avoid noise during normal operation
    if (process.env.DEBUG || process.env.CLAWDBOT_DEBUG) {
      console.warn("[global-proxy] Failed to initialize proxy:", err);
    }
  }
}
