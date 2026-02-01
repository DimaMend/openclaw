/**
 * OpenClaw Gray Swan Guardrails Plugin
 *
 * Provides guardrail functionality via the Gray Swan Cygnal API.
 * Inspects and optionally blocks requests, tool calls, tool results, and responses.
 */

import type { AgentMessage, AgentToolResult } from "@mariozechner/pi-agent-core";
import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { emptyPluginConfigSchema } from "openclaw/plugin-sdk";

import type {
  GrayswanGuardrailConfig,
  GrayswanStageConfig,
} from "../../src/config/types.guardrails.js";

// ============================================================================
// Types
// ============================================================================

type GuardrailStage = "before_request" | "after_response" | "before_tool_call" | "after_tool_call";

type GrayswanMonitorMessage = {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
};

type GrayswanMonitorResponse = {
  violation?: number;
  violated_rules?: unknown[];
  violated_rule_descriptions?: unknown[];
  mutation?: boolean;
  ipi?: boolean;
};

type GrayswanEvaluation = {
  violationScore: number;
  violatedRules: unknown[];
  mutation: boolean;
  ipi: boolean;
};

// ============================================================================
// Constants
// ============================================================================

const GRAYSWAN_DEFAULT_BASE = "https://api.grayswan.ai";
const GRAYSWAN_MONITOR_PATH = "/cygnal/monitor";
const GRAYSWAN_DEFAULT_THRESHOLD = 0.5;
const GRAYSWAN_DEFAULT_TIMEOUT_MS = 30_000;

// ============================================================================
// Helper Functions
// ============================================================================

function makeGrayswanMessage(
  role: GrayswanMonitorMessage["role"],
  content: string,
): GrayswanMonitorMessage {
  return { role, content };
}

function resolveGrayswanStageConfig(
  cfg: GrayswanGuardrailConfig,
  stage: GuardrailStage,
): GrayswanStageConfig | undefined {
  const stages = cfg.stages;
  if (!stages) {
    return undefined;
  }
  switch (stage) {
    case "before_request":
      return stages.beforeRequest;
    case "before_tool_call":
      return stages.beforeToolCall;
    case "after_tool_call":
      return stages.afterToolCall;
    case "after_response":
      return stages.afterResponse;
    default:
      return undefined;
  }
}

function isStageEnabled(stage: GrayswanStageConfig | undefined): boolean {
  if (!stage) {
    return false;
  }
  return stage.enabled !== false;
}

function resolveGrayswanThreshold(
  cfg: GrayswanGuardrailConfig,
  stage: GrayswanStageConfig | undefined,
): number {
  const value = stage?.violationThreshold ?? cfg.violationThreshold;
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.min(1, Math.max(0, value));
  }
  return GRAYSWAN_DEFAULT_THRESHOLD;
}

function resolveGrayswanBlockMode(
  stage: GuardrailStage,
  stageCfg: GrayswanStageConfig | undefined,
): "replace" | "append" {
  if (stageCfg?.blockMode) {
    return stageCfg.blockMode;
  }
  if (stage === "after_tool_call") {
    return "append";
  }
  return "replace";
}

function resolveBlockOnMutation(stage: GuardrailStage, stageCfg: GrayswanStageConfig | undefined) {
  if (typeof stageCfg?.blockOnMutation === "boolean") {
    return stageCfg.blockOnMutation;
  }
  return stage === "after_tool_call";
}

function resolveBlockOnIpi(stage: GuardrailStage, stageCfg: GrayswanStageConfig | undefined) {
  if (typeof stageCfg?.blockOnIpi === "boolean") {
    return stageCfg.blockOnIpi;
  }
  return stage === "after_tool_call";
}

function resolveGrayswanApiKey(cfg: GrayswanGuardrailConfig): string | undefined {
  const key = cfg.apiKey?.trim();
  if (key) {
    return key;
  }
  const env = process.env.GRAYSWAN_API_KEY?.trim();
  return env || undefined;
}

function resolveGrayswanApiBase(cfg: GrayswanGuardrailConfig): string {
  const base =
    cfg.apiBase?.trim() || process.env.GRAYSWAN_API_BASE?.trim() || GRAYSWAN_DEFAULT_BASE;
  return base.replace(/\/+$/, "");
}

function safeJsonStringify(value: unknown): string | null {
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function extractTextFromContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }
  if (!Array.isArray(content)) {
    return "";
  }
  const texts = content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return "";
      }
      const record = item as Record<string, unknown>;
      if (record.type && record.type !== "text") {
        return "";
      }
      return typeof record.text === "string" ? record.text : "";
    })
    .filter(Boolean);
  return texts.join("\n");
}

function toGrayswanRole(role: unknown): GrayswanMonitorMessage["role"] | null {
  if (role === "user" || role === "assistant" || role === "system") {
    return role;
  }
  if (role === "toolResult" || role === "tool") {
    return "tool";
  }
  return null;
}

function toGrayswanMessages(messages: AgentMessage[]): GrayswanMonitorMessage[] {
  const converted: GrayswanMonitorMessage[] = [];
  for (const message of messages) {
    const role = toGrayswanRole((message as { role?: unknown }).role);
    if (!role) {
      continue;
    }
    const content = extractTextFromContent((message as { content?: unknown }).content).trim();
    if (!content) {
      continue;
    }
    converted.push({ role, content });
  }
  return converted;
}

function extractToolResultText(result: AgentToolResult<unknown>): string {
  const contentText = extractTextFromContent(result?.content).trim();
  if (contentText) {
    return contentText;
  }
  if (result?.details !== undefined) {
    return safeJsonStringify(result.details) ?? "";
  }
  return safeJsonStringify(result) ?? "";
}

function formatViolatedRules(violatedRules: unknown[]): string {
  const formatted: string[] = [];
  for (const rule of violatedRules) {
    if (rule && typeof rule === "object") {
      const record = rule as Record<string, unknown>;
      const ruleNum = record.rule ?? record.index ?? record.id;
      const ruleName = typeof record.name === "string" ? record.name : "";
      const ruleDesc = typeof record.description === "string" ? record.description : "";
      if (ruleNum && ruleName) {
        if (ruleDesc) {
          formatted.push(`#${ruleNum} ${ruleName}: ${ruleDesc}`);
        } else {
          formatted.push(`#${ruleNum} ${ruleName}`);
        }
      } else if (ruleName) {
        formatted.push(ruleName);
      } else {
        formatted.push(String(rule));
      }
      continue;
    }
    formatted.push(String(rule));
  }
  return formatted.join(", ");
}

function formatGrayswanViolationMessage(params: {
  evaluation: GrayswanEvaluation;
  location: string;
}): string {
  const violationScore = params.evaluation.violationScore;
  const violatedRules = params.evaluation.violatedRules;
  const messageParts = [
    `Sorry I can't help with that. According to the Gray Swan Cygnal Guardrail, ` +
      `the ${params.location} has a violation score of ${violationScore.toFixed(2)}.`,
  ];

  if (violatedRules.length > 0) {
    const formattedRules = formatViolatedRules(violatedRules);
    if (formattedRules) {
      messageParts.push(`It was violating the rule(s): ${formattedRules}.`);
    }
  }

  if (params.evaluation.mutation) {
    messageParts.push("Mutation effort to make the harmful intention disguised was DETECTED.");
  }

  if (params.evaluation.ipi) {
    messageParts.push("Indirect Prompt Injection was DETECTED.");
  }

  return messageParts.join("\n");
}

function buildToolCallSummary(toolName: string, toolCallId: string, params: unknown): string {
  const payload = {
    tool: toolName,
    toolCallId,
    params,
  };
  return safeJsonStringify(payload) ?? toolName;
}

function buildMonitorPayload(
  messages: GrayswanMonitorMessage[],
  cfg: GrayswanGuardrailConfig,
): Record<string, unknown> {
  const payload: Record<string, unknown> = { messages };
  if (cfg.categories && Object.keys(cfg.categories).length > 0) {
    payload.categories = cfg.categories;
  }
  if (cfg.policyId) {
    payload.policy_id = cfg.policyId;
  }
  if (cfg.reasoningMode) {
    payload.reasoning_mode = cfg.reasoningMode;
  }
  return payload;
}

async function callGrayswanMonitor(
  params: {
    cfg: GrayswanGuardrailConfig;
    messages: GrayswanMonitorMessage[];
  },
  logger: OpenClawPluginApi["logger"],
): Promise<GrayswanMonitorResponse | null> {
  const apiKey = resolveGrayswanApiKey(params.cfg);
  if (!apiKey) {
    logger.warn("Gray Swan guardrail enabled but no API key configured.");
    return null;
  }
  const apiBase = resolveGrayswanApiBase(params.cfg);
  const payload = buildMonitorPayload(params.messages, params.cfg);
  const timeoutMs =
    typeof params.cfg.timeoutMs === "number" && params.cfg.timeoutMs > 0
      ? params.cfg.timeoutMs
      : GRAYSWAN_DEFAULT_TIMEOUT_MS;
  const url = `${apiBase}${GRAYSWAN_MONITOR_PATH}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "grayswan-api-key": apiKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Gray Swan monitor returned ${response.status}`);
    }
    const result = (await response.json()) as GrayswanMonitorResponse;
    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Gray Swan monitor failed: ${message}`);
    if (params.cfg.failOpen === false) {
      throw err;
    }
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function evaluateGrayswanResponse(response: GrayswanMonitorResponse): GrayswanEvaluation {
  const violationScore = Number(response.violation ?? 0);
  const violatedRules = Array.isArray(response.violated_rule_descriptions)
    ? response.violated_rule_descriptions
    : Array.isArray(response.violated_rules)
      ? response.violated_rules
      : [];
  return {
    violationScore: Number.isFinite(violationScore) ? violationScore : 0,
    violatedRules,
    mutation: Boolean(response.mutation),
    ipi: Boolean(response.ipi),
  };
}

function shouldBlockByEvaluation(params: {
  evaluation: GrayswanEvaluation;
  threshold: number;
  blockOnMutation: boolean;
  blockOnIpi: boolean;
}): boolean {
  const scoreFlag = params.evaluation.violationScore >= params.threshold;
  const mutationFlag = params.blockOnMutation && params.evaluation.mutation;
  const ipiFlag = params.blockOnIpi && params.evaluation.ipi;
  return scoreFlag || mutationFlag || ipiFlag;
}

function appendWarningToToolResult(
  result: AgentToolResult<unknown>,
  warning: string,
): AgentToolResult<unknown> {
  const content = Array.isArray(result.content) ? [...result.content] : [];
  content.push({ type: "text", text: warning });
  return { ...result, content };
}

function replaceToolResultWithWarning(
  result: AgentToolResult<unknown>,
  warning: string,
): AgentToolResult<unknown> {
  const baseDetails =
    result &&
    typeof result === "object" &&
    "details" in result &&
    (result as { details?: unknown }).details &&
    typeof (result as { details?: unknown }).details === "object"
      ? ((result as { details?: Record<string, unknown> }).details ?? {})
      : undefined;
  const details = baseDetails
    ? { ...baseDetails, guardrailWarning: warning }
    : { guardrailWarning: warning };
  return {
    content: [{ type: "text", text: warning }],
    details,
  };
}

// ============================================================================
// Plugin Definition
// ============================================================================

const grayswanPlugin = {
  id: "grayswan",
  name: "Gray Swan Guardrails",
  description: "Guardrail functionality via the Gray Swan Cygnal API",
  configSchema: emptyPluginConfigSchema(),

  register(api: OpenClawPluginApi) {
    const cfg = api.config.guardrails?.grayswan;
    if (!cfg || cfg.enabled === false) {
      api.logger.debug?.("Gray Swan guardrails disabled or not configured");
      return;
    }

    api.logger.info("Gray Swan guardrails enabled");

    // Register before_request hook
    api.on(
      "before_request",
      async (event) => {
        const stageCfg = resolveGrayswanStageConfig(cfg, "before_request");
        if (!isStageEnabled(stageCfg)) {
          return;
        }
        const prompt = event.prompt.trim();
        if (!prompt) {
          return;
        }
        const includeHistory = stageCfg?.includeHistory !== false;
        const messages: GrayswanMonitorMessage[] = includeHistory
          ? [...toGrayswanMessages(event.messages), makeGrayswanMessage("user", prompt)]
          : [makeGrayswanMessage("user", prompt)];
        if (messages.length === 0) {
          return;
        }

        let response: GrayswanMonitorResponse | null = null;
        try {
          response = await callGrayswanMonitor({ cfg, messages }, api.logger);
        } catch {
          return {
            block: true,
            blockResponse: "Request blocked because Gray Swan guardrail failed.",
          };
        }
        if (!response) {
          return;
        }

        const evaluation = evaluateGrayswanResponse(response);
        const threshold = resolveGrayswanThreshold(cfg, stageCfg);
        const flagged = shouldBlockByEvaluation({
          evaluation,
          threshold,
          blockOnMutation: resolveBlockOnMutation("before_request", stageCfg),
          blockOnIpi: resolveBlockOnIpi("before_request", stageCfg),
        });
        if (!flagged) {
          return;
        }
        if (stageCfg?.mode === "monitor") {
          return;
        }
        const message = formatGrayswanViolationMessage({
          evaluation,
          location: "input query",
        });
        return {
          block: true,
          blockResponse: message,
        };
      },
      { priority: 50 },
    );

    // Register before_tool_call hook
    api.on(
      "before_tool_call",
      async (event) => {
        const stageCfg = resolveGrayswanStageConfig(cfg, "before_tool_call");
        if (!isStageEnabled(stageCfg)) {
          return;
        }
        const toolSummary = buildToolCallSummary(event.toolName, event.toolCallId, event.params);
        const includeHistory = stageCfg?.includeHistory !== false;
        const messages: GrayswanMonitorMessage[] = includeHistory
          ? [...toGrayswanMessages(event.messages), makeGrayswanMessage("assistant", toolSummary)]
          : [makeGrayswanMessage("assistant", toolSummary)];
        if (messages.length === 0) {
          return;
        }

        let response: GrayswanMonitorResponse | null = null;
        try {
          response = await callGrayswanMonitor({ cfg, messages }, api.logger);
        } catch {
          return {
            block: true,
            blockReason: "Tool call blocked because Gray Swan guardrail failed.",
          };
        }
        if (!response) {
          return;
        }

        const evaluation = evaluateGrayswanResponse(response);
        const threshold = resolveGrayswanThreshold(cfg, stageCfg);
        const flagged = shouldBlockByEvaluation({
          evaluation,
          threshold,
          blockOnMutation: resolveBlockOnMutation("before_tool_call", stageCfg),
          blockOnIpi: resolveBlockOnIpi("before_tool_call", stageCfg),
        });
        if (!flagged) {
          return;
        }
        if (stageCfg?.mode === "monitor") {
          return;
        }
        const message = formatGrayswanViolationMessage({
          evaluation,
          location: "tool call request",
        });
        return {
          block: true,
          blockReason: message,
        };
      },
      { priority: 50 },
    );

    // Register after_tool_call hook
    api.on(
      "after_tool_call",
      async (event) => {
        const stageCfg = resolveGrayswanStageConfig(cfg, "after_tool_call");
        if (!isStageEnabled(stageCfg)) {
          return;
        }
        const toolText = extractToolResultText(event.result).trim();
        const includeHistory = stageCfg?.includeHistory !== false;
        const messages: GrayswanMonitorMessage[] = includeHistory
          ? [...toGrayswanMessages(event.messages), makeGrayswanMessage("tool", toolText)]
          : [makeGrayswanMessage("tool", toolText)];
        if (!toolText || messages.length === 0) {
          return;
        }

        let response: GrayswanMonitorResponse | null = null;
        try {
          response = await callGrayswanMonitor({ cfg, messages }, api.logger);
        } catch {
          return {
            block: true,
            result: replaceToolResultWithWarning(
              event.result,
              "Tool result blocked because Gray Swan guardrail failed.",
            ),
          };
        }
        if (!response) {
          return;
        }

        const evaluation = evaluateGrayswanResponse(response);
        const threshold = resolveGrayswanThreshold(cfg, stageCfg);
        const flagged = shouldBlockByEvaluation({
          evaluation,
          threshold,
          blockOnMutation: resolveBlockOnMutation("after_tool_call", stageCfg),
          blockOnIpi: resolveBlockOnIpi("after_tool_call", stageCfg),
        });
        if (!flagged) {
          return;
        }
        if (stageCfg?.mode === "monitor") {
          return;
        }
        const message = formatGrayswanViolationMessage({
          evaluation,
          location: "tool response",
        });
        const blockMode = resolveGrayswanBlockMode("after_tool_call", stageCfg);
        return {
          block: true,
          result:
            blockMode === "append"
              ? appendWarningToToolResult(event.result, message)
              : replaceToolResultWithWarning(event.result, message),
        };
      },
      { priority: 50 },
    );

    // Register after_response hook
    api.on(
      "after_response",
      async (event) => {
        const stageCfg = resolveGrayswanStageConfig(cfg, "after_response");
        if (!isStageEnabled(stageCfg)) {
          return;
        }
        const assistantText =
          event.assistantTexts.join("\n").trim() ||
          (event.lastAssistant
            ? extractTextFromContent((event.lastAssistant as AssistantMessage).content).trim()
            : "");
        if (!assistantText) {
          return;
        }
        const includeHistory = stageCfg?.includeHistory !== false;
        const historyMessages = includeHistory ? toGrayswanMessages(event.messages) : [];
        const messages: GrayswanMonitorMessage[] = [
          ...historyMessages,
          makeGrayswanMessage("assistant", assistantText),
        ];

        let response: GrayswanMonitorResponse | null = null;
        try {
          response = await callGrayswanMonitor({ cfg, messages }, api.logger);
        } catch {
          return {
            block: true,
            blockResponse: "Response blocked because Gray Swan guardrail failed.",
          };
        }
        if (!response) {
          return;
        }

        const evaluation = evaluateGrayswanResponse(response);
        const threshold = resolveGrayswanThreshold(cfg, stageCfg);
        const flagged = shouldBlockByEvaluation({
          evaluation,
          threshold,
          blockOnMutation: resolveBlockOnMutation("after_response", stageCfg),
          blockOnIpi: resolveBlockOnIpi("after_response", stageCfg),
        });
        if (!flagged) {
          return;
        }
        if (stageCfg?.mode === "monitor") {
          return;
        }
        const message = formatGrayswanViolationMessage({
          evaluation,
          location: "model response",
        });
        const blockMode = resolveGrayswanBlockMode("after_response", stageCfg);
        if (blockMode === "append") {
          return {
            assistantTexts: [...event.assistantTexts, message],
          };
        }
        return {
          block: true,
          blockResponse: message,
        };
      },
      { priority: 50 },
    );
  },
};

export default grayswanPlugin;
