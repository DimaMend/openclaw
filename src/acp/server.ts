#!/usr/bin/env node
/**
 * ACP Server Entry Point
 *
 * Gateway-backed ACP (Agent Client Protocol) server. This process:
 * - Speaks ACP over stdio to IDE clients (VS Code, Cursor, etc.)
 * - Delegates all agent work to a running Clawdis Gateway via WebSocket
 *
 * The server acts as a thin protocol translator, converting ACP JSON-RPC
 * messages to Gateway RPC calls and streaming responses back.
 *
 * Architecture:
 * ```
 * IDE <--stdio/ACP--> server.ts <--WebSocket--> Gateway <---> Agent Runtime
 * ```
 *
 * Usage:
 *   clawdis-acp [options]
 *
 * @module acp/server
 */

import { Readable, Writable } from "node:stream";

import { AgentSideConnection, ndJsonStream } from "@agentclientprotocol/sdk";

import { GatewayClient } from "../gateway/client.js";
import { initSessionStore } from "./session.js";
import { AcpGwAgent } from "./translator.js";
import type { AcpGwOptions } from "./types.js";

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

/** Default Gateway WebSocket URL (local) */
const DEFAULT_GATEWAY_URL = "ws://127.0.0.1:18789";

/** Default session persistence file */
const DEFAULT_SESSION_STORE = "~/.clawdis/acp-sessions.json";

/** Base delay for exponential backoff reconnection (ms) */
const RECONNECT_DELAY_MS = 2000;

/** Maximum reconnection attempts before giving up */
const MAX_RECONNECT_ATTEMPTS = 5;

// ─────────────────────────────────────────────────────────────────────────────
// Server
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Start the ACP server.
 *
 * This function:
 * 1. Initializes session persistence (if enabled)
 * 2. Connects to the Gateway via WebSocket
 * 3. Sets up the ACP connection over stdio
 * 4. Handles Gateway disconnection with auto-reconnect
 *
 * The server runs until the process is terminated.
 *
 * @param opts - Server configuration options
 *
 * @example
 * ```ts
 * // Start with defaults
 * serveAcpGw();
 *
 * // Start with custom Gateway
 * serveAcpGw({
 *   gatewayUrl: "wss://remote-host:18789",
 *   gatewayToken: "auth-token",
 *   verbose: true,
 * });
 * ```
 */
export function serveAcpGw(opts: AcpGwOptions = {}): void {
  // Logger (no-op if verbose=false)
  const log = opts.verbose
    ? (msg: string) => process.stderr.write(`[acp] ${msg}\n`)
    : () => {};

  // ─── Session Persistence ───────────────────────────────────────────────

  /**
   * Resolve ~ to home directory in paths.
   */
  function resolveStorePath(p: string): string {
    if (p.startsWith("~")) {
      return p.replace("~", process.env.HOME ?? "");
    }
    return p;
  }

  // Initialize session store
  // Empty string means explicitly disabled, undefined means use default
  const storePath =
    opts.sessionStorePath === ""
      ? null
      : resolveStorePath(opts.sessionStorePath ?? DEFAULT_SESSION_STORE);

  if (storePath) {
    initSessionStore(storePath);
    log(`session store: ${storePath}`);
  } else {
    log("session persistence disabled");
  }

  // ─── Gateway Connection ────────────────────────────────────────────────

  const gatewayUrl = opts.gatewayUrl ?? DEFAULT_GATEWAY_URL;
  log(`connecting to gateway: ${gatewayUrl}`);

  /** The ACP translator agent */
  let agent: AcpGwAgent | null = null;

  /** Current Gateway client (replaced on reconnect) */
  let gateway: GatewayClient | null = null;

  /** Number of reconnection attempts since last success */
  let reconnectAttempts = 0;

  /** Timer for scheduled reconnection */
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * Create a new Gateway client with event handlers.
   */
  const createGatewayClient = (): GatewayClient => {
    return new GatewayClient({
      url: gatewayUrl,
      token: opts.gatewayToken,
      password: opts.gatewayPassword,
      clientName: "acp",
      clientVersion: "1.0.0",
      mode: "acp",

      onHelloOk: (hello) => {
        log(`gateway connected: protocol=${hello.protocol}`);
        reconnectAttempts = 0; // Reset counter on successful connection
        if (agent) {
          agent.handleGatewayReconnect();
        }
      },

      onClose: (code, reason) => {
        log(`gateway disconnected: ${code} ${reason}`);
        agent?.handleGatewayDisconnect(`${code}: ${reason}`);

        // Attempt reconnection for non-intentional closes
        // 1000 = normal close, 1001 = going away
        if (code !== 1000 && code !== 1001) {
          scheduleReconnect();
        }
      },

      onEvent: (evt) => {
        // Forward all Gateway events to the translator
        void agent?.handleGatewayEvent(evt);
      },
    });
  };

  /**
   * Schedule a reconnection attempt with exponential backoff.
   */
  const scheduleReconnect = (): void => {
    // Don't schedule if already scheduled
    if (reconnectTimer) return;

    // Give up after max attempts
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      log(
        `max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, giving up`,
      );
      return;
    }

    reconnectAttempts++;
    const delay = RECONNECT_DELAY_MS * reconnectAttempts; // Linear backoff

    log(
      `scheduling reconnect attempt ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`,
    );

    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      log(`attempting reconnect...`);

      // Create new client and swap it in
      gateway = createGatewayClient();
      if (agent) {
        agent.updateGateway(gateway);
      }
      gateway.start();
    }, delay);
  };

  // Create initial Gateway client
  gateway = createGatewayClient();

  // ─── ACP Connection Setup ──────────────────────────────────────────────

  // Convert Node.js streams to Web Streams for the ACP SDK
  const input = Writable.toWeb(process.stdout);
  const output = Readable.toWeb(process.stdin) as ReadableStream<Uint8Array>;
  const stream = ndJsonStream(input, output);

  // Create the ACP connection with the translator agent
  new AgentSideConnection((conn) => {
    agent = new AcpGwAgent(conn, gateway!, opts);
    agent.start();
    return agent;
  }, stream);

  // Start the Gateway connection
  gateway.start();

  log("acp server ready");
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse command-line arguments into options.
 *
 * Supports both long and short forms for common options.
 *
 * @param args - Arguments from process.argv (excluding node and script)
 * @returns Parsed options
 */
function parseArgs(args: string[]): AcpGwOptions {
  const opts: AcpGwOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if ((arg === "--gateway-url" || arg === "--url") && args[i + 1]) {
      opts.gatewayUrl = args[++i];
    } else if (
      (arg === "--gateway-token" || arg === "--token") &&
      args[i + 1]
    ) {
      opts.gatewayToken = args[++i];
    } else if (
      (arg === "--gateway-password" || arg === "--password") &&
      args[i + 1]
    ) {
      opts.gatewayPassword = args[++i];
    } else if (arg === "--verbose" || arg === "-v") {
      opts.verbose = true;
    } else if (arg === "--session-store" && args[i + 1]) {
      opts.sessionStorePath = args[++i];
    } else if (arg === "--no-session-store") {
      opts.sessionStorePath = ""; // Empty string = disabled
    } else if (arg === "--cwd" && args[i + 1]) {
      // Ignored for compatibility (cwd comes from session/new request)
      i++;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return opts;
}

/**
 * Print CLI help text.
 */
function printHelp(): void {
  console.log(`Usage: clawdis-acp [options]

Gateway-backed ACP server for IDE integration.

Options:
  --gateway-url <url>      Gateway WebSocket URL (default: ws://127.0.0.1:18789)
  --gateway-token <token>  Gateway auth token
  --gateway-password <pw>  Gateway auth password
  --session-store <path>   Session persistence file (default: ~/.clawdis/acp-sessions.json)
  --no-session-store       Disable session persistence
  --verbose, -v            Enable verbose logging to stderr
  --help, -h               Show this help message

Examples:
  clawdis-acp
  clawdis-acp --gateway-url wss://remote:18789 --gateway-token secret
  clawdis-acp --verbose
  clawdis-acp --no-session-store
`);
}

/**
 * CLI entry point.
 *
 * Parses arguments and starts the server.
 */
function main(): void {
  const opts = parseArgs(process.argv.slice(2));
  serveAcpGw(opts);
}

// Run if executed directly
main();
