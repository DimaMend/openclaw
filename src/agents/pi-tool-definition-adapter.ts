import type {
  AgentMessage,
  AgentTool,
  AgentToolResult,
  AgentToolUpdateCallback,
} from "@mariozechner/pi-agent-core";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { ClientToolDefinition } from "./pi-embedded-runner/run/params.js";
import type { OpenClawConfig } from "../config/config.js";
import { logDebug, logError } from "../logger.js";
import { normalizeToolName } from "./tool-policy.js";
import { jsonResult } from "./tools/common.js";
import { getGlobalHookRunner } from "../plugins/hook-runner-global.js";
import type { PluginHookToolContext } from "../plugins/types.js";

// biome-ignore lint/suspicious/noExplicitAny: TypeBox schema type from pi-agent-core uses a different module instance.
type AnyAgentTool = AgentTool<any, unknown>;

export type ToolHookOptions = {
  context: ToolHookContext;
  getMessages: () => AgentMessage[];
  systemPrompt?: string;
};

export type ToolHookContext = {
  agentId?: string;
  sessionId: string;
  sessionKey?: string;
  runId: string;
  provider: string;
  modelId: string;
  workspaceDir: string;
  messageProvider?: string;
  messageChannel?: string;
  config?: OpenClawConfig;
};

function describeToolExecutionError(err: unknown): {
  message: string;
  stack?: string;
} {
  if (err instanceof Error) {
    const message = err.message?.trim() ? err.message : String(err);
    return { message, stack: err.stack };
  }
  return { message: String(err) };
}

export function toToolDefinitions(
  tools: AnyAgentTool[],
  options?: { guardrails?: ToolHookOptions },
): ToolDefinition[] {
  return tools.map((tool) => {
    const name = tool.name || "tool";
    const normalizedName = normalizeToolName(name);
    const hookOptions = options?.guardrails;
    return {
      name,
      label: tool.label ?? name,
      description: tool.description ?? "",
      // biome-ignore lint/suspicious/noExplicitAny: TypeBox schema from pi-agent-core uses a different module instance.
      parameters: tool.parameters,
      execute: async (
        toolCallId,
        params,
        onUpdate: AgentToolUpdateCallback<unknown> | undefined,
        _ctx,
        signal,
      ): Promise<AgentToolResult<unknown>> => {
        // KNOWN: pi-coding-agent `ToolDefinition.execute` has a different signature/order
        // than pi-agent-core `AgentTool.execute`. This adapter keeps our existing tools intact.
        const hookRunner = getGlobalHookRunner();
        let effectiveParams = params;

        // Build tool context for hooks
        const toolContext: PluginHookToolContext | undefined = hookOptions
          ? {
              agentId: hookOptions.context.agentId,
              sessionKey: hookOptions.context.sessionKey,
              sessionId: hookOptions.context.sessionId,
              runId: hookOptions.context.runId,
              provider: hookOptions.context.provider,
              modelId: hookOptions.context.modelId,
              workspaceDir: hookOptions.context.workspaceDir,
              messageProvider: hookOptions.context.messageProvider,
              messageChannel: hookOptions.context.messageChannel,
              config: hookOptions.context.config,
              toolName: normalizedName,
            }
          : undefined;

        // Run before_tool_call hooks
        if (hookRunner?.hasHooks("before_tool_call") && hookOptions && toolContext) {
          const hookResult = await hookRunner.runBeforeToolCall(
            {
              toolName: normalizedName,
              toolCallId: String(toolCallId ?? ""),
              params: effectiveParams as Record<string, unknown>,
              messages: hookOptions.getMessages(),
              systemPrompt: hookOptions.systemPrompt,
            },
            toolContext,
          );
          if (hookResult?.block) {
            return (
              hookResult.toolResult ??
              jsonResult({
                status: "blocked",
                tool: normalizedName,
                message: hookResult.blockReason ?? "Tool call blocked by policy.",
              })
            );
          }
          if (hookResult?.params) {
            effectiveParams = hookResult.params;
          }
        }

        try {
          let result = await tool.execute(toolCallId, effectiveParams, signal, onUpdate);

          // Run after_tool_call hooks
          if (hookRunner?.hasHooks("after_tool_call") && hookOptions && toolContext) {
            const hookResult = await hookRunner.runAfterToolCall(
              {
                toolName: normalizedName,
                toolCallId: String(toolCallId ?? ""),
                params: effectiveParams as Record<string, unknown>,
                result,
                messages: hookOptions.getMessages(),
                systemPrompt: hookOptions.systemPrompt,
              },
              toolContext,
            );
            if (hookResult?.block) {
              return (
                hookResult.result ??
                jsonResult({
                  status: "blocked",
                  tool: normalizedName,
                  message: hookResult.blockReason ?? "Tool result blocked by policy.",
                })
              );
            }
            if (hookResult?.result) {
              result = hookResult.result;
            }
          }

          return result;
        } catch (err) {
          if (signal?.aborted) {
            throw err;
          }
          const errName =
            err && typeof err === "object" && "name" in err
              ? String((err as { name?: unknown }).name)
              : "";
          if (errName === "AbortError") {
            throw err;
          }
          const described = describeToolExecutionError(err);
          if (described.stack && described.stack !== described.message) {
            logDebug(`tools: ${normalizedName} failed stack:\n${described.stack}`);
          }
          logError(`[tools] ${normalizedName} failed: ${described.message}`);
          let errorResult = jsonResult({
            status: "error",
            tool: normalizedName,
            error: described.message,
          });

          // Run after_tool_call hooks even for errors
          if (hookRunner?.hasHooks("after_tool_call") && hookOptions && toolContext) {
            const hookResult = await hookRunner.runAfterToolCall(
              {
                toolName: normalizedName,
                toolCallId: String(toolCallId ?? ""),
                params: effectiveParams as Record<string, unknown>,
                result: errorResult,
                messages: hookOptions.getMessages(),
                systemPrompt: hookOptions.systemPrompt,
              },
              toolContext,
            );
            if (hookResult?.block) {
              return (
                hookResult.result ??
                jsonResult({
                  status: "blocked",
                  tool: normalizedName,
                  message: hookResult.blockReason ?? "Tool result blocked by policy.",
                })
              );
            }
            if (hookResult?.result) {
              errorResult = hookResult.result;
            }
          }

          return errorResult;
        }
      },
    } satisfies ToolDefinition;
  });
}

// Convert client tools (OpenResponses hosted tools) to ToolDefinition format
// These tools are intercepted to return a "pending" result instead of executing
export function toClientToolDefinitions(
  tools: ClientToolDefinition[],
  onClientToolCall?: (toolName: string, params: Record<string, unknown>) => void,
  options?: { guardrails?: ToolHookOptions },
): ToolDefinition[] {
  return tools.map((tool) => {
    const func = tool.function;
    const normalizedName = normalizeToolName(func.name);
    const hookOptions = options?.guardrails;
    return {
      name: func.name,
      label: func.name,
      description: func.description ?? "",
      parameters: func.parameters as any,
      execute: async (
        toolCallId,
        params,
        _onUpdate: AgentToolUpdateCallback<unknown> | undefined,
        _ctx,
        _signal,
      ): Promise<AgentToolResult<unknown>> => {
        const hookRunner = getGlobalHookRunner();
        let effectiveParams = params;

        // Build tool context for hooks
        const toolContext: PluginHookToolContext | undefined = hookOptions
          ? {
              agentId: hookOptions.context.agentId,
              sessionKey: hookOptions.context.sessionKey,
              sessionId: hookOptions.context.sessionId,
              runId: hookOptions.context.runId,
              provider: hookOptions.context.provider,
              modelId: hookOptions.context.modelId,
              workspaceDir: hookOptions.context.workspaceDir,
              messageProvider: hookOptions.context.messageProvider,
              messageChannel: hookOptions.context.messageChannel,
              config: hookOptions.context.config,
              toolName: normalizedName,
            }
          : undefined;

        // Run before_tool_call hooks
        if (hookRunner?.hasHooks("before_tool_call") && hookOptions && toolContext) {
          const hookResult = await hookRunner.runBeforeToolCall(
            {
              toolName: normalizedName,
              toolCallId: String(toolCallId ?? ""),
              params: effectiveParams as Record<string, unknown>,
              messages: hookOptions.getMessages(),
              systemPrompt: hookOptions.systemPrompt,
            },
            toolContext,
          );
          if (hookResult?.block) {
            return (
              hookResult.toolResult ??
              jsonResult({
                status: "blocked",
                tool: normalizedName,
                message: hookResult.blockReason ?? "Tool call blocked by policy.",
              })
            );
          }
          if (hookResult?.params) {
            effectiveParams = hookResult.params;
          }
        }

        // Notify handler that a client tool was called
        if (onClientToolCall) {
          onClientToolCall(func.name, effectiveParams as Record<string, unknown>);
        }

        // Return a pending result - the client will execute this tool
        let result = jsonResult({
          status: "pending",
          tool: func.name,
          message: "Tool execution delegated to client",
        });

        // Run after_tool_call hooks
        if (hookRunner?.hasHooks("after_tool_call") && hookOptions && toolContext) {
          const hookResult = await hookRunner.runAfterToolCall(
            {
              toolName: normalizedName,
              toolCallId: String(toolCallId ?? ""),
              params: effectiveParams as Record<string, unknown>,
              result,
              messages: hookOptions.getMessages(),
              systemPrompt: hookOptions.systemPrompt,
            },
            toolContext,
          );
          if (hookResult?.block) {
            return (
              hookResult.result ??
              jsonResult({
                status: "blocked",
                tool: normalizedName,
                message: hookResult.blockReason ?? "Tool result blocked by policy.",
              })
            );
          }
          if (hookResult?.result) {
            result = hookResult.result;
          }
        }

        return result;
      },
    } satisfies ToolDefinition;
  });
}
