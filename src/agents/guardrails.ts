/**
 * Guardrails Module
 *
 * This module previously contained the guardrail infrastructure and Gray Swan implementation.
 * The guardrail functionality has been migrated to the plugin hook system.
 *
 * Gray Swan guardrails are now implemented as a plugin: extensions/grayswan/index.ts
 *
 * The plugin hooks that replaced guardrails:
 * - before_request: Inspect/modify/block requests before the model call
 * - before_tool_call: Inspect/modify/block tool calls before execution
 * - after_tool_call: Inspect/modify tool results before they return to the model
 * - after_response: Inspect/modify/block assistant responses
 *
 * See src/plugins/types.ts for the hook type definitions.
 * See docs/gateway/guardrails.md for configuration documentation.
 */

// Re-export the guardrail stage type for backwards compatibility with any code that might reference it
export type GuardrailStage =
  | "before_request"
  | "after_response"
  | "before_tool_call"
  | "after_tool_call";
