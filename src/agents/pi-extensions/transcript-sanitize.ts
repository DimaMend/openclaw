/**
 * Transcript repair/sanitization extension.
 *
 * Runs on every context build to prevent strict provider request rejections:
 * - duplicate or displaced tool results (Anthropic-compatible APIs, MiniMax, Cloud Code Assist)
 * - Cloud Code Assist tool call ID constraints + collision-safe sanitization
 */
import type { AgentMessage } from "@mariozechner/pi-agent-core";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { isGoogleModelApi } from "../pi-embedded-helpers.js";
import { repairToolUseResultPairing } from "../session-transcript-repair.js";
import { sanitizeToolCallIdsForCloudCodeAssist } from "../tool-call-id.js";

function isDeliveryMirrorMessage(message: AgentMessage): boolean {
  return (
    message &&
    typeof message === "object" &&
    (message as { role?: unknown }).role === "assistant" &&
    (message as { model?: unknown }).model === "delivery-mirror" &&
    (message as { provider?: unknown }).provider === "openclaw"
  );
}

function filterDeliveryMirrorMessages(messages: AgentMessage[]): AgentMessage[] {
  let touched = false;
  const out: AgentMessage[] = [];
  for (const msg of messages) {
    if (isDeliveryMirrorMessage(msg)) {
      touched = true;
      continue;
    }
    out.push(msg);
  }
  return touched ? out : messages;
}

export default function transcriptSanitizeExtension(api: ExtensionAPI): void {
  api.on("context", (event, ctx) => {
    let next = event.messages;
    const withoutDeliveryMirror = filterDeliveryMirrorMessages(next);
    if (withoutDeliveryMirror !== next) {
      next = withoutDeliveryMirror;
    }
    const repaired = repairToolUseResultPairing(next);
    if (repaired.messages !== next) {
      next = repaired.messages;
    }
    if (isGoogleModelApi(ctx.model?.api)) {
      const repairedIds = sanitizeToolCallIdsForCloudCodeAssist(next);
      if (repairedIds !== next) {
        next = repairedIds;
      }
    }
    if (next === event.messages) {
      return undefined;
    }
    return { messages: next };
  });
}
