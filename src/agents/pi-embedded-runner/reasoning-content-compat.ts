import type { StreamFn } from "@mariozechner/pi-agent-core";
import type { Api, Model } from "@mariozechner/pi-ai";

/**
 * Providers like Kimi K2.5 stream thinking via `reasoning_content` but require
 * that field to be present on **every** assistant message when thinking is enabled —
 * including tool-call-only messages that have no thinking blocks.
 *
 * Pi-ai only adds `reasoning_content` to assistant messages that contain thinking blocks.
 * This wrapper intercepts the serialized API payload via `onPayload` and ensures every
 * assistant message includes the reasoning field when any message in the conversation uses it.
 */

/** Well-known reasoning field names used by OpenAI-compatible providers. */
const REASONING_FIELDS = ["reasoning_content", "reasoning", "reasoning_text"];

type ApiMessage = Record<string, unknown> & { role?: string };

function detectReasoningField(messages: ApiMessage[]): string | null {
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    for (const field of REASONING_FIELDS) {
      if (field in msg && msg[field] !== undefined) {
        return field;
      }
    }
  }
  return null;
}

function ensureReasoningFieldPresent(messages: ApiMessage[], field: string): void {
  for (const msg of messages) {
    if (msg.role !== "assistant") continue;
    if (!(field in msg) || msg[field] === undefined) {
      msg[field] = "";
    }
  }
}

/** @internal Exported for testing only. */
export function patchReasoningContentCompat(params: Record<string, unknown>): void {
  const messages = params.messages;
  if (!Array.isArray(messages)) return;

  const field = detectReasoningField(messages as ApiMessage[]);
  if (!field) return;

  ensureReasoningFieldPresent(messages as ApiMessage[], field);
}

/**
 * Wrap a streamFn to patch serialized API payloads so that every assistant message
 * includes the detected reasoning field (e.g. `reasoning_content`).
 */
export function wrapStreamFnForReasoningCompat(baseStreamFn: StreamFn): StreamFn {
  const wrapped: StreamFn = (model, context, options) => {
    const patchingOnPayload = (payload: unknown) => {
      if (payload && typeof payload === "object") {
        patchReasoningContentCompat(payload as Record<string, unknown>);
      }
      options?.onPayload?.(payload);
    };
    return baseStreamFn(model as Model<Api>, context, {
      ...options,
      onPayload: patchingOnPayload,
    });
  };
  return wrapped;
}
