/**
 * ACP Session Manager
 *
 * Manages local session metadata for ACP clients. The actual conversation
 * state (messages, context) lives in the Gateway — this module only tracks
 * the mapping between ACP session IDs and Gateway session keys.
 *
 * Features:
 * - Session creation with unique IDs
 * - Optional persistence to disk for resume after restart
 * - Active run tracking for abort/cancel support
 * - RunId -> Session lookup for event correlation
 *
 * Session Isolation:
 * ACP sessions use the "acp:<uuid>" namespace in Gateway to avoid conflicts
 * with CLI or other clients using the same Gateway instance.
 *
 * @module acp/session
 */

import fs from "node:fs";
import path from "node:path";
import type { AcpGwSession, PersistedSession } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// State
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory session store.
 * Maps ACP sessionId -> session metadata.
 */
const sessions = new Map<string, AcpGwSession>();

/**
 * Reverse lookup: Gateway runId -> ACP sessionId.
 * Used to correlate Gateway events back to ACP sessions.
 */
const runIdToSessionId = new Map<string, string>();

/**
 * Path to session store file (null if persistence disabled).
 */
let storePath: string | null = null;

// ─────────────────────────────────────────────────────────────────────────────
// Initialization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Initialize session persistence.
 *
 * If a path is provided, sessions are loaded from disk on startup
 * and saved after each modification. This allows sessions to survive
 * server restarts.
 *
 * @param sessionStorePath - Path to the JSON session store file.
 *   If not provided, sessions are in-memory only.
 *
 * @example
 * ```ts
 * // Enable persistence
 * initSessionStore("~/.clawdis/acp-sessions.json");
 *
 * // Disable persistence (in-memory only)
 * initSessionStore();
 * ```
 */
export function initSessionStore(sessionStorePath?: string): void {
  if (!sessionStorePath) return;

  storePath = sessionStorePath;

  // Ensure the directory exists
  const dir = path.dirname(storePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing sessions (clears any in-memory state first)
  sessions.clear();
  runIdToSessionId.clear();

  if (fs.existsSync(storePath)) {
    try {
      const data = fs.readFileSync(storePath, "utf8");
      const persisted = JSON.parse(data) as PersistedSession[];
      for (const p of persisted) {
        // Restore session without active run state (can't persist AbortController)
        const session: AcpGwSession = {
          ...p,
          abortController: null,
          activeRunId: null,
        };
        sessions.set(p.sessionId, session);
      }
    } catch {
      // Ignore parse errors, start fresh
    }
  }
}

/**
 * Save all sessions to disk.
 *
 * Called automatically after session modifications.
 * Only saves if persistence is enabled.
 */
function saveSessionStore(): void {
  if (!storePath) return;

  // Convert to persistable format (no AbortController, no activeRunId)
  const persisted: PersistedSession[] = [];
  for (const session of sessions.values()) {
    persisted.push({
      sessionId: session.sessionId,
      sessionKey: session.sessionKey,
      cwd: session.cwd,
      createdAt: session.createdAt,
    });
  }

  try {
    fs.writeFileSync(storePath, JSON.stringify(persisted, null, 2));
  } catch {
    // Ignore write errors (disk full, permissions, etc.)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Session CRUD
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new session with a unique ID.
 *
 * Sessions are namespaced with "acp:" prefix in Gateway to avoid
 * conflicts with other clients.
 *
 * @param cwd - Working directory for the session (used for context)
 * @returns The created session
 *
 * @example
 * ```ts
 * const session = createSession("/home/user/project");
 * console.log(session.sessionId);    // "a1b2c3d4-..."
 * console.log(session.sessionKey);   // "acp:a1b2c3d4-..."
 * ```
 */
export function createSession(cwd: string): AcpGwSession {
  const sessionId = crypto.randomUUID();
  const session: AcpGwSession = {
    sessionId,
    sessionKey: `acp:${sessionId}`, // Namespace for Gateway isolation
    cwd,
    createdAt: Date.now(),
    abortController: null,
    activeRunId: null,
  };
  sessions.set(sessionId, session);
  saveSessionStore();
  return session;
}

/**
 * Get a session by its ACP session ID.
 *
 * @param sessionId - ACP session ID (UUID)
 * @returns The session if found, undefined otherwise
 */
export function getSession(sessionId: string): AcpGwSession | undefined {
  return sessions.get(sessionId);
}

/**
 * Get all active sessions.
 *
 * @returns Array of all sessions
 */
export function getAllSessions(): AcpGwSession[] {
  return Array.from(sessions.values());
}

/**
 * Delete a session.
 *
 * Aborts any active run before deletion.
 *
 * @param sessionId - ACP session ID to delete
 * @returns true if deleted, false if not found
 */
export function deleteSession(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session) {
    session.abortController?.abort();
    sessions.delete(sessionId);
    saveSessionStore();
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Active Run Management
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Set the active run for a session.
 *
 * Called when a prompt is sent. The runId is used to correlate
 * Gateway events back to this session, and the AbortController
 * allows cancellation.
 *
 * @param sessionId - ACP session ID
 * @param runId - Unique run ID (matches Gateway idempotencyKey)
 * @param abortController - Controller for aborting the run
 */
export function setActiveRun(
  sessionId: string,
  runId: string,
  abortController: AbortController,
): void {
  const session = sessions.get(sessionId);
  if (session) {
    session.activeRunId = runId;
    session.abortController = abortController;
    runIdToSessionId.set(runId, sessionId);
  }
}

/**
 * Find a session by its active run ID.
 *
 * Used to correlate Gateway events (which contain runId) back
 * to ACP sessions.
 *
 * @param runId - Gateway run ID
 * @returns The session if found, undefined otherwise
 */
export function getSessionByRunId(runId: string): AcpGwSession | undefined {
  const sessionId = runIdToSessionId.get(runId);
  return sessionId ? sessions.get(sessionId) : undefined;
}

/**
 * Clear the active run for a session.
 *
 * Called when a prompt completes (success or error).
 * Does not abort — just clears the tracking state.
 *
 * @param sessionId - ACP session ID
 */
export function clearActiveRun(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (session) {
    if (session.activeRunId) {
      runIdToSessionId.delete(session.activeRunId);
    }
    session.activeRunId = null;
    session.abortController = null;
  }
}

/**
 * Cancel the active run for a session.
 *
 * Aborts the AbortController and clears tracking state.
 *
 * @param sessionId - ACP session ID
 * @returns true if there was an active run to cancel
 */
export function cancelActiveRun(sessionId: string): boolean {
  const session = sessions.get(sessionId);
  if (session?.abortController) {
    session.abortController.abort();
    session.abortController = null;
    session.activeRunId = null;
    return true;
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Testing Utilities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Clear all sessions.
 *
 * Aborts any active runs and removes the session store file.
 * Primarily for testing.
 */
export function clearAllSessions(): void {
  for (const session of sessions.values()) {
    session.abortController?.abort();
  }
  sessions.clear();
  runIdToSessionId.clear();
  if (storePath && fs.existsSync(storePath)) {
    fs.unlinkSync(storePath);
  }
}
