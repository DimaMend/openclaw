import { Type } from "@sinclair/typebox";

/**
 * Memory extraction strategy types.
 *
 * - "discrete": Extract semantic and episodic memories (default)
 * - "summary": Extract a running summary of the conversation
 * - "preferences": Extract user preferences and settings
 * - "custom": Use a custom extraction prompt
 */
export type MemoryStrategy = "discrete" | "summary" | "preferences" | "custom";

/**
 * Fields that can be used for grouping in summary views.
 */
export type SummaryGroupByField = "user_id" | "namespace";

export type MemoryConfig = {
  /** Base URL of the agent-memory-server (e.g., 'http://localhost:8000') */
  serverUrl: string;
  /** Optional API key for authentication */
  apiKey?: string;
  /** Optional bearer token for authentication */
  bearerToken?: string;
  /** Namespace for organizing memories (default: "openclaw") */
  namespace?: string;
  /** User ID for memory isolation (default: "default") */
  userId?: string;
  /** Request timeout in milliseconds (default: 30000) */
  timeout?: number;
  /** Enable auto-capture of important information from conversations */
  autoCapture?: boolean;
  /** Enable auto-recall of relevant memories before agent starts */
  autoRecall?: boolean;
  /** Minimum similarity score for recall (0-1, default: 0.3) */
  minScore?: number;
  /** Maximum number of memories to recall (default: 3) */
  recallLimit?: number;
  /**
   * Memory extraction strategy for background processing.
   *
   * - "discrete" (default): Extract semantic and episodic memories
   * - "summary": Maintain a running summary of the conversation
   * - "preferences": Focus on extracting user preferences
   * - "custom": Use a custom extraction prompt (requires customPrompt)
   */
  extractionStrategy?: MemoryStrategy;
  /**
   * Custom extraction prompt (only used when extractionStrategy is "custom").
   *
   * This prompt is sent to the LLM to guide memory extraction.
   * Example: "Extract action items and decisions from this conversation."
   */
  customPrompt?: string;
  /**
   * Name for the summary view (default: "openclaw_user_summary").
   *
   * Summary views provide a rolling, LLM-generated summary of long-term memories.
   * The summary is injected into context alongside on-demand memory tools.
   */
  summaryViewName?: string;
  /**
   * Rolling time window in days for the summary view (default: 30).
   *
   * Only memories from the last N days are included in the summary.
   */
  summaryTimeWindowDays?: number;
  /**
   * Fields to group by in the summary view (default: ["user_id"]).
   *
   * Each unique combination of these fields gets its own summary partition.
   * Options: "user_id", "namespace"
   */
  summaryGroupBy?: SummaryGroupByField[];
};

const DEFAULT_SERVER_URL = "http://localhost:8000";
const DEFAULT_TIMEOUT = 30000;
const DEFAULT_MIN_SCORE = 0.3;
const DEFAULT_RECALL_LIMIT = 3;
const DEFAULT_NAMESPACE = "openclaw";
const DEFAULT_USER_ID = "default";
const DEFAULT_SUMMARY_VIEW_NAME = "openclaw_user_summary";
const DEFAULT_SUMMARY_TIME_WINDOW_DAYS = 30;
const DEFAULT_SUMMARY_GROUP_BY: SummaryGroupByField[] = ["user_id"];

function assertAllowedKeys(
  value: Record<string, unknown>,
  allowed: string[],
  label: string,
) {
  const unknown = Object.keys(value).filter((key) => !allowed.includes(key));
  if (unknown.length === 0) return;
  throw new Error(`${label} has unknown keys: ${unknown.join(", ")}`);
}

function resolveEnvVars(value: string): string {
  return value.replace(/\$\{([^}]+)\}/g, (_, envVar) => {
    const envValue = process.env[envVar];
    if (!envValue) {
      throw new Error(`Environment variable ${envVar} is not set`);
    }
    return envValue;
  });
}

export const memoryConfigSchema = {
  parse(value: unknown): MemoryConfig {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      throw new Error("memory config required");
    }
    const cfg = value as Record<string, unknown>;
    assertAllowedKeys(
      cfg,
      [
        "serverUrl",
        "apiKey",
        "bearerToken",
        "namespace",
        "userId",
        "timeout",
        "autoCapture",
        "autoRecall",
        "minScore",
        "recallLimit",
        "extractionStrategy",
        "customPrompt",
        "summaryViewName",
        "summaryTimeWindowDays",
        "summaryGroupBy",
      ],
      "memory config",
    );

    const serverUrl =
      typeof cfg.serverUrl === "string" ? cfg.serverUrl : DEFAULT_SERVER_URL;

    // Validate extraction strategy
    const validStrategies = ["discrete", "summary", "preferences", "custom"] as const;
    let extractionStrategy: MemoryStrategy | undefined;
    if (typeof cfg.extractionStrategy === "string") {
      if (!validStrategies.includes(cfg.extractionStrategy as MemoryStrategy)) {
        throw new Error(
          `Invalid extractionStrategy: ${cfg.extractionStrategy}. Must be one of: ${validStrategies.join(", ")}`,
        );
      }
      extractionStrategy = cfg.extractionStrategy as MemoryStrategy;
    }

    // Validate custom prompt
    const customPrompt =
      typeof cfg.customPrompt === "string" ? cfg.customPrompt : undefined;
    if (extractionStrategy === "custom" && !customPrompt) {
      throw new Error(
        'customPrompt is required when extractionStrategy is "custom"',
      );
    }

    // Parse and validate summaryGroupBy
    let summaryGroupBy: SummaryGroupByField[] = DEFAULT_SUMMARY_GROUP_BY;
    if (Array.isArray(cfg.summaryGroupBy)) {
      const validFields: SummaryGroupByField[] = ["user_id", "namespace"];
      const parsed = cfg.summaryGroupBy.filter(
        (f): f is SummaryGroupByField =>
          typeof f === "string" && validFields.includes(f as SummaryGroupByField),
      );
      if (parsed.length > 0) {
        summaryGroupBy = parsed;
      }
    }

    return {
      serverUrl: resolveEnvVars(serverUrl),
      apiKey: typeof cfg.apiKey === "string" ? resolveEnvVars(cfg.apiKey) : undefined,
      bearerToken:
        typeof cfg.bearerToken === "string" ? resolveEnvVars(cfg.bearerToken) : undefined,
      namespace: typeof cfg.namespace === "string" ? cfg.namespace : DEFAULT_NAMESPACE,
      userId: typeof cfg.userId === "string" ? cfg.userId : DEFAULT_USER_ID,
      timeout:
        typeof cfg.timeout === "number" && Number.isFinite(cfg.timeout)
          ? cfg.timeout
          : DEFAULT_TIMEOUT,
      autoCapture: cfg.autoCapture !== false,
      autoRecall: cfg.autoRecall !== false,
      minScore:
        typeof cfg.minScore === "number" && Number.isFinite(cfg.minScore)
          ? Math.max(0, Math.min(1, cfg.minScore))
          : DEFAULT_MIN_SCORE,
      recallLimit:
        typeof cfg.recallLimit === "number" && Number.isFinite(cfg.recallLimit)
          ? Math.max(1, Math.floor(cfg.recallLimit))
          : DEFAULT_RECALL_LIMIT,
      extractionStrategy,
      customPrompt,
      summaryViewName:
        typeof cfg.summaryViewName === "string"
          ? cfg.summaryViewName
          : DEFAULT_SUMMARY_VIEW_NAME,
      summaryTimeWindowDays:
        typeof cfg.summaryTimeWindowDays === "number" &&
        Number.isFinite(cfg.summaryTimeWindowDays)
          ? Math.max(1, Math.floor(cfg.summaryTimeWindowDays))
          : DEFAULT_SUMMARY_TIME_WINDOW_DAYS,
      summaryGroupBy,
    };
  },
  uiHints: {
    serverUrl: {
      label: "Server URL",
      placeholder: DEFAULT_SERVER_URL,
      help: "Base URL of the agent-memory-server (or use ${AGENT_MEMORY_SERVER_URL})",
    },
    apiKey: {
      label: "API Key",
      sensitive: true,
      placeholder: "your-api-key",
      help: "API key for authentication (optional, or use ${AGENT_MEMORY_API_KEY})",
    },
    bearerToken: {
      label: "Bearer Token",
      sensitive: true,
      placeholder: "your-bearer-token",
      help: "Bearer token for authentication (optional)",
      advanced: true,
    },
    namespace: {
      label: "Namespace",
      placeholder: DEFAULT_NAMESPACE,
      help: "Namespace for organizing memories (isolates memories by project/app)",
    },
    userId: {
      label: "User ID",
      placeholder: DEFAULT_USER_ID,
      help: "User ID for memory isolation (each user gets their own memories)",
    },
    timeout: {
      label: "Timeout (ms)",
      placeholder: String(DEFAULT_TIMEOUT),
      advanced: true,
    },
    autoCapture: {
      label: "Auto-Capture",
      help: "Automatically capture important information from conversations",
    },
    autoRecall: {
      label: "Auto-Recall",
      help: "Automatically inject relevant memories into context",
    },
    minScore: {
      label: "Minimum Score",
      placeholder: String(DEFAULT_MIN_SCORE),
      help: "Minimum similarity score for memory recall (0-1)",
      advanced: true,
    },
    recallLimit: {
      label: "Recall Limit",
      placeholder: String(DEFAULT_RECALL_LIMIT),
      help: "Maximum number of memories to recall",
      advanced: true,
    },
    extractionStrategy: {
      label: "Extraction Strategy",
      placeholder: "discrete",
      help: "How to extract memories: discrete (semantic/episodic), summary, preferences, or custom",
      options: [
        { value: "discrete", label: "Discrete (semantic & episodic memories)" },
        { value: "summary", label: "Summary (running conversation summary)" },
        { value: "preferences", label: "Preferences (user preferences)" },
        { value: "custom", label: "Custom (use custom prompt)" },
      ],
    },
    customPrompt: {
      label: "Custom Extraction Prompt",
      placeholder: "Extract action items and decisions from this conversation.",
      help: "Custom prompt for memory extraction (only used with 'custom' strategy)",
      multiline: true,
      advanced: true,
    },
    summaryViewName: {
      label: "Summary View Name",
      placeholder: DEFAULT_SUMMARY_VIEW_NAME,
      help: "Name for the rolling summary view of long-term memories",
      advanced: true,
    },
    summaryTimeWindowDays: {
      label: "Summary Time Window (days)",
      placeholder: String(DEFAULT_SUMMARY_TIME_WINDOW_DAYS),
      help: "Rolling window in days for the summary view (only recent memories included)",
      advanced: true,
    },
    summaryGroupBy: {
      label: "Summary Group By",
      placeholder: "user_id",
      help: "Fields to partition summaries by: user_id, namespace, or both",
      advanced: true,
    },
  },
};

