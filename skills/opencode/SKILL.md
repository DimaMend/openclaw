---
name: opencode
description: OpenCode CLI for multi-model AI coding assistance with Claude, GPT, and Gemini.
homepage: https://github.com/opencodeco/opencode
metadata: {"clawdis":{"emoji":"🔓","requires":{"bins":["opencode"]},"install":[{"id":"brew","kind":"brew","formula":"opencode","bins":["opencode"],"label":"Install OpenCode CLI (brew)"}]}}
---

# OpenCode CLI

Multi-provider AI coding assistant supporting Claude, GPT, Gemini, and free models.

## One-shot mode (non-interactive)

Use `opencode run` for non-interactive execution:
- `opencode run "Write a Python function that..."`
- `opencode run -m anthropic/claude-sonnet-4-5 "Complex task"`
- `opencode run -m openai/gpt-5.2 "Coding task"`
- `opencode run -m google/gemini-2.5-pro "Research task"`

## Interactive mode

- `opencode` — starts interactive TUI session
- `opencode -c` — continue last session
- `opencode -s <session-id>` — resume specific session

## Model management

- `opencode models` — list all available models
- `opencode models anthropic` — list models by provider
- `-m provider/model` — specify model for any command

## Session management

- `opencode session` — manage sessions
- `opencode export [sessionID]` — export session as JSON
- `opencode import <file>` — import session from JSON

## Available providers

- `anthropic/` — Claude models (haiku, sonnet, opus)
- `openai/` — GPT models (gpt-4o, gpt-5.x, o1, o3, o4)
- `google/` — Gemini models (flash, pro)
- `opencode/` — Free/budget models (minimax, grok-code)

## Notes

- Auth: run `opencode auth` to manage credentials
- Prefer `opencode run` when running from clawdis agent (non-interactive)
- Use `--print-logs` for debugging
