/**
 * OpenClaw Memory (Redis) Plugin
 *
 * Long-term memory with vector search for AI conversations.
 * Uses agent-memory-server (Redis-backed) for storage and semantic search.
 *
 * Features:
 * - Auto-recall: Semantic search for relevant long-term memories
 * - Auto-capture: Saves conversation to working memory for background extraction
 * - Manual tools: Store, search, and forget memories explicitly
 *
 * The server handles memory extraction in the background, keeping the client fast.
 *
 * ## Memory Retrieval
 *
 * The plugin uses semantic search (`searchLongTermMemory`) for auto-recall.
 * OpenClaw handles conversation history separately, so we only inject long-term
 * memories - not working memory (recent messages).
 *
 * ## Extraction Strategies
 *
 * Configure how the server extracts memories from conversations:
 *
 * - **discrete** (default): Extract semantic and episodic memories
 * - **summary**: Maintain a running summary of the conversation
 * - **preferences**: Focus on extracting user preferences and settings
 * - **custom**: Use a custom extraction prompt for specialized use cases
 *
 * Example config with custom prompt:
 * ```json
 * {
 *   "extractionStrategy": "custom",
 *   "customPrompt": "Extract action items and decisions from this conversation."
 * }
 * ```
 */

import { Type } from "@sinclair/typebox";
import { MemoryAPIClient } from "agent-memory-client";
import type { MemoryMessage, SummaryView } from "agent-memory-client";
import { randomUUID } from "node:crypto";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { stringEnum } from "openclaw/plugin-sdk";

import { type MemoryConfig, memoryConfigSchema } from "./config.js";

// ============================================================================
// Types
// ============================================================================

const MEMORY_CATEGORIES = ["preference", "fact", "decision", "entity", "other"] as const;
type MemoryCategory = (typeof MEMORY_CATEGORIES)[number];

type MemorySearchResult = {
  id: string;
  text: string;
  score: number;
  category?: string;
  topics?: string[];
  entities?: string[];
};

// ============================================================================
// Message conversion helpers
// ============================================================================

/**
 * Extract text content from a message content block (handles string or array format)
 */
function extractTextContent(content: unknown): string {
  if (typeof content === "string") return content;

  if (Array.isArray(content)) {
    const texts: string[] = [];
    for (const block of content) {
      if (
        block &&
        typeof block === "object" &&
        "type" in block &&
        (block as Record<string, unknown>).type === "text" &&
        "text" in block &&
        typeof (block as Record<string, unknown>).text === "string"
      ) {
        texts.push((block as Record<string, unknown>).text as string);
      }
    }
    return texts.join("\n");
  }

  return "";
}

/**
 * Strip OpenClaw envelope metadata from prompts before searching.
 * Removes [message_id: ...] hints and envelope headers like [Channel user timestamp].
 */
function stripEnvelopeForSearch(text: string): string {
  // Strip [message_id: ...] lines
  const lines = text.split(/\r?\n/);
  const filtered = lines.filter((line) => !/^\[message_id:\s*[^\]]+\]$/.test(line.trim()));
  let result = filtered.join("\n");

  // Strip envelope header like [Channel user timestamp] at the start
  const envelopeMatch = result.match(/^\[([^\]]+)\]\s*/);
  if (envelopeMatch) {
    const header = envelopeMatch[1] ?? "";
    // Check if it looks like an envelope (has multiple space-separated parts)
    if (header.split(/\s+/).length >= 2) {
      result = result.slice(envelopeMatch[0].length);
    }
  }

  return result.trim();
}

/**
 * Convert OpenClaw messages to MemoryMessage format for working memory
 */
function convertToMemoryMessages(messages: unknown[]): MemoryMessage[] {
  const result: MemoryMessage[] = [];

  for (const msg of messages) {
    if (!msg || typeof msg !== "object") continue;
    const msgObj = msg as Record<string, unknown>;

    const role = msgObj.role;
    if (typeof role !== "string") continue;

    // Only include user and assistant messages
    if (role !== "user" && role !== "assistant") continue;

    const content = extractTextContent(msgObj.content);
    if (!content.trim()) continue;

    // Skip injected memory context
    if (content.includes("<relevant-memories>")) continue;

    result.push({
      role,
      content,
      id: typeof msgObj.id === "string" ? msgObj.id : randomUUID(),
      created_at: new Date().toISOString(),
    });
  }

  return result;
}

// ============================================================================
// Category detection for manual store tool
// ============================================================================

function detectCategory(text: string): MemoryCategory {
  const lower = text.toLowerCase();
  if (/prefer|radši|like|love|hate|want/i.test(lower)) return "preference";
  if (/rozhodli|decided|will use|budeme/i.test(lower)) return "decision";
  if (/\+\d{10,}|@[\w.-]+\.\w+|is called|jmenuje se/i.test(lower)) return "entity";
  if (/is|are|has|have|je|má|jsou/i.test(lower)) return "fact";
  return "other";
}

// ============================================================================
// Plugin Definition
// ============================================================================

const memoryPlugin = {
  id: "memory-redis",
  name: "Memory (Redis)",
  description: "Redis-backed long-term memory via agent-memory-server with auto-recall/capture",
  kind: "memory" as const,
  configSchema: memoryConfigSchema,

  register(api: OpenClawPluginApi) {
    const cfg = memoryConfigSchema.parse(api.pluginConfig);
    const client = new MemoryAPIClient({
      baseUrl: cfg.serverUrl,
      apiKey: cfg.apiKey,
      bearerToken: cfg.bearerToken,
      defaultNamespace: cfg.namespace,
      timeout: cfg.timeout,
    });

    api.logger.info(
      `memory-redis: plugin registered (server: ${cfg.serverUrl}, namespace: ${cfg.namespace ?? "default"})`,
    );

    // ========================================================================
    // Tools
    // ========================================================================

    api.registerTool(
      {
        name: "memory_recall",
        label: "Memory Recall",
        description:
          "Search through long-term memories. Use when you need context about user preferences, past decisions, or previously discussed topics.",
        parameters: Type.Object({
          query: Type.String({ description: "Search query" }),
          limit: Type.Optional(Type.Number({ description: "Max results (default: 5)" })),
        }),
        async execute(_toolCallId, params) {
          const { query, limit = 5 } = params as { query: string; limit?: number };

          try {
            const results = await client.searchLongTermMemory({
              text: query,
              limit,
              namespace: cfg.namespace ? { eq: cfg.namespace } : undefined,
            });

            if (results.memories.length === 0) {
              return {
                content: [{ type: "text", text: "No relevant memories found." }],
                details: { count: 0 },
              };
            }

            // Convert distance to similarity score (lower distance = higher similarity)
            const mapped: MemorySearchResult[] = results.memories.map((m) => ({
              id: m.id,
              text: m.text,
              score: Math.max(0, 1 - (m.dist ?? 0)),
              topics: m.topics ?? undefined,
              entities: m.entities ?? undefined,
            }));

            // Filter by minimum score
            const filtered = mapped.filter((r) => r.score >= cfg.minScore!);

            if (filtered.length === 0) {
              return {
                content: [{ type: "text", text: "No relevant memories found." }],
                details: { count: 0 },
              };
            }

            const text = filtered
              .map((r, i) => `${i + 1}. ${r.text} (${(r.score * 100).toFixed(0)}%)`)
              .join("\n");

            return {
              content: [
                { type: "text", text: `Found ${filtered.length} memories:\n\n${text}` },
              ],
              details: { count: filtered.length, memories: filtered },
            };
          } catch (err) {
            api.logger.warn(`memory-redis: recall failed: ${String(err)}`);
            return {
              content: [{ type: "text", text: `Memory search failed: ${String(err)}` }],
              details: { error: String(err) },
            };
          }
        },
      },
      { name: "memory_recall" },
    );

    api.registerTool(
      {
        name: "memory_store",
        label: "Memory Store",
        description:
          "Save important information in long-term memory. Use for preferences, facts, decisions.",
        parameters: Type.Object({
          text: Type.String({ description: "Information to remember" }),
          category: Type.Optional(stringEnum(MEMORY_CATEGORIES)),
        }),
        async execute(_toolCallId, params) {
          const { text, category = "other" } = params as {
            text: string;
            category?: MemoryCategory;
          };

          try {
            // Check for duplicates by searching first
            const existing = await client.searchLongTermMemory({
              text,
              limit: 1,
              namespace: cfg.namespace ? { eq: cfg.namespace } : undefined,
            });

            if (existing.memories.length > 0 && existing.memories[0].dist < 0.05) {
              return {
                content: [
                  {
                    type: "text",
                    text: `Similar memory already exists: "${existing.memories[0].text}"`,
                  },
                ],
                details: {
                  action: "duplicate",
                  existingId: existing.memories[0].id,
                  existingText: existing.memories[0].text,
                },
              };
            }

            const memoryId = randomUUID();
            await client.createLongTermMemory(
              [
                {
                  id: memoryId,
                  text,
                  topics: [category],
                  namespace: cfg.namespace,
                },
              ],
              { namespace: cfg.namespace },
            );

            return {
              content: [{ type: "text", text: `Stored: "${text.slice(0, 100)}..."` }],
              details: { action: "created", id: memoryId },
            };
          } catch (err) {
            api.logger.warn(`memory-redis: store failed: ${String(err)}`);
            return {
              content: [{ type: "text", text: `Memory store failed: ${String(err)}` }],
              details: { error: String(err) },
            };
          }
        },
      },
      { name: "memory_store" },
    );

    api.registerTool(
      {
        name: "memory_forget",
        label: "Memory Forget",
        description: "Delete specific memories. GDPR-compliant.",
        parameters: Type.Object({
          query: Type.Optional(Type.String({ description: "Search to find memory" })),
          memoryId: Type.Optional(Type.String({ description: "Specific memory ID" })),
        }),
        async execute(_toolCallId, params) {
          const { query, memoryId } = params as { query?: string; memoryId?: string };

          try {
            if (memoryId) {
              // Note: The SDK's deleteLongTermMemories incorrectly sends memory_ids in body
              // instead of query params. Making direct fetch call as workaround.
              const deleteUrl = new URL("/v1/long-term-memory", cfg.serverUrl);
              deleteUrl.searchParams.set("memory_ids", memoryId);
              const deleteRes = await fetch(deleteUrl.toString(), {
                method: "DELETE",
                headers: {
                  "Content-Type": "application/json",
                  ...(cfg.apiKey && { "X-API-Key": cfg.apiKey }),
                  ...(cfg.bearerToken && { Authorization: `Bearer ${cfg.bearerToken}` }),
                },
              });
              if (!deleteRes.ok) {
                throw new Error(`Delete failed: ${deleteRes.status} ${deleteRes.statusText}`);
              }
              return {
                content: [{ type: "text", text: `Memory ${memoryId} forgotten.` }],
                details: { action: "deleted", id: memoryId },
              };
            }

            if (query) {
              const results = await client.searchLongTermMemory({
                text: query,
                limit: 5,
                namespace: cfg.namespace ? { eq: cfg.namespace } : undefined,
              });

              if (results.memories.length === 0) {
                return {
                  content: [{ type: "text", text: "No matching memories found." }],
                  details: { found: 0 },
                };
              }

              // Convert distance to similarity score
              const scored = results.memories.map((m) => ({
                ...m,
                score: Math.max(0, 1 - (m.dist ?? 0)),
              }));

              if (scored.length === 1 && scored[0].score > 0.9) {
                // Direct fetch workaround for SDK issue
                const deleteUrl = new URL("/v1/long-term-memory", cfg.serverUrl);
                deleteUrl.searchParams.set("memory_ids", scored[0].id);
                const deleteRes = await fetch(deleteUrl.toString(), {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                    ...(cfg.apiKey && { "X-API-Key": cfg.apiKey }),
                    ...(cfg.bearerToken && { Authorization: `Bearer ${cfg.bearerToken}` }),
                  },
                });
                if (!deleteRes.ok) {
                  throw new Error(`Delete failed: ${deleteRes.status} ${deleteRes.statusText}`);
                }
                return {
                  content: [{ type: "text", text: `Forgotten: "${scored[0].text}"` }],
                  details: { action: "deleted", id: scored[0].id },
                };
              }

              const list = scored
                .map((r) => `- [${r.id.slice(0, 8)}] ${r.text.slice(0, 60)}...`)
                .join("\n");

              const candidates = scored.map((r) => ({
                id: r.id,
                text: r.text,
                score: r.score,
              }));

              return {
                content: [
                  {
                    type: "text",
                    text: `Found ${scored.length} candidates. Specify memoryId:\n${list}`,
                  },
                ],
                details: { action: "candidates", candidates },
              };
            }

            return {
              content: [{ type: "text", text: "Provide query or memoryId." }],
              details: { error: "missing_param" },
            };
          } catch (err) {
            api.logger.warn(`memory-redis: forget failed: ${String(err)}`);
            return {
              content: [{ type: "text", text: `Memory forget failed: ${String(err)}` }],
              details: { error: String(err) },
            };
          }
        },
      },
      { name: "memory_forget" },
    );

    // ========================================================================
    // CLI Commands
    // ========================================================================

    api.registerCli(
      ({ program }) => {
        const memory = program
          .command("redis-memory")
          .description("Redis memory plugin commands");

        memory
          .command("search")
          .description("Search memories")
          .argument("<query>", "Search query")
          .option("--limit <n>", "Max results", "5")
          .action(async (query, opts) => {
            try {
              const results = await client.searchLongTermMemory({
                text: query,
                limit: parseInt(opts.limit),
                namespace: cfg.namespace ? { eq: cfg.namespace } : undefined,
              });

              const output = results.memories.map((m) => ({
                id: m.id,
                text: m.text,
                score: Math.max(0, 1 - (m.dist ?? 0)),
                topics: m.topics,
                entities: m.entities,
              }));
              console.log(JSON.stringify(output, null, 2));
            } catch (err) {
              console.error(`Search failed: ${String(err)}`);
            }
          });

        memory
          .command("health")
          .description("Check server health")
          .action(async () => {
            try {
              const health = await client.healthCheck();
              console.log(`Server healthy. Timestamp: ${health.now}`);
            } catch (err) {
              console.error(`Health check failed: ${String(err)}`);
            }
          });

        memory
          .command("sessions")
          .description("List sessions")
          .option("--limit <n>", "Max results", "10")
          .action(async (opts) => {
            try {
              const sessions = await client.listSessions({
                namespace: cfg.namespace,
                limit: parseInt(opts.limit),
              });
              console.log(`Found ${sessions.total} sessions:`);
              for (const session of sessions.sessions) {
                console.log(`  - ${session}`);
              }
            } catch (err) {
              console.error(`List sessions failed: ${String(err)}`);
            }
          });

        // Summary view commands
        const summary = memory
          .command("summary")
          .description("Summary view commands");

        summary
          .command("list")
          .description("List all summary views")
          .action(async () => {
            try {
              const views = await client.listSummaryViews();
              if (views.length === 0) {
                console.log("No summary views found.");
                return;
              }
              console.log(`Found ${views.length} summary view(s):\n`);
              for (const view of views) {
                console.log(`  ${view.name} (id: ${view.id})`);
                console.log(`    Source: ${view.source}`);
                console.log(`    Time window: ${view.time_window_days ?? "all"} days`);
                console.log(`    Continuous: ${view.continuous ? "yes" : "no"}`);
                console.log();
              }
            } catch (err) {
              console.error(`List views failed: ${String(err)}`);
            }
          });

        summary
          .command("show")
          .description("Show cached summary for a view")
          .argument("[name]", "View name", cfg.summaryViewName)
          .action(async (name) => {
            try {
              const viewName = name || cfg.summaryViewName;
              const views = await client.listSummaryViews();
              const view = views.find((v) => v.name === viewName);
              if (!view) {
                console.error(`View "${viewName}" not found.`);
                return;
              }

              const partitions = await client.listSummaryViewPartitions(view.id, {
                namespace: cfg.namespace,
              });

              if (partitions.length === 0) {
                console.log(`No cached summary for view "${viewName}".`);
                console.log("Run 'redis-memory summary refresh' to generate one.");
                return;
              }

              for (const partition of partitions) {
                console.log(`\n=== Summary (${partition.memory_count} memories) ===`);
                console.log(`Computed: ${partition.computed_at ?? "unknown"}`);
                if (Object.keys(partition.group).length > 0) {
                  console.log(`Group: ${JSON.stringify(partition.group)}`);
                }
                console.log(`\n${partition.summary || "(empty)"}\n`);
              }
            } catch (err) {
              console.error(`Show summary failed: ${String(err)}`);
            }
          });

        summary
          .command("refresh")
          .description("Trigger async refresh of a summary view")
          .argument("[name]", "View name", cfg.summaryViewName)
          .option("--wait", "Wait for refresh to complete", false)
          .option("--force", "Force full refresh even if cache is fresh", false)
          .action(async (name, opts) => {
            try {
              const viewName = name || cfg.summaryViewName;
              const views = await client.listSummaryViews();
              const view = views.find((v) => v.name === viewName);
              if (!view) {
                console.error(`View "${viewName}" not found.`);
                return;
              }

              console.log(`Triggering refresh for view "${viewName}"...`);
              const task = await client.runSummaryView(view.id, { force: opts.force });
              console.log(`Task started: ${task.id} (status: ${task.status})`);

              if (opts.wait) {
                console.log("Waiting for completion...");
                let status = await client.getTask(task.id);
                while (status?.status === "pending" || status?.status === "running") {
                  await new Promise((r) => setTimeout(r, 1000));
                  status = await client.getTask(task.id);
                  process.stdout.write(".");
                }
                console.log();
                console.log(`Task ${task.id}: ${status?.status ?? "unknown"}`);
                if (status?.status === "completed") {
                  console.log("Summary refreshed successfully.");
                } else if (status?.status === "failed") {
                  console.error(`Refresh failed: ${status.error ?? "unknown error"}`);
                }
              } else {
                console.log("Refresh running in background.");
              }
            } catch (err) {
              console.error(`Refresh failed: ${String(err)}`);
            }
          });
      },
      { commands: ["redis-memory"] },
    );

    // ========================================================================
    // Summary View Management
    // ========================================================================

    // Track the summary view ID once initialized (set in service start)
    let summaryViewId: string | null = null;

    /**
     * Ensure the default summary view exists, creating it if necessary.
     * Returns the view ID or null if initialization fails.
     */
    async function ensureSummaryView(): Promise<string | null> {
      try {
        // Check if view already exists by listing and finding by name
        const views = await client.listSummaryViews();
        const existing = views.find((v) => v.name === cfg.summaryViewName);

        if (existing) {
          api.logger.info(
            `memory-redis: using existing summary view "${cfg.summaryViewName}" (id: ${existing.id})`,
          );
          return existing.id;
        }

        // Create the default summary view
        const newView = await client.createSummaryView({
          name: cfg.summaryViewName,
          source: "long_term",
          group_by: cfg.namespace ? ["namespace"] : [],
          filters: cfg.namespace ? { namespace: cfg.namespace } : {},
          time_window_days: cfg.summaryTimeWindowDays,
          continuous: false, // We'll trigger refreshes manually after each turn
          prompt:
            "Summarize key facts, preferences, decisions, and important context about the user. " +
            "Focus on information that would be useful for future conversations. " +
            "Be concise but comprehensive.",
        });

        api.logger.info(
          `memory-redis: created summary view "${cfg.summaryViewName}" (id: ${newView.id}, window: ${cfg.summaryTimeWindowDays} days)`,
        );
        return newView.id;
      } catch (err) {
        api.logger.warn(`memory-redis: failed to initialize summary view: ${String(err)}`);
        return null;
      }
    }

    // ========================================================================
    // Lifecycle Hooks
    // ========================================================================

    // Auto-recall: inject rolling summary + query-specific memories before agent starts
    // The summary provides stable context; semantic search adds query-relevant details
    // Memory tools (memory_recall, memory_store, memory_forget) remain available for on-demand use
    if (cfg.autoRecall) {
      api.on("before_agent_start", async (event, _ctx) => {
        if (!event.prompt || event.prompt.length < 5) return;

        const contextParts: string[] = [];

        // 1. Try to get the cached summary from the summary view
        if (summaryViewId) {
          try {
            const group = cfg.namespace ? { namespace: cfg.namespace } : {};
            const partitions = await client.listSummaryViewPartitions(summaryViewId, {
              namespace: cfg.namespace,
            });

            // Find the partition matching our group (or the first one if no namespace)
            const partition = cfg.namespace
              ? partitions.find((p) => p.group.namespace === cfg.namespace)
              : partitions[0];

            if (partition && partition.summary && partition.memory_count > 0) {
              contextParts.push(
                `<user-summary computed="${partition.computed_at ?? "unknown"}" memories="${partition.memory_count}">\n${partition.summary}\n</user-summary>`,
              );
              api.logger.info?.(
                `memory-redis: injecting summary (${partition.memory_count} memories, computed: ${partition.computed_at ?? "unknown"})`,
              );
            }
          } catch (err) {
            api.logger.debug?.(`memory-redis: summary view fetch failed: ${String(err)}`);
            // Continue to semantic search fallback
          }
        }

        // 2. Semantic search for query-specific memories
        try {
          const searchQuery = stripEnvelopeForSearch(event.prompt);
          if (searchQuery && searchQuery.length >= 5) {
            const distanceThreshold =
              cfg.minScore !== undefined ? 1 - cfg.minScore : undefined;

            const results = await client.searchLongTermMemory({
              text: searchQuery,
              limit: cfg.recallLimit,
              namespace: cfg.namespace ? { eq: cfg.namespace } : undefined,
              distance_threshold: distanceThreshold,
            });

            if (results.memories.length > 0) {
              const filtered = results.memories
                .map((m) => ({
                  id: m.id,
                  text: m.text,
                  score: Math.max(0, 1 - (m.dist ?? 0)),
                  topics: m.topics ?? undefined,
                  entities: m.entities ?? undefined,
                }))
                .filter((r) => r.score >= (cfg.minScore ?? 0.3));

              if (filtered.length > 0) {
                const memoryList = filtered.map((r) => `- ${r.text}`).join("\n");
                contextParts.push(
                  `<relevant-memories query-specific="true">\n${memoryList}\n</relevant-memories>`,
                );
                api.logger.info?.(
                  `memory-redis: injecting ${filtered.length} query-specific memories`,
                );
              }
            }
          }
        } catch (err) {
          api.logger.warn(`memory-redis: semantic search failed: ${String(err)}`);
        }

        if (contextParts.length === 0) return;

        return {
          prependContext: contextParts.join("\n\n"),
        };
      });
    }

    // Auto-capture: save conversation to working memory for background extraction
    // The server handles memory extraction asynchronously, keeping the client fast
    if (cfg.autoCapture) {
      api.on("agent_end", async (event, ctx) => {
        if (!event.success || !event.messages || event.messages.length === 0) {
          return;
        }

        try {
          // Use sessionKey from context, or generate a unique one
          const sessionId = ctx?.sessionKey ?? `session-${Date.now()}`;

          // Convert messages to MemoryMessage format
          const memoryMessages = convertToMemoryMessages(event.messages);

          if (memoryMessages.length === 0) {
            api.logger.debug?.("memory-redis: no messages to capture");
            return;
          }

          // Build long-term memory strategy config if specified
          // Strategies: "discrete" (default), "summary", "preferences", "custom"
          const longTermMemoryStrategy = cfg.extractionStrategy
            ? {
                strategy: cfg.extractionStrategy,
                config:
                  cfg.extractionStrategy === "custom" && cfg.customPrompt
                    ? { prompt: cfg.customPrompt }
                    : {},
              }
            : undefined;

          // Save to working memory - server handles background extraction
          await client.putWorkingMemory(sessionId, {
            messages: memoryMessages,
            namespace: cfg.namespace,
            long_term_memory_strategy: longTermMemoryStrategy,
          });

          api.logger.info?.(
            `memory-redis: saved ${memoryMessages.length} messages to working memory (session: ${sessionId}, strategy: ${cfg.extractionStrategy ?? "discrete"})`,
          );

          // Trigger async summary view refresh (non-blocking)
          // This keeps the summary up-to-date after each conversation
          if (summaryViewId) {
            try {
              const task = await client.runSummaryView(summaryViewId);
              api.logger.debug?.(
                `memory-redis: triggered summary refresh (task: ${task.id}, status: ${task.status})`,
              );
            } catch (refreshErr) {
              // Non-critical - summary will be refreshed on next opportunity
              api.logger.debug?.(
                `memory-redis: summary refresh trigger failed: ${String(refreshErr)}`,
              );
            }
          }
        } catch (err) {
          api.logger.warn(`memory-redis: capture failed: ${String(err)}`);
        }
      });
    }

    // ========================================================================
    // Service
    // ========================================================================

    api.registerService({
      id: "memory-redis",
      start: async () => {
        try {
          await client.healthCheck();
          api.logger.info(
            `memory-redis: connected to server (${cfg.serverUrl}, namespace: ${cfg.namespace ?? "default"})`,
          );

          // Initialize summary view
          summaryViewId = await ensureSummaryView();
        } catch (err) {
          api.logger.warn(
            `memory-redis: server not reachable at ${cfg.serverUrl}: ${String(err)}`,
          );
        }
      },
      stop: () => {
        api.logger.info("memory-redis: stopped");
      },
    });
  },
};

export default memoryPlugin;
