# Repository Guidelines for Agents

- Repo: https://github.com/openclaw/openclaw
- GitHub issues/comments/PR comments: use literal multiline strings or `-F - <<'EOF'` (or $'...') for real newlines; never embed "\\n".

## Project Overview & Structure

OpenClaw is a personal AI assistant gateway. The codebase is organized into a main gateway, various communication channels, and a plugin/extension system.

### Core Modules Deep Dive
- **`src/gateway/`**: The WebSocket control plane. Handles session management, tool execution, and client connections.
- **`src/channels/`**: The abstraction layer for messaging surfaces. If adding a new channel, start here.
- **`src/providers/`**: Integrations with LLM providers (Anthropic, OpenAI, Ollama, etc.).
- **`src/media/`**: Unified media pipeline. Handles image resizing, audio transcoding (ElevenLabs/EdgeTTS), and video processing.
- **`src/infra/`**: Shared infrastructure. Includes `retry.ts`, `locking.ts`, `env.ts`, and `auth.ts`.
- **`src/plugin-sdk/`**: Public API for extensions. Exports types and base classes for channel/tool plugins.
- **`src/commands/`**: Command-line interface implementation using `commander`.

- **`extensions/`**: Workspace packages for external integrations. Each extension is a standalone package that can be installed into the gateway.
- **`apps/`**: Source code for platform-specific companion apps (Swift for macOS/iOS, Kotlin for Android).
- **`docs/`**: Documentation source (Markdown). Syncs to `docs.openclaw.ai`.
- **`scripts/`**: Essential dev scripts like `committer`, `protocol-gen`, and `watch-node`.

## Build, Test, and Development Commands

### Environment
- **Runtime**: Node.js **22.12.0+** is required. Bun is supported for fast TS execution.
- **Package Manager**: `pnpm` (preferred) or `bun`.

### Core Commands
- **Install Dependencies**: `pnpm install`
- **Build Project**: `pnpm build` (transpiles TS to `dist/`)
- **Lint & Format**: `pnpm check` (runs `oxlint`, `oxfmt`, and `tsgolint`)
- **Fix Lint/Format**: `pnpm lint:fix`
- **Run CLI in Dev**: `pnpm openclaw <args>` (runs via `tsx`) or `pnpm dev`.
- **Watch Mode**: `pnpm gateway:watch` (restarts gateway on changes)

### Testing (Vitest)
Tests are colocated with source files (e.g., `logger.ts` and `logger.test.ts`).
- **Run All Tests**: `pnpm test`
- **Run Single Test File**: `npx vitest <path/to/file.test.ts>`
- **Run with Coverage**: `pnpm test:coverage` (Threshold: 70% lines/branches)
- **E2E Tests**: `pnpm test:e2e` (Runs integration tests against a mock/test gateway)
- **Live Tests**: `CLAWDBOT_LIVE_TEST=1 pnpm test:live` (Requires real API keys/accounts; use with caution)
- **Docker E2E**: `pnpm test:docker:all` (Full suite including sandbox verification)

### Documentation & Research
- **Docs Index**: `docs/index.md`
- **Architecture**: `docs/architecture.md`
- **Configuration**: `docs/gateway/configuration.md` (Full key reference)
- **Agent Loop**: `docs/concepts/agent-loop.md`

## Coding Style & Naming Conventions

### TypeScript & ESM
- **Language**: Strict TypeScript. Avoid `any` at all costs. Use `unknown` or specific interfaces instead.
- **Module System**: ESM. Imports **must** use relative paths and include the `.js` extension (e.g., `import { foo } from './utils.js'`). This is strictly enforced by the Node.js runtime for ESM.
- **Types**: Use `type` for unions, aliases, and simple shapes. Use `interface` for object shapes intended for extension or implementation.
- **Async/Await**: Prefer `async/await` over raw Promises. Ensure all I/O is awaited and handled with `try-catch`.

### Naming
- **Product Name**: Always use **OpenClaw** in documentation, strings, and UI.
- **CLI/Binary**: Use `openclaw` (lowercase) for commands, paths, and configuration keys.
- **Variables/Functions**: `camelCase`.
- **Classes/Interfaces**: `PascalCase`.
- **Constants/Enums**: `UPPER_SNAKE_CASE` or `PascalCase` for Enums.
- **Private fields**: Use the `#privateField` syntax for true private class members.

### Composition & Maintenance
- **File Length**: Aim to keep files under **500 LOC**. Extract logic into smaller, testable helpers in `infra/` or `utils/`.
- **Dependency Injection**: Use `createDefaultDeps()` patterns for CLI commands to facilitate testing.
- **Comments**: Add brief JSDoc or line comments for non-obvious logic, especially in media processing or protocol handling.

## Error Handling & Logging

- **Logging**: Use `src/logger.ts`.
  - `logInfo`, `logWarn`, `logError`, `logDebug`.
  - Use `logVerbose` for info that only shows with the `--verbose` flag.
- **Retries**: For flaky network/API calls, use `retryAsync` from `src/infra/retry.ts`.
- **Try-Catch**: Mandatory for I/O and external API operations. Never use empty `catch` blocks without an explicit `// ignored` comment.

## Extension & Plugin Development

- Plugins live in `extensions/*` and should have their own `package.json`.
- **Dependency Management**: Do not add plugin-only dependencies to the root `package.json`.
- **SDK**: Use `@openclaw/plugin-sdk` to interact with the core gateway.

## Commit & Pull Request Guidelines

### Commits
- Use the committer script: `scripts/committer "<message>" <files...>`. This ensures scoped staging.
- Message Format: `Category: concise action message` (e.g., `WhatsApp: fix media upload retry`).

### Pull Requests
- Summarize the scope and specifically note any testing performed.
- Reference relevant GitHub issue numbers.
- **Changelog**: Add an entry to the top of `CHANGELOG.md` following the existing version format.

## Multi-Agent Safety & Security

- **No Secrets**: Never commit real credentials, phone numbers, or private config. Use placeholders.
- **Stash Safety**: Never use `git stash` without explicit user request. It can interfere with other concurrent agents.
- **WIP Isolation**: If you see unrecognized files or unrelated changes, ignore them. Focus only on your task.
- **Pre-commit**: Always run `pnpm check` or `prek install` before pushing to ensure CI passes.

## Agent-Specific Tips

- **CLI Progress**: Use `osc-progress` and `@clack/prompts` for spinners and progress bars.
- **Tool Schemas**: Avoid `Type.Union` in TypeBox schemas for tool inputs; use `stringEnum`.
- **Heredocs**: Use the heredoc pattern (`-F - <<'EOF'`) for complex bash commands involving special characters or newlines.
- **Verification**: Always verify changes by running `lsp_diagnostics` or the specific test file associated with your change.

---
*Note: No Cursor rules (.cursorrules) or Copilot instructions (.github/copilot-instructions.md) were found in this repository as of Feb 2026.*
