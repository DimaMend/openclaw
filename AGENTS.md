# Repository Guidelines
- Repo: https://github.com/moltbot/moltbot
- GitHub issues/comments/PR comments: use literal multiline strings or `-F - <<'EOF'` (or $'...') for real newlines; never embed "\\n".

## Project Structure & Module Organization
- Source code: `src/` (CLI wiring in `src/cli`, commands in `src/commands`, web provider in `src/provider-web.ts`, infra in `src/infra`, media pipeline in `src/media`).
- Tests: colocated `*.test.ts`.
- Docs: `docs/` (images, queue, Pi config). Built output lives in `dist/`.
- Plugins/extensions: live under `extensions/*` (workspace packages). Keep plugin-only deps in the extension `package.json`; do not add them to the root `package.json` unless core uses them.
- Plugins: install runs `npm install --omit=dev` in plugin dir; runtime deps must live in `dependencies`. Avoid `workspace:*` in `dependencies` (npm install breaks); put `moltbot` in `devDependencies` or `peerDependencies` instead (runtime resolves `clawdbot/plugin-sdk` via jiti alias).
- Installers served from `https://molt.bot/*`: live in the sibling repo `../molt.bot` (`public/install.sh`, `public/install-cli.sh`, `public/install.ps1`).
- Messaging channels: always consider **all** built-in + extension channels when refactoring shared logic (routing, allowlists, pairing, command gating, onboarding, docs).
  - Core channel docs: `docs/channels/`
  - Core channel code: `src/telegram`, `src/discord`, `src/slack`, `src/signal`, `src/imessage`, `src/web` (WhatsApp web), `src/channels`, `src/routing`
  - Extensions (channel plugins): `extensions/*` (e.g. `extensions/msteams`, `extensions/matrix`, `extensions/zalo`, `extensions/zalouser`, `extensions/voice-call`)
- When adding channels/extensions/apps/docs, review `.github/labeler.yml` for label coverage.

## Docs Linking (Mintlify)
- Docs are hosted on Mintlify (docs.molt.bot).
- Internal doc links in `docs/**/*.md`: root-relative, no `.md`/`.mdx` (example: `[Config](/configuration)`).
- Section cross-references: use anchors on root-relative paths (example: `[Hooks](/configuration#hooks)`).
- Doc headings and anchors: avoid em dashes and apostrophes in headings because they break Mintlify anchor links.
- When Peter asks for links, reply with full `https://docs.molt.bot/...` URLs (not root-relative).
- When you touch docs, end the reply with the `https://docs.molt.bot/...` URLs you referenced.
- README (GitHub): keep absolute docs URLs (`https://docs.molt.bot/...`) so links work on GitHub.
- Docs content must be generic: no personal device names/hostnames/paths; use placeholders like `user@gateway-host` and "gateway host".

## exe.dev VM ops (general)
- Access: stable path is `ssh exe.dev` then `ssh vm-name` (assume SSH key already set).
- SSH flaky: use exe.dev web terminal or Shelley (web agent); keep a tmux session for long ops.
- Update: `sudo npm i -g moltbot@latest` (global install needs root on `/usr/lib/node_modules`).
- Config: use `moltbot config set ...`; ensure `gateway.mode=local` is set.
- Discord: store raw token only (no `DISCORD_BOT_TOKEN=` prefix).
- Restart: stop old gateway and run:
  `pkill -9 -f moltbot-gateway || true; nohup moltbot gateway run --bind loopback --port 18789 --force > /tmp/moltbot-gateway.log 2>&1 &`
- Verify: `moltbot channels status --probe`, `ss -ltnp | rg 18789`, `tail -n 120 /tmp/moltbot-gateway.log`.

## Build, Test, and Development Commands
- Runtime baseline: Node **22+** (keep Node + Bun paths working).
- Install deps: `pnpm install`
- Pre-commit hooks: `prek install` (runs same checks as CI)
- Also supported: `bun install` (keep `pnpm-lock.yaml` + Bun patching in sync when touching deps/patches).
- Prefer Bun for TypeScript execution (scripts, dev, tests): `bun <file.ts>` / `bunx <tool>`.
- Run CLI in dev: `pnpm moltbot ...` (bun) or `pnpm dev`.
- Node remains supported for running built output (`dist/*`) and production installs.
- Mac packaging (dev): `scripts/package-mac-app.sh` defaults to current arch. Release checklist: `docs/platforms/mac/release.md`.
- Type-check/build: `pnpm build` (tsc)
- Lint: `pnpm lint` (oxlint with `--type-aware`). Fix: `pnpm lint:fix`.
- Format check: `pnpm format` (oxfmt `--check`). Fix: `pnpm format:fix` (oxfmt `--write`).
- Tests: `pnpm test` (vitest via parallel runner); coverage: `pnpm test:coverage`.
- Run a **single test file**: `npx vitest run src/path/to/file.test.ts` (or `bunx vitest run ...`).
- Run tests **matching a name**: `npx vitest run -t "test name pattern"`.
- Watch mode: `pnpm test:watch`.
- E2E tests: `pnpm test:e2e` (vitest with `vitest.e2e.config.ts`).
- Live tests (real keys): `CLAWDBOT_LIVE_TEST=1 pnpm test:live`.
- Full local gate (run before landing PRs): `pnpm lint && pnpm build && pnpm test`.
- CI runs: lint, format check, build (tsc), tests (node + bun), protocol check — all on every push/PR.

## Coding Style & Naming Conventions
- Language: TypeScript (ESM, `"type": "module"`). `strict: true` in tsconfig.
- Target: ES2022, NodeNext module resolution.
- Formatting/linting via **oxlint** and **oxfmt** (not eslint/prettier); run `pnpm lint` before commits.
- oxlint config: `.oxlintrc.json` — plugins: `unicorn`, `typescript`, `oxc`; correctness category = error.
- Add brief code comments for tricky or non-obvious logic.
- Keep files concise; extract helpers instead of "V2" copies. Use existing patterns for CLI options and dependency injection via `createDefaultDeps`.
- Aim to keep files under ~500 LOC (guideline, not hard guardrail). `pnpm check:loc` enforces `--max 500`.
- Naming: use **Moltbot** for product/app/docs headings; use `moltbot` for CLI command, package/binary, paths, and config keys.

### Import Conventions
- Node built-ins: use `node:` prefix (e.g. `import fs from "node:fs"`, `import path from "node:path"`).
- Order: node built-ins → external packages → local modules (separated by blank lines).
- Use `import type { Foo } from "..."` for type-only imports; inline `type` in mixed imports when only some are types: `import { type Foo, bar } from "..."`.
- Local imports use `.js` extension (ESM requirement): `import { foo } from "./bar.js"`.
- Barrel re-exports allowed in module index files (e.g. `src/config/config.ts` re-exports from submodules).

### TypeScript Patterns
- Strict mode with `noEmitOnError`. No `any`, `@ts-ignore`, or `@ts-expect-error`.
- Validation: Zod (`zod` v4) for config/schema validation. TypeBox (`@sinclair/typebox`) for tool input schemas.
- Use `as const` for constant arrays/objects; derive types with `typeof X[number]`.
- Avoid `Type.Union` in tool schemas; use `stringEnum`/`optionalStringEnum` (Type.Unsafe enum) for string lists.
- Avoid raw `format` property names in tool schemas (reserved keyword in some validators).
- Prefer `Type.Optional(...)` over `... | null` in tool schemas.

### Naming
- Files: `kebab-case.ts` (e.g. `session-utils.ts`, `parse-log-line.ts`).
- Functions/variables: `camelCase` (e.g. `loadConfig`, `resolveMainSessionKey`).
- Types/interfaces: `PascalCase` (e.g. `MoltbotConfig`, `SessionEntry`, `ChannelMeta`).
- Constants: `UPPER_SNAKE_CASE` for true constants (e.g. `DEFAULT_LOG_DIR`, `MAX_LOG_AGE_MS`).
- Test files: `*.test.ts` colocated with source. E2E: `*.e2e.test.ts`. Live: `*.live.test.ts`.

### Error Handling
- Prefer explicit error types; avoid empty `catch {}` blocks.
- Logging errors: use `tslog` via `src/logging/logger.ts`; never hand-roll loggers.
- CLI progress: use `src/cli/progress.ts` (`osc-progress` + `@clack/prompts` spinner); don't hand-roll spinners/bars.
- Status output: keep tables + ANSI-safe wrapping (`src/terminal/table.ts`).
- Colors: use shared CLI palette in `src/terminal/palette.ts` (no hardcoded ANSI colors).

### Testing Patterns
- Framework: Vitest (`describe`/`it`/`expect`). Test timeout: 120s. Pool: `forks`.
- Mocking: `vi.fn()`, `vi.mock()`. Tests use a global setup file (`test/setup.ts`) that installs an isolated test home and plugin registry.
- Assertions: `expect(x).toBe(y)`, `expect(fn).toHaveBeenCalledTimes(n)`, `expect(promise).rejects.toThrow("msg")`.
- Coverage: V8 provider, thresholds 70% lines/functions/statements, 55% branches.
- Do not set test workers above 16.
- Pure test additions/fixes generally do **not** need a changelog entry unless they alter user-facing behavior.

## Release Channels (Naming)
- stable: tagged releases only (e.g. `vYYYY.M.D`), npm dist-tag `latest`.
- beta: prerelease tags `vYYYY.M.D-beta.N`, npm dist-tag `beta` (may ship without macOS app).
- dev: moving head on `main` (no tag; git checkout main).

## Commit & Pull Request Guidelines
- Create commits with `scripts/committer "<msg>" <file...>`; avoid manual `git add`/`git commit` so staging stays scoped.
- Follow concise, action-oriented commit messages (e.g., `CLI: add verbose flag to send`).
- Group related changes; avoid bundling unrelated refactors.
- Changelog workflow: keep latest released version at top (no `Unreleased`); after publishing, bump version and start a new top section.
- PRs should summarize scope, note testing performed, and mention any user-facing changes or new flags.
- PR review flow: when given a PR link, review via `gh pr view`/`gh pr diff` and do **not** change branches.
- PR review calls: prefer a single `gh pr view --json ...` to batch metadata/comments; run `gh pr diff` only when needed.
- Before starting a review when a GH Issue/PR is pasted: run `git pull`; if there are local changes or unpushed commits, stop and alert the user before reviewing.
- Goal: merge PRs. Prefer **rebase** when commits are clean; **squash** when history is messy.
- PR merge flow: create a temp branch from `main`, merge the PR branch into it (prefer squash unless commit history is important; use rebase/merge when it is). Always try to merge the PR unless it's truly difficult, then use another approach. If we squash, add the PR author as a co-contributor. Apply fixes, add changelog entry (include PR # + thanks), run full gate before the final commit, commit, merge back to `main`, delete the temp branch, and end on `main`.
- If you review a PR and later do work on it, land via merge/squash (no direct-main commits) and always add the PR author as a co-contributor.
- When working on a PR: add a changelog entry with the PR number and thank the contributor.
- When working on an issue: reference the issue in the changelog entry.
- When merging a PR: leave a PR comment that explains exactly what we did and include the SHA hashes.
- When merging a PR from a new contributor: add their avatar to the README "Thanks to all clawtributors" thumbnail list.
- After merging a PR: run `bun scripts/update-clawtributors.ts` if the contributor is missing, then commit the regenerated README.

## Shorthand Commands
- `sync`: if working tree is dirty, commit all changes (pick a sensible Conventional Commit message), then `git pull --rebase`; if rebase conflicts and cannot resolve, stop; otherwise `git push`.

### PR Workflow (Review vs Land)
- **Review mode (PR link only):** read `gh pr view/diff`; **do not** switch branches; **do not** change code.
- **Landing mode:** create an integration branch from `main`, bring in PR commits (**prefer rebase** for linear history; **merge allowed** when complexity/conflicts make it safer), apply fixes, add changelog (+ thanks + PR #), run full gate **locally before committing** (`pnpm lint && pnpm build && pnpm test`), commit, merge back to `main`, then `git switch main` (never stay on a topic branch after landing). Important: contributor needs to be in git graph after this!

## Security & Configuration Tips
- Web provider stores creds at `~/.clawdbot/credentials/`; rerun `moltbot login` if logged out.
- Pi sessions live under `~/.clawdbot/sessions/` by default; the base directory is not configurable.
- Environment variables: see `~/.profile`.
- Never commit or publish real phone numbers, videos, or live configuration values. Use obviously fake placeholders in docs, tests, and examples.
 - Release flow: always read `docs/reference/RELEASING.md` and `docs/platforms/mac/release.md` before any release work; do not ask routine questions once those docs answer them.

## Troubleshooting
- Rebrand/migration issues or legacy config/service warnings: run `moltbot doctor` (see `docs/gateway/doctor.md`).

## Agent-Specific Notes
- Vocabulary: "makeup" = "mac app".
- Never edit `node_modules` (global/Homebrew/npm/git installs too). Updates overwrite. Skill notes go in `tools.md` or `AGENTS.md`.
- Signal: "update fly" => `fly ssh console -a flawd-bot -C "bash -lc 'cd /data/clawd/moltbot && git pull --rebase origin main'"` then `fly machines restart e825232f34d058 -a flawd-bot`.
- When working on a GitHub Issue or PR, print the full URL at the end of the task.
- When answering questions, respond with high-confidence answers only: verify in code; do not guess.
- Never update the Carbon dependency.
- Any dependency with `pnpm.patchedDependencies` must use an exact version (no `^`/`~`).
- Patching dependencies (pnpm patches, overrides, or vendored changes) requires explicit approval; do not do this by default.
- CLI progress: use `src/cli/progress.ts` (`osc-progress` + `@clack/prompts` spinner); don't hand-roll spinners/bars.
- Status output: keep tables + ANSI-safe wrapping (`src/terminal/table.ts`); `status --all` = read-only/pasteable, `status --deep` = probes.
- Gateway currently runs only as the menubar app; there is no separate LaunchAgent/helper label installed. Restart via the Moltbot Mac app or `scripts/restart-mac.sh`; to verify/kill use `launchctl print gui/$UID | grep moltbot` rather than assuming a fixed label. **When debugging on macOS, start/stop the gateway via the app, not ad-hoc tmux sessions; kill any temporary tunnels before handoff.**
- macOS logs: use `./scripts/clawlog.sh` to query unified logs for the Moltbot subsystem; it supports follow/tail/category filters and expects passwordless sudo for `/usr/bin/log`.
- If shared guardrails are available locally, review them; otherwise follow this repo's guidance.
- SwiftUI state management (iOS/macOS): prefer the `Observation` framework (`@Observable`, `@Bindable`) over `ObservableObject`/`@StateObject`; don't introduce new `ObservableObject` unless required for compatibility, and migrate existing usages when touching related code.
- Connection providers: when adding a new connection, update every UI surface and docs (macOS app, web UI, mobile if applicable, onboarding/overview docs) and add matching status + configuration forms so provider lists and settings stay in sync.
- Version locations: `package.json` (CLI), `apps/android/app/build.gradle.kts` (versionName/versionCode), `apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `apps/macos/Sources/Moltbot/Resources/Info.plist` (CFBundleShortVersionString/CFBundleVersion), `docs/install/updating.md` (pinned npm version), `docs/platforms/mac/release.md` (APP_VERSION/APP_BUILD examples), Peekaboo Xcode projects/Info.plists (MARKETING_VERSION/CURRENT_PROJECT_VERSION).
- **Restart apps:** "restart iOS/Android apps" means rebuild (recompile/install) and relaunch, not just kill/launch.
- **Device checks:** before testing, verify connected real devices (iOS/Android) before reaching for simulators/emulators.
- iOS Team ID lookup: `security find-identity -p codesigning -v` → use Apple Development (…) TEAMID. Fallback: `defaults read com.apple.dt.Xcode IDEProvisioningTeamIdentifiers`.
- A2UI bundle hash: `src/canvas-host/a2ui/.bundle.hash` is auto-generated; ignore unexpected changes, and only regenerate via `pnpm canvas:a2ui:bundle` (or `scripts/bundle-a2ui.sh`) when needed. Commit the hash as a separate commit.
- Release signing/notary keys are managed outside the repo; follow internal release docs.
- Notary auth env vars (`APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_API_KEY_P8`) are expected in your environment (per internal release docs).
- **Multi-agent safety:** do **not** create/apply/drop `git stash` entries unless explicitly requested (this includes `git pull --rebase --autostash`). Assume other agents may be working; keep unrelated WIP untouched and avoid cross-cutting state changes.
- **Multi-agent safety:** when the user says "push", you may `git pull --rebase` to integrate latest changes (never discard other agents' work). When the user says "commit", scope to your changes only. When the user says "commit all", commit everything in grouped chunks.
- **Multi-agent safety:** do **not** create/remove/modify `git worktree` checkouts (or edit `.worktrees/*`) unless explicitly requested.
- **Multi-agent safety:** do **not** switch branches / check out a different branch unless explicitly requested.
- **Multi-agent safety:** running multiple agents is OK as long as each agent has its own session.
- **Multi-agent safety:** when you see unrecognized files, keep going; focus on your changes and commit only those.
- Lint/format churn:
  - If staged+unstaged diffs are formatting-only, auto-resolve without asking.
  - If commit/push already requested, auto-stage and include formatting-only follow-ups in the same commit (or a tiny follow-up commit if needed), no extra confirmation.
  - Only ask when changes are semantic (logic/data/behavior).
- Lobster seam: use the shared CLI palette in `src/terminal/palette.ts` (no hardcoded colors); apply palette to onboarding/config prompts and other TTY UI output as needed.
- **Multi-agent safety:** focus reports on your edits; avoid guard-rail disclaimers unless truly blocked; when multiple agents touch the same file, continue if safe; end with a brief "other files present" note only if relevant.
- Bug investigations: read source code of relevant npm dependencies and all related local code before concluding; aim for high-confidence root cause.
- Code style: add brief comments for tricky logic; keep files under ~500 LOC when feasible (split/refactor as needed).
- Tool schema guardrails (google-antigravity): avoid `Type.Union` in tool input schemas; no `anyOf`/`oneOf`/`allOf`. Use `stringEnum`/`optionalStringEnum` (Type.Unsafe enum) for string lists, and `Type.Optional(...)` instead of `... | null`. Keep top-level tool schema as `type: "object"` with `properties`.
- Tool schema guardrails: avoid raw `format` property names in tool schemas; some validators treat `format` as a reserved keyword and reject the schema.
- When asked to open a "session" file, open the Pi session logs under `~/.clawdbot/agents/<agentId>/sessions/*.jsonl` (use the `agent=<id>` value in the Runtime line of the system prompt; newest unless a specific ID is given), not the default `sessions.json`. If logs are needed from another machine, SSH via Tailscale and read the same path there.
- Do not rebuild the macOS app over SSH; rebuilds must be run directly on the Mac.
- Never send streaming/partial replies to external messaging surfaces (WhatsApp, Telegram); only final replies should be delivered there. Streaming/tool events may still go to internal UIs/control channel.
- Voice wake forwarding tips:
  - Command template should stay `moltbot-mac agent --message "${text}" --thinking low`; `VoiceWakeForwarder` already shell-escapes `${text}`. Don't add extra quotes.
  - launchd PATH is minimal; ensure the app's launch agent PATH includes standard system paths plus your pnpm bin (typically `$HOME/Library/pnpm`) so `pnpm`/`moltbot` binaries resolve when invoked via `moltbot-mac`.
- For manual `moltbot message send` messages that include `!`, use the heredoc pattern noted below to avoid the Bash tool's escaping.
- Release guardrails: do not change version numbers without operator's explicit consent; always ask permission before running any npm publish/release step.

## NPM + 1Password (publish/verify)
- Use the 1password skill; all `op` commands must run inside a fresh tmux session.
- Sign in: `eval "$(op signin --account my.1password.com)"` (app unlocked + integration on).
- OTP: `op read 'op://Private/Npmjs/one-time password?attribute=otp'`.
- Publish: `npm publish --access public --otp="<otp>"` (run from the package dir).
- Verify without local npmrc side effects: `npm view <pkg> version --userconfig "$(mktemp)"`.
- Kill the tmux session after publish.
