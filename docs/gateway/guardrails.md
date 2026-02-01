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

1. `beforeRequest` — inspect and optionally modify the user prompt and message history before the model call.
2. `beforeToolCall` — inspect and optionally modify tool call arguments before a tool executes.
3. `afterToolCall` — inspect and optionally modify tool results before they go back to the model.
4. `afterResponse` — inspect and optionally modify the assistant response before it is returned.

Within a stage, guardrails run by descending `priority` (default `0`).
If any guardrail **blocks**, later guardrails do not run for that stage.

## Guardrail interface

Guardrails register with the in process registry and implement stage handlers:

```ts
type Guardrail = {
  id: string;
  priority?: number;
  beforeRequest?: (input, context) => GuardrailPromptDecision | void;
  beforeToolCall?: (input, context) => GuardrailToolCallDecision | void;
  afterToolCall?: (input, context) => GuardrailToolResultDecision | void;
  afterResponse?: (input, context) => GuardrailOutputDecision | void;
};
```

Each handler can return a decision with an `action`:

- `allow`: keep the payload unchanged.
- `modify`: rewrite the payload and keep going.
- `block`: stop the stage and return a guardrail response.

The payloads that can be modified:

- `beforeRequest`: `prompt` and `messages`.
- `beforeToolCall`: tool `params`, or return a `toolResult` to skip execution.
- `afterToolCall`: the `toolResult` before it is sent back to the model.
- `afterResponse`: `assistantTexts` before the response is returned.

### Stage payloads

OpenClaw always sends **messages** to Gray Swan, never the `text` field.

Each stage uses a different view of the conversation:

- `beforeRequest`: history + the current **user** prompt
- `beforeToolCall`: history + a synthetic **assistant** message that summarizes the tool call
- `afterToolCall`: history + a synthetic **tool** message that contains the tool result text
- `afterResponse`: history + the final **assistant** response text

History is included by default (`includeHistory: true`).

## Gray Swan configuration

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

- `beforeRequest` blocks the model call and returns a guardrail response.
- `beforeToolCall` blocks the tool call and returns a synthetic tool result with a guardrail warning.
- `afterToolCall` mutates the tool result before the model sees it:
  - `blockMode: "append"` adds a warning to the tool result content
  - `blockMode: "replace"` replaces the tool result with a guardrail warning
- `afterResponse` replaces the assistant response (or appends a warning if `blockMode: "append"`).

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
