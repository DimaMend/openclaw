# Gateway Server Tests Documentation

## Overview

The `src/gateway/` folder contains the WebSocket gateway server that bridges all Clawdis features (agents, chat, cron, models, providers, etc.) over WebSocket to external clients.

## Main Server Implementations

| File | Size | Purpose |
|------|------|---------|
| `server.ts` | 200KB | Main WebSocket gateway server - handles all RPC methods, events, client connections |
| `server-http.ts` | 8KB | HTTP helper functions for the gateway server |
| `server-providers.ts` | 18KB | Provider surface management (WhatsApp, Telegram, Discord, iMessage, Gmail) |
| `server-utils.ts` | 1KB | Utility functions for server operations |

## Test Files

These test files are **integration/e2e tests** for the **WebSocket gateway server**. They test the complete gateway functionality by:

1. **Starting a real WebSocket server** in-memory
2. **Connecting a mock WebSocket client**
3. **Sending JSON-RPC requests** and listening for responses/events
4. **Verifying behavior matches expectations**

| File | Size | What it tests |
|------|------|---------------|
| `server.agent.test.ts` | 13K | `agent` method - AI agent runs, allowFrom fallback, session routing, abort handling |
| `server.auth.test.ts` | 4K | Authentication - token auth, password auth, unauthorized rejection |
| `server.chat.test.ts` | 20K | `chat.*` methods - message sending, attachments, streaming reply chunks |
| `server.cron.test.ts` | 9.8K | Cron - schedule/unschedule jobs, run logs, isolated agent turns |
| `server.health.test.ts` | 8.4K | Health endpoint - status reporting, memory usage, active sessions |
| `server.hooks.test.ts` | 6.2K | Hooks - Gmail watcher start/stop, event emissions |
| `server.misc.test.ts` | 3.1K | Misc - config schema, surface status info |
| `server.models-voicewake.test.ts` | 7.2K | Models & VoiceWake - model catalog, voice wake routing |
| `server.node-bridge.test.ts` | 26K | Node/Bridge - API node pairing, bridge calls, connected clients, event streaming |
| `server.providers.test.ts` | 3.0K | Providers - probe surface availability, surface-specific auth |
| `server.sessions.test.ts` | 6.3K | Sessions - session store CRUD, session keys, last-channel tracking |

## Why Tests Live in the Gateway Folder

The gateway **bridges all Clawdis features** (agents, chat, cron, models, providers, etc.) over WebSocket. These tests **must be integration tests** that verify the full gateway protocol because:

1. **Gateway is the API surface** - it's how external clients (laptops, CLI, web UI) interact
2. **Protocol contract** - tests verify JSON-RPC method signatures match what clients expect
3. **Cross-feature integration** - the same WebSocket client may trigger agent runs, cron schedules, and provider events
4. **Real WebSocket behavior** - timing, connection lifecycle, streaming events need real sockets

## Test Helpers

The `server.test-helpers.ts` file provides utilities like:
- `startGatewayServer` - Start the test gateway instance
- `startServerWithClient` - Start server and connect a mock client
- `rpcReq` - Send JSON-RPC request and wait for response
- `connectOk` - Complete WebSocket handshake
- `onceMessage` - Wait for specific message type
- `installGatewayTestHooks` - Set up test isolation
