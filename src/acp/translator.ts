/**
 * ACP Translator
 *
 * Implements the ACP Agent interface by translating protocol messages
 * to Clawdis Gateway RPC calls. This is the core bridge between IDE clients
 * (via ACP) and the Clawdis agent runtime (via Gateway WebSocket).
 *
 * Key responsibilities:
 * - Handle ACP lifecycle (initialize, newSession, authenticate)
 * - Translate prompt requests to Gateway chat.send calls
 * - Stream Gateway responses back as ACP session updates
 * - Handle tool call events and cancellation
 *
 * @module acp/translator
 */

import type {
  Agent,
  AgentSideConnection,
  AuthenticateRequest,
  AuthenticateResponse,
  CancelNotification,
  ContentBlock,
  ImageContent,
  InitializeRequest,
  InitializeResponse,
  LoadSessionRequest,
  LoadSessionResponse,
  NewSessionRequest,
  NewSessionResponse,
  PromptRequest,
  PromptResponse,
  SetSessionModeRequest,
  SetSessionModeResponse,
  TextContent,
} from "@agentclientprotocol/sdk";
import { PROTOCOL_VERSION } from "@agentclientprotocol/sdk";

import type { EventFrame } from "../gateway/protocol/index.js";

/**
 * ACP StopReason type.
 * Inlined to avoid subpath import issues with the ACP SDK.
 */
type StopReason =
  | "end_turn"
  | "max_tokens"
  | "max_turn_requests"
  | "refusal"
  | "cancelled";

import type { GatewayClient } from "../gateway/client.js";
import {
  cancelActiveRun,
  clearActiveRun,
  createSession,
  getSession,
  getSessionByRunId,
  setActiveRun,
} from "./session.js";
import { ACP_GW_AGENT_INFO, type AcpGwOptions } from "./types.js";

/**
 * Tracks state for an in-flight prompt request.
 *
 * When a prompt is sent to the Gateway, we store metadata here to:
 * - Correlate Gateway events back to the ACP session
 * - Track cumulative text for delta streaming
 * - Detect and skip duplicate text from Gateway bugs
 */
type PendingPrompt = {
  /** ACP session ID */
  sessionId: string;
  /** Unique key for this prompt (used as Gateway runId) */
  idempotencyKey: string;
  /** Resolves the prompt Promise when complete */
  resolve: (response: PromptResponse) => void;
  /** Rejects the prompt Promise on error */
  reject: (err: Error) => void;
  /** Cumulative length of text sent to client (for delta calculation) */
  sentTextLength?: number;
  /** Actual text sent so far (for duplicate detection) */
  sentText?: string;
};

/**
 * Gateway-backed ACP Agent implementation.
 *
 * This class implements the ACP Agent interface, allowing IDE clients
 * to interact with Clawdis via the standardized Agent Client Protocol.
 *
 * Architecture:
 * ```
 * IDE Client <--ACP/stdio--> AcpGwAgent <--WebSocket--> Gateway <---> Agent Runtime
 * ```
 *
 * The translator handles:
 * - Protocol negotiation (initialize)
 * - Session creation with isolated namespacing (acp:<uuid>)
 * - Prompt/response with streaming text deltas
 * - Tool call event streaming
 * - Cancellation
 *
 * @example
 * ```ts
 * const agent = new AcpGwAgent(connection, gateway, { verbose: true });
 * agent.start();
 *
 * // ACP SDK handles the rest via the connection
 * ```
 */
export class AcpGwAgent implements Agent {
  /** ACP connection for sending updates to the client */
  private connection: AgentSideConnection;

  /** Gateway client for RPC calls */
  private gateway: GatewayClient;

  /** Configuration options */
  private opts: AcpGwOptions;

  /** Whether the Gateway connection is active */
  private connected = false;

  /** Logger function (no-op if verbose=false) */
  private log: (msg: string) => void;

  /** Map of sessionId -> pending prompt state */
  private pendingPrompts = new Map<string, PendingPrompt>();

  /**
   * Create a new ACP-Gateway translator.
   *
   * @param connection - ACP connection to the IDE client
   * @param gateway - Gateway client for backend communication
   * @param opts - Configuration options
   */
  constructor(
    connection: AgentSideConnection,
    gateway: GatewayClient,
    opts: AcpGwOptions = {},
  ) {
    this.connection = connection;
    this.gateway = gateway;
    this.opts = opts;
    this.log = opts.verbose
      ? (msg: string) => process.stderr.write(`[acp] ${msg}\n`)
      : () => {};
  }

  /**
   * Start the translator.
   *
   * Marks the translator as connected and ready to handle events.
   * The Gateway client should already be started before calling this.
   */
  start(): void {
    this.connected = true;
    this.log("translator started");
  }

  /**
   * Update the Gateway client reference.
   *
   * Used during reconnection to swap in a new Gateway client
   * without disrupting session state.
   *
   * @param gateway - New Gateway client instance
   */
  updateGateway(gateway: GatewayClient): void {
    this.gateway = gateway;
    this.log("gateway client updated");
  }

  /**
   * Handle Gateway reconnection.
   *
   * Called when the Gateway WebSocket reconnects after a disconnect.
   * Marks the translator as connected again.
   */
  handleGatewayReconnect(): void {
    this.connected = true;
    this.log("gateway reconnected");
  }

  /**
   * Handle Gateway disconnection.
   *
   * Called when the Gateway WebSocket closes unexpectedly.
   * Rejects all pending prompts with a disconnect error.
   *
   * @param reason - Human-readable disconnect reason
   */
  handleGatewayDisconnect(reason: string): void {
    this.connected = false;
    this.log(`gateway disconnected: ${reason}`);

    // Reject all pending prompts so the IDE client gets an error
    for (const [sessionId, pending] of this.pendingPrompts) {
      this.log(`rejecting pending prompt for session ${sessionId}`);
      pending.reject(new Error(`Gateway disconnected: ${reason}`));
      clearActiveRun(sessionId);
    }
    this.pendingPrompts.clear();
  }

  /**
   * Handle Gateway events and translate to ACP session updates.
   *
   * The Gateway emits two types of events we care about:
   * - `agent`: Tool call lifecycle events (start, result)
   * - `chat`: Response streaming and completion events
   *
   * @param evt - Gateway event frame
   */
  async handleGatewayEvent(evt: EventFrame): Promise<void> {
    this.log(
      `event: ${evt.event} payload=${JSON.stringify(evt.payload).slice(0, 200)}`,
    );

    if (evt.event === "agent") {
      await this.handleAgentEvent(evt);
    }
    if (evt.event === "chat") {
      await this.handleChatEvent(evt);
    }
  }

  /**
   * Handle agent events (tool calls).
   *
   * Translates Gateway tool lifecycle events to ACP tool_call updates:
   * - phase=start -> tool_call with status=running
   * - phase=result -> tool_call_update with status=completed/error
   *
   * @param evt - Gateway agent event
   */
  private async handleAgentEvent(evt: EventFrame): Promise<void> {
    const payload = evt.payload as Record<string, unknown> | undefined;
    if (!payload) return;

    const runId = payload.runId as string | undefined;
    const stream = payload.stream as string | undefined;
    const data = payload.data as Record<string, unknown> | undefined;

    if (!runId || !data) return;

    // Find session by runId (set during prompt)
    const session = getSessionByRunId(runId);
    if (!session) return;

    // Handle tool events
    if (stream === "tool") {
      const phase = data.phase as string | undefined;
      const name = data.name as string | undefined;
      const toolCallId = data.toolCallId as string | undefined;

      if (!toolCallId) return;

      if (phase === "start") {
        await this.connection.sessionUpdate({
          sessionId: session.sessionId,
          update: {
            sessionUpdate: "tool_call",
            toolCallId,
            title: name ?? "tool",
            status: "running",
          },
        });
      } else if (phase === "result") {
        const isError = data.isError as boolean | undefined;
        await this.connection.sessionUpdate({
          sessionId: session.sessionId,
          update: {
            sessionUpdate: "tool_call_update",
            toolCallId,
            status: isError ? "error" : "completed",
          },
        });
      }
    }
  }

  /**
   * Handle chat events (streaming and completion).
   *
   * The Gateway sends chat events with different states:
   * - delta: Streaming text (cumulative, we diff it)
   * - final/done: Prompt completed successfully
   * - error: Prompt failed
   * - aborted: Prompt was cancelled
   *
   * For delta events, we calculate the diff between cumulative text
   * and what we've already sent, then stream only the new portion.
   * This handles the Gateway's cumulative streaming model.
   *
   * @param evt - Gateway chat event
   */
  private async handleChatEvent(evt: EventFrame): Promise<void> {
    const payload = evt.payload as Record<string, unknown> | undefined;
    if (!payload) return;

    const sessionKey = payload.sessionKey as string | undefined;
    const state = payload.state as string | undefined;
    const messageData = payload.message as Record<string, unknown> | undefined;

    this.log(`handleChatEvent: sessionKey=${sessionKey} state=${state}`);

    if (!sessionKey) return;

    // Find the pending prompt for this session
    const pending = this.findPendingBySessionKey(sessionKey);
    if (!pending) {
      this.log(`handleChatEvent: no pending for sessionKey=${sessionKey}`);
      return;
    }

    const { sessionId } = pending;

    // Handle streaming text deltas
    if (state === "delta" && messageData) {
      await this.handleDeltaEvent(sessionId, messageData);
      return;
    }

    // Handle completion states
    if (
      state === "final" ||
      state === "done" ||
      state === "error" ||
      state === "aborted"
    ) {
      this.log(`chat completed: state=${state} sessionId=${sessionId}`);
      this.pendingPrompts.delete(sessionId);
      clearActiveRun(sessionId);

      // Map Gateway state to ACP StopReason
      const stopReason: StopReason =
        state === "final" || state === "done"
          ? "end_turn"
          : state === "aborted"
            ? "cancelled"
            : "refusal";

      pending.resolve({ stopReason });
    }
  }

  /**
   * Handle a delta (streaming) event.
   *
   * Gateway sends cumulative text in each delta event. We track how much
   * we've sent and only forward the new portion to the client. This also
   * includes duplicate detection for a Gateway bug where the full response
   * sometimes appears twice.
   *
   * @param sessionId - ACP session ID
   * @param messageData - Message payload with content array
   */
  private async handleDeltaEvent(
    sessionId: string,
    messageData: Record<string, unknown>,
  ): Promise<void> {
    const content = messageData.content as
      | Array<{ type: string; text?: string }>
      | undefined;
    const fullText = content?.find((c) => c.type === "text")?.text ?? "";

    const actualPending = this.pendingPrompts.get(sessionId);
    if (!actualPending) return;

    const sentSoFar = actualPending.sentTextLength ?? 0;
    const sentText = actualPending.sentText ?? "";

    // Only send new text
    if (fullText.length > sentSoFar) {
      const newText = fullText.slice(sentSoFar);

      // Workaround: Detect and skip duplicate text (Gateway bug)
      // If the "new" text starts with what we already sent, it's a duplicate
      if (
        sentText.length > 0 &&
        newText.startsWith(sentText.slice(0, Math.min(20, sentText.length)))
      ) {
        this.log(`skipping duplicate: newText starts with already-sent content`);
        return;
      }

      // Update tracking state
      actualPending.sentTextLength = fullText.length;
      actualPending.sentText = fullText;

      this.log(`streaming delta: +${newText.length} chars`);

      // Send the delta to the client
      await this.connection.sessionUpdate({
        sessionId,
        update: {
          sessionUpdate: "agent_message_chunk",
          content: { type: "text", text: newText },
        },
      });
    }
  }

  /**
   * Find a pending prompt by Gateway session key.
   *
   * @param sessionKey - Gateway session key (acp:<uuid>)
   * @returns Pending prompt state if found
   */
  private findPendingBySessionKey(sessionKey: string): PendingPrompt | undefined {
    this.log(
      `findPending: looking for sessionKey=${sessionKey}, pendingCount=${this.pendingPrompts.size}`,
    );
    for (const [sessionId, pending] of this.pendingPrompts) {
      const session = getSession(sessionId);
      this.log(
        `  checking sessionId=${sessionId} -> session.sessionKey=${session?.sessionKey}`,
      );
      if (session?.sessionKey === sessionKey) {
        return pending;
      }
    }
    return undefined;
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // ACP Agent Interface Methods
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Initialize the agent (ACP lifecycle).
   *
   * Returns agent capabilities and info. Called once when the
   * IDE client connects.
   *
   * @param _params - Initialize request (unused, capabilities are fixed)
   * @returns Agent capabilities, protocol version, and agent info
   */
  async initialize(_params: InitializeRequest): Promise<InitializeResponse> {
    this.log("initialize");
    return {
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: {
          image: true,
          audio: false,
          embeddedContext: true,
        },
        mcpCapabilities: {
          http: false,
          sse: false,
        },
      },
      agentInfo: ACP_GW_AGENT_INFO,
      authMethods: [],
    };
  }

  /**
   * Create a new session (ACP lifecycle).
   *
   * Creates a local session record and returns a unique session ID.
   * The session is namespaced as "acp:<uuid>" in the Gateway to avoid
   * conflicts with other clients.
   *
   * Note: MCP servers from the request are ignored — the Gateway handles
   * tool availability.
   *
   * @param params - Session parameters including working directory
   * @returns New session ID
   */
  async newSession(params: NewSessionRequest): Promise<NewSessionResponse> {
    const session = createSession(params.cwd);
    this.log(`newSession: ${session.sessionId} (cwd: ${params.cwd})`);
    return { sessionId: session.sessionId };
  }

  /**
   * Handle authentication (ACP lifecycle).
   *
   * No authentication required — the Gateway handles auth separately.
   *
   * @param _params - Auth request (unused)
   * @returns Empty response (success)
   */
  async authenticate(
    _params: AuthenticateRequest,
  ): Promise<AuthenticateResponse | undefined> {
    return {};
  }

  /**
   * Handle session mode changes.
   *
   * Maps the ACP modeId to a Gateway thinking level (e.g., "high" for
   * extended thinking). This is best-effort — errors are logged but
   * don't fail the request.
   *
   * @param params - Mode change request with sessionId and modeId
   * @returns Empty response (success)
   */
  async setSessionMode(
    params: SetSessionModeRequest,
  ): Promise<SetSessionModeResponse> {
    const session = getSession(params.sessionId);
    if (!session) {
      throw new Error(`Session ${params.sessionId} not found`);
    }

    const modeId = params.modeId;
    if (modeId) {
      try {
        await this.gateway.request("sessions.patch", {
          sessionKey: session.sessionKey,
          thinkingLevel: modeId,
        });
        this.log(`setSessionMode: ${session.sessionId} -> ${modeId}`);
      } catch (err) {
        this.log(`setSessionMode error: ${String(err)}`);
      }
    }

    return {};
  }

  /**
   * Handle a prompt request.
   *
   * Sends the user's message to the Gateway and waits for completion.
   * Text is streamed back via handleChatEvent as delta updates.
   *
   * The prompt includes:
   * - Working directory context prefix
   * - Extracted text from content blocks
   * - Image attachments (base64)
   *
   * @param params - Prompt request with session ID and content
   * @returns Promise that resolves when the agent finishes responding
   */
  async prompt(params: PromptRequest): Promise<PromptResponse> {
    const session = getSession(params.sessionId);
    if (!session) {
      throw new Error(`Session ${params.sessionId} not found`);
    }

    // Cancel any existing prompt for this session
    if (session.abortController) {
      cancelActiveRun(params.sessionId);
    }

    // Set up abort handling
    const abortController = new AbortController();
    const runId = crypto.randomUUID();
    setActiveRun(params.sessionId, runId, abortController);

    // Extract content from the prompt
    const userText = this.extractTextFromPrompt(params.prompt);
    const attachments = this.extractAttachmentsFromPrompt(params.prompt);

    // Prepend working directory for context
    const cwdContext = `[Working directory: ${session.cwd}]\n\n`;
    const message = cwdContext + userText;

    this.log(
      `prompt: ${session.sessionId} -> "${userText.slice(0, 50)}..." (${attachments.length} attachments)`,
    );

    return new Promise<PromptResponse>((resolve, reject) => {
      // Track this prompt for event correlation
      this.pendingPrompts.set(params.sessionId, {
        sessionId: params.sessionId,
        idempotencyKey: runId,
        resolve,
        reject,
      });

      // Send to Gateway
      this.gateway
        .request(
          "chat.send",
          {
            sessionKey: session.sessionKey,
            message,
            attachments: attachments.length > 0 ? attachments : undefined,
            idempotencyKey: runId,
          },
          { expectFinal: true },
        )
        .catch((err) => {
          // Clean up on error
          this.pendingPrompts.delete(params.sessionId);
          clearActiveRun(params.sessionId);
          reject(err);
        });
    });
  }

  /**
   * Cancel an in-progress prompt.
   *
   * Aborts the local AbortController and sends a chat.abort to the Gateway.
   * The pending promise is resolved with stopReason="cancelled".
   *
   * Safe to call even if no prompt is active.
   *
   * @param params - Cancel notification with session ID
   */
  async cancel(params: CancelNotification): Promise<void> {
    const session = getSession(params.sessionId);
    if (!session) return;

    this.log(`cancel: ${params.sessionId}`);

    // Abort locally
    cancelActiveRun(params.sessionId);

    // Tell Gateway to abort
    try {
      await this.gateway.request("chat.abort", {
        sessionKey: session.sessionKey,
      });
    } catch (err) {
      this.log(`cancel error: ${String(err)}`);
    }

    // Resolve the pending promise
    const pending = this.pendingPrompts.get(params.sessionId);
    if (pending) {
      this.pendingPrompts.delete(params.sessionId);
      pending.resolve({ stopReason: "cancelled" });
    }
  }

  /**
   * Load a persisted session (not implemented).
   *
   * Session persistence is handled at the session store level,
   * not through this ACP method.
   *
   * @throws Always throws "not implemented" error
   */
  async loadSession(_params: LoadSessionRequest): Promise<LoadSessionResponse> {
    throw new Error("Session loading not implemented");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Content Extraction Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Extract text from ACP prompt content blocks.
   *
   * Joins all text blocks with newlines.
   *
   * @param prompt - Array of content blocks
   * @returns Combined text content
   */
  private extractTextFromPrompt(prompt: ContentBlock[]): string {
    return prompt
      .filter(
        (block): block is TextContent & { type: "text" } =>
          "type" in block && block.type === "text" && "text" in block,
      )
      .map((block) => block.text)
      .join("\n");
  }

  /**
   * Extract image attachments from ACP prompt content blocks.
   *
   * Converts ACP ImageContent blocks to Gateway attachment format.
   *
   * @param prompt - Array of content blocks
   * @returns Array of image attachments for Gateway
   */
  private extractAttachmentsFromPrompt(
    prompt: ContentBlock[],
  ): Array<{ type: string; mimeType: string; content: string }> {
    const attachments: Array<{
      type: string;
      mimeType: string;
      content: string;
    }> = [];

    for (const block of prompt) {
      if ("type" in block && block.type === "image") {
        const imageBlock = block as ImageContent & { type: "image" };
        if (imageBlock.data && imageBlock.mimeType) {
          attachments.push({
            type: "image",
            mimeType: imageBlock.mimeType,
            content: imageBlock.data, // Already base64 encoded
          });
        }
      }
    }

    return attachments;
  }
}
