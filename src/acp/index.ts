/**
 * ACP Module
 *
 * Gateway-backed ACP (Agent Client Protocol) server for IDE integration.
 *
 * This module provides an ACP-compliant server that allows IDE clients
 * (VS Code, Cursor, etc.) to interact with Clawdis via the standardized
 * Agent Client Protocol.
 *
 * The server acts as a thin translator between ACP and the Clawdis Gateway,
 * delegating all agent work to a running Gateway instance.
 *
 * @example
 * ```ts
 * import { serveAcpGw } from "./acp/index.js";
 *
 * // Start the ACP server with default options
 * serveAcpGw({ verbose: true });
 * ```
 *
 * @module acp
 */

// Main server entry point
export { serveAcpGw } from "./server.js";

// Translator (for testing or custom integrations)
export { AcpGwAgent } from "./translator.js";

// Session management
export {
  createSession,
  getSession,
  deleteSession,
  cancelActiveRun,
} from "./session.js";

// Types
export { type AcpGwOptions, type AcpGwSession, ACP_GW_AGENT_INFO } from "./types.js";
