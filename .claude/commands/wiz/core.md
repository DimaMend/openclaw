---
description: Summon architecture wizard - prime agent with Clawdbot product internals
allowed-tools: [Read, Glob, Grep, Task, Write, Bash]
argument-hint: "[output-file]"
---

# Wizard: Clawdbot Core Architecture

You are summoning an architecture wizard. Prime yourself with deep understanding of Clawdbot's product architecture for an interactive session.

**Arguments:** $ARGUMENTS

**Output file:** `$ARGUMENTS` (default: `/dev/null`)
- Use `stdout` to display report on screen
- Use a file path to write report to that location
- Default `/dev/null` suppresses output

## CRITICAL: No Cheating

You MUST explore the codebase and build understanding regardless of output destination.
The exploration happens always - the argument only controls where the report is written.

Generate your internal summary to ensure context is loaded. Then write it to the specified destination.

---

## Phase 1: Explore Project Structure

Use the Explore agent or direct file reads to map the codebase:

```
src/
├── gateway/        # WebSocket control plane
├── agents/         # Agent runtime, tools, model selection
├── providers/      # Provider registry and metadata
├── routing/        # Session routing and agent binding
├── config/         # Configuration loading and types
├── auto-reply/     # Message processing pipeline
├── commands/       # CLI commands
├── telegram/       # Telegram provider
├── whatsapp/       # WhatsApp provider (Baileys)
├── discord/        # Discord provider
├── slack/          # Slack provider
├── signal/         # Signal provider
├── imessage/       # iMessage provider
└── ...
```

**Read these key files:**

| Priority | File | Purpose |
|----------|------|---------|
| 1 | `src/config/types.ts` | ClawdbotConfig schema - the configuration shape |
| 2 | `src/gateway/server.ts` | Gateway WebSocket server - the control plane |
| 3 | `src/gateway/protocol/schema.ts` | Protocol types (GatewayFrame, ChatEvent) |
| 4 | `src/routing/resolve-route.ts` | Session routing logic |
| 5 | `src/auto-reply/reply.ts` | Message processing entry point |
| 6 | `src/agents/pi-embedded-runner.ts` | Agent runtime |
| 7 | `src/utils/message-provider.ts` | Provider type definitions |

---

## Phase 2: Trace Message Flow

Understand how a message flows through the system:

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. INBOUND MESSAGE                                              │
│    Provider receives message → normalized to internal format    │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 2. GATEWAY INGESTION                                            │
│    gateway/server-chat.ts → normalize provider + peer           │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 3. ROUTING & SESSION                                            │
│    routing/resolve-route.ts → match bindings → session key      │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 4. MESSAGE PROCESSING                                           │
│    auto-reply/reply.ts → parse directives → load session        │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 5. AGENT EXECUTION                                              │
│    agents/pi-embedded-runner.ts → stream response → tools       │
└────────────────────┬────────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────────┐
│ 6. RESPONSE DELIVERY                                            │
│    ChatEvent broadcast → provider sends to user                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Phase 3: Identify Key Abstractions

Build understanding of these core concepts:

| Abstraction | Purpose | Key Files |
|-------------|---------|-----------|
| **Provider** | Messaging platform integration | `src/utils/message-provider.ts`, `src/{provider}/` |
| **Session** | Conversation state and history | `src/config/sessions.ts`, `src/routing/` |
| **Agent** | AI runtime with tools | `src/agents/`, `src/auto-reply/reply/agent-runner.ts` |
| **Gateway** | WebSocket control plane | `src/gateway/server.ts` |
| **Tool** | Agent capabilities (bash, browser, etc.) | `src/agents/tools/` |

---

## Phase 4: Generate Report

Create a concise internal summary covering:
- Modules and their responsibilities
- Message data flow
- Key abstractions
- Entry points

**Report content:**

```
Clawdbot Architecture Primed
============================

Modules:
  gateway/     WebSocket control plane, event broadcasting
  agents/      Agent runtime, tool execution, model selection
  routing/     Session routing, agent binding resolution
  auto-reply/  Message processing pipeline, directive parsing
  config/      Configuration schema, sessions, storage
  providers/   WhatsApp, Telegram, Discord, Slack, Signal, iMessage

Entry Point: src/gateway/server.ts (WebSocket server on port 18789)

Message Flow:
  Provider → Gateway → Routing → Session → Agent → Response → Provider

Key Abstractions:
  Provider   Messaging platform (WhatsApp, Telegram, etc.)
  Session    Conversation state per peer
  Agent      AI runtime with tools
  Gateway    Central control plane

Ready for questions about architecture, data flow, or implementation.
```

**Output handling:**

1. Determine output destination from `$ARGUMENTS` (default: `/dev/null`)
2. If argument is empty or `/dev/null`: Write nothing, just confirm "Primed for Clawdbot architecture questions."
3. If argument is `stdout`: Display the report above directly to user
4. If argument is a file path: Use Write tool to save the report to that path, then confirm "Report written to [path]. Primed for Clawdbot architecture questions."

---

## Ready

You are now an architecture expert. Answer questions with confidence, referencing specific files and line numbers. If asked about something you didn't explore, read the relevant files first.
