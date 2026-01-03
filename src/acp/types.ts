/**
 * ACP Types
 *
 * Type definitions for the ACP (Agent Client Protocol) server implementation.
 *
 * @module acp/types
 */

/**
 * Local session state tracked by the ACP server.
 *
 * This represents the ACP-side view of a session. The actual conversation
 * history and context lives in the Gateway — we only track metadata needed
 * for request routing and abort handling.
 *
 * @property sessionId - Unique ACP session ID (UUID format)
 * @property sessionKey - Gateway session key with "acp:" namespace prefix
 * @property cwd - Working directory specified in newSession request
 * @property createdAt - Unix timestamp when session was created
 * @property abortController - Controller for cancelling in-flight prompts
 * @property activeRunId - Current prompt run ID (for Gateway event correlation)
 */
export type AcpGwSession = {
  /** Unique ACP session ID (UUID) */
  sessionId: string;

  /** Gateway session key, namespaced as "acp:<sessionId>" */
  sessionKey: string;

  /** Working directory from newSession request */
  cwd: string;

  /** Session creation timestamp (Unix ms) */
  createdAt: number;

  /** Abort controller for the current in-flight prompt (null if idle) */
  abortController: AbortController | null;

  /** Run ID for the current prompt (null if idle) */
  activeRunId: string | null;
};

/**
 * Configuration options for the ACP server.
 *
 * These can be set via CLI arguments or passed programmatically
 * to serveAcpGw().
 *
 * @example
 * ```ts
 * const opts: AcpGwOptions = {
 *   gatewayUrl: "ws://192.168.1.100:18789",
 *   gatewayToken: "secret",
 *   verbose: true,
 * };
 * serveAcpGw(opts);
 * ```
 */
export type AcpGwOptions = {
  /**
   * Gateway WebSocket URL.
   * @default "ws://127.0.0.1:18789"
   */
  gatewayUrl?: string;

  /**
   * Gateway authentication token.
   * Used for remote Gateway connections.
   */
  gatewayToken?: string;

  /**
   * Gateway authentication password.
   * Alternative to token-based auth.
   */
  gatewayPassword?: string;

  /**
   * Enable verbose logging to stderr.
   * Useful for debugging ACP ↔ Gateway translation.
   * @default false
   */
  verbose?: boolean;

  /**
   * Path to session persistence file.
   * If set, sessions survive server restarts.
   * @default "~/.clawdis/acp-sessions.json"
   */
  sessionStorePath?: string;
};

/**
 * Serializable session data for disk persistence.
 *
 * Excludes runtime-only fields (abortController, activeRunId)
 * that can't be serialized to JSON.
 */
export type PersistedSession = {
  /** ACP session ID */
  sessionId: string;
  /** Gateway session key */
  sessionKey: string;
  /** Working directory */
  cwd: string;
  /** Creation timestamp */
  createdAt: number;
};

/**
 * Agent info returned in ACP initialize response.
 *
 * Identifies this server to IDE clients.
 */
export const ACP_GW_AGENT_INFO = {
  /** Agent identifier */
  name: "clawdis-acp",
  /** Human-readable title */
  title: "Clawdis ACP Server",
  /** Version string */
  version: "1.0.0",
};
