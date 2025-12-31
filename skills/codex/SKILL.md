---
name: codex
description: OpenAI Codex CLI for code generation, review, and one-shot prompts using GPT models.
homepage: https://github.com/openai/codex
metadata: {"clawdis":{"emoji":"🤖","requires":{"bins":["codex"]},"install":[{"id":"brew","kind":"brew","formula":"openai-codex","bins":["codex"],"label":"Install Codex CLI (brew)"}]}}
---

# Codex CLI

Use OpenAI's Codex CLI for code generation, review, and one-shot prompts with GPT models.

## One-shot mode (non-interactive)

Use `codex exec` for non-interactive execution:
- `codex exec "Write a Python function that..."`
- `codex exec --model gpt-4o "Complex coding task"`
- `codex exec --model o3 "Reasoning-heavy task"`

## Code review

- `codex review` — review staged changes
- `codex review --diff HEAD~1` — review last commit

## Interactive mode

- `codex "Your prompt"` — starts interactive session
- `codex resume --last` — resume previous session

## Apply changes

- `codex apply` — apply last diff from agent to working tree

## Notes

- Auth: run `codex login` if not authenticated
- Models: gpt-4o (default), o3, o4-mini available
- Avoid interactive mode when running from clawdis agent; prefer `codex exec`
