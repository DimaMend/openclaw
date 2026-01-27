import process from "node:process";
import { ProxyAgent, setGlobalDispatcher } from "undici";
import { createSubsystemLogger } from "../logging/subsystem.js";

const log = createSubsystemLogger("proxy");

let initialized = false;

/**
 * Configures a global proxy dispatcher for Node.js native fetch.
 * This enables HTTP_PROXY/HTTPS_PROXY/http_proxy/https_proxy environment
 * variables to work with fetch() calls, including the Vercel AI SDK.
 *
 * Should be called early in the CLI/gateway startup.
 */
export function initGlobalProxy(): void {
  if (initialized) return;
  initialized = true;

  const proxyUrl =
    process.env.HTTPS_PROXY ||
    process.env.https_proxy ||
    process.env.HTTP_PROXY ||
    process.env.http_proxy;

  if (!proxyUrl) return;

  try {
    const agent = new ProxyAgent(proxyUrl);
    setGlobalDispatcher(agent);
    log.info(`global proxy configured: ${proxyUrl}`);
  } catch (err) {
    log.warn(`failed to configure global proxy: ${err instanceof Error ? err.message : err}`);
  }
}
