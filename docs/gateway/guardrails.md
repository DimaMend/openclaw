---
summary: "Guardrail stages, Gray Swan integration, and configuration options"
read_when:
  - Adding or tuning LLM guardrails
  - Investigating guardrail blocks
title: "Guardrails"
---

# Guardrails

Guardrails run inside the OpenClaw agent loop to inspect and optionally modify or block:

- **Requests** before they reach a model
- **Tool calls** before execution
- **Tool results** before they return to the model
- **Assistant responses** before they leave the agent

They are configured in `openclaw.json` under `guardrails`. See [/gateway/configuration](/gateway/configuration) for where that file lives.

## Stages

OpenClaw evaluates stages in this order:

1. `before_request` — inspect and optionally modify the user prompt and message history before the model call.
2. `before_tool_call` — inspect and optionally modify tool call arguments before a tool executes.
3. `after_tool_call` — inspect and optionally modify tool results before they go back to the model.
4. `after_response` — inspect and optionally modify the assistant response before it is returned.

Within a stage, hooks run by descending `priority` (default `0`).
If any hook **blocks**, later hooks do not run for that stage.

## Plugin hook interface

Guardrails are implemented using the plugin hook system. Plugins can register handlers for guardrail stages via `api.on()`:

```ts
// Example plugin registering guardrail hooks
export default {
  id: "my-guardrail",
  register(api) {
    api.on("before_request", async (event, ctx) => {
      // event: { prompt, messages, systemPrompt? }
      // Return to block or modify:
      // { block: true, blockResponse: "..." }
      // { prompt: "modified", messages: [...] }
    }, { priority: 50 });

    api.on("before_tool_call", async (event, ctx) => {
      // event: { toolName, toolCallId, params, messages, systemPrompt? }
      // Return to block or modify:
      // { block: true, blockReason: "...", toolResult?: {...} }
      // { params: { modified: true } }
    }, { priority: 50 });

    api.on("after_tool_call", async (event, ctx) => {
      // event: { toolName, toolCallId, params, result, messages, systemPrompt? }
      // Return to block or modify:
      // { block: true, result: {...} }
      // { result: modifiedResult }
    }, { priority: 50 });

    api.on("after_response", async (event, ctx) => {
      // event: { assistantTexts, messages, lastAssistant? }
      // Return to block or modify:
      // { block: true, blockResponse: "..." }
      // { assistantTexts: ["modified"] }
    }, { priority: 50 });
  }
};
```

Each handler can return a result with:

- `block: true` to stop processing and return a guardrail response
- Modified fields (`prompt`, `messages`, `params`, `result`, `assistantTexts`) to rewrite the payload
- Nothing (or `undefined`) to allow the payload unchanged

### Stage payloads

Each stage receives a different view of the conversation:

- `before_request`: history + the current **user** prompt
- `before_tool_call`: history + a synthetic **assistant** message that summarizes the tool call
- `after_tool_call`: history + a synthetic **tool** message that contains the tool result text
- `after_response`: history + the final **assistant** response text

## Gray Swan configuration

Gray Swan guardrails are implemented as a bundled plugin that registers handlers for all four stages.

Basic example:

```json
{
  "guardrails": {
    "grayswan": {
      "enabled": true,
      "apiKey": "${GRAYSWAN_API_KEY}",
      "apiBase": "https://api.grayswan.ai",
      "policyId": "pol_example",
      "violationThreshold": 0.5,
      "timeoutMs": 30000,
      "failOpen": true,
      "stages": {
        "beforeRequest": { "mode": "block" },
        "beforeToolCall": { "mode": "block" },
        "afterToolCall": {
          "mode": "block",
          "blockMode": "append",
          "blockOnMutation": true,
          "blockOnIpi": true
        },
        "afterResponse": { "mode": "block" }
      }
    }
  }
}
```

Notes:

- `apiKey` can be omitted if you set the `GRAYSWAN_API_KEY` environment variable.
- Config supports `${VAR_NAME}` substitution for environment variables.
- `apiBase` defaults to `https://api.grayswan.ai` (or `GRAYSWAN_API_BASE` if set).
- `policyId` maps to `policy_id` in `/cygnal/monitor` requests.
- `categories` and `reasoningMode` are forwarded as `categories` and `reasoning_mode`.

### Per stage options

Each stage can be configured with:

- `enabled`: default `true` when the stage entry exists
- `mode`: `block` or `monitor`
- `violationThreshold`: override the default threshold (0.0 to 1.0)
- `blockMode`: `replace` or `append` (defaults to `append` for `afterToolCall`, `replace` for others)
- `blockOnMutation`: default `true` only for `afterToolCall`
- `blockOnIpi`: default `true` only for `afterToolCall`
- `includeHistory`: default `true`

### Block behavior

When Gray Swan flags a violation and `mode: "block"`:

- `before_request` blocks the model call and returns a guardrail response.
- `before_tool_call` blocks the tool call and returns a synthetic tool result with a guardrail warning.
- `after_tool_call` mutates the tool result before the model sees it:
  - `blockMode: "append"` adds a warning to the tool result content
  - `blockMode: "replace"` replaces the tool result with a guardrail warning
- `after_response` replaces the assistant response (or appends a warning if `blockMode: "append"`).

If `mode: "monitor"`, OpenClaw only logs the evaluation and leaves the payload unchanged.

### Tool call summary format

The guardrail tool call summary is a JSON object encoded as text:

```json
{
  "tool": "tool_name",
  "toolCallId": "call_123",
  "params": { "any": "json" }
}
```

### Tool result input

Tool results are sent as a single text block.
If the tool result does not contain text, the guardrail stage is skipped.

## Troubleshooting

- Use `openclaw gateway run --verbose` and `openclaw logs --follow` to see guardrail events.
- Guardrail errors follow `failOpen`: when `true`, errors are logged but do not block.
- If you see unexpected blocking, confirm the effective `violationThreshold` and stage config.
