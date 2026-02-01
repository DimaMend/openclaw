# 仓库指南

- Repo: https://github.com/openclaw/openclaw
- GitHub issues/comments/PR comments: 使用真实多行字符串或 `-F - <<'EOF'`（或 $'...'）来保留换行；不要嵌入 "\\n"。

## 项目结构与模块组织

- 源码: `src/`（CLI 连接在 `src/cli`，命令在 `src/commands`，Web provider 在 `src/provider-web.ts`，基础设施在 `src/infra`，媒体管线在 `src/media`）。
- 测试: 与源码同目录的 `*.test.ts`。
- 文档: `docs/`（图片、队列、Pi 配置）。构建输出在 `dist/`。
- 插件/扩展: 在 `extensions/*`（workspace 包）。插件专用依赖放在扩展的 `package.json`；除非核心也用，否则不要加到根 `package.json`。
- 插件: 安装会在插件目录运行 `npm install --omit=dev`；运行时依赖必须放在 `dependencies`。避免在 `dependencies` 里用 `workspace:*`（`npm install` 会坏）；把 `openclaw` 放在 `devDependencies` 或 `peerDependencies`（运行时通过 jiti alias 解析 `openclaw/plugin-sdk`）。
- 由 `https://openclaw.ai/*` 提供的安装器: 位于兄弟仓库 `../openclaw.ai`（`public/install.sh`、`public/install-cli.sh`、`public/install.ps1`）。
- 消息通道: 重构共享逻辑时务必考虑 **所有** 内置 + 扩展通道（路由、allowlist、配对、命令门控、引导、文档）。
  - 核心通道文档: `docs/channels/`
  - 核心通道代码: `src/telegram`、`src/discord`、`src/slack`、`src/signal`、`src/imessage`、`src/web`（WhatsApp web）、`src/channels`、`src/routing`
  - 扩展（通道插件）: `extensions/*`（例如 `extensions/msteams`、`extensions/matrix`、`extensions/zalo`、`extensions/zalouser`、`extensions/voice-call`）
- 新增通道/扩展/应用/文档时，检查 `.github/labeler.yml` 是否覆盖对应标签。

## Docs 链接（Mintlify）

- Docs 托管在 Mintlify（docs.openclaw.ai）。
- `docs/**/*.md` 内部文档链接: 根路径、无 `.md`/`.mdx`（示例: `[Config](/configuration)`）。
- 章节交叉引用: 使用根路径 + anchor（示例: `[Hooks](/configuration#hooks)`）。
- 文档标题与锚点: 避免在标题中用长破折号和撇号（会导致 Mintlify 锚点失效）。
- Peter 询问链接时，回复完整 `https://docs.openclaw.ai/...` URL（不要用根路径）。
- 当你修改文档时，在回复末尾附上你引用的 `https://docs.openclaw.ai/...` URL。
- README（GitHub）: 保持绝对文档 URL（`https://docs.openclaw.ai/...`），这样 GitHub 上链接可用。
- Docs 内容必须通用: 不要使用个人设备名/主机名/路径；用 `user@gateway-host` 和 “gateway host” 之类的占位符。

## exe.dev VM 运维（通用）

- 访问: 稳定路径为 `ssh exe.dev` 然后 `ssh vm-name`（假设 SSH key 已配置）。
- SSH 不稳定时: 使用 exe.dev web terminal 或 Shelley（web agent）；长操作保留 tmux 会话。
- 更新: `sudo npm i -g openclaw@latest`（全局安装需要 `/usr/lib/node_modules` 的 root 权限）。
- 配置: 使用 `openclaw config set ...`；确保 `gateway.mode=local` 已设置。
- Discord: 只保存原始 token（不要加 `DISCORD_BOT_TOKEN=` 前缀）。
- 重启: 停旧网关后运行：
  `pkill -9 -f openclaw-gateway || true; nohup openclaw gateway run --bind loopback --port 18789 --force > /tmp/openclaw-gateway.log 2>&1 &`
- 验证: `openclaw channels status --probe`、`ss -ltnp | rg 18789`、`tail -n 120 /tmp/openclaw-gateway.log`。

## 构建、测试与开发命令

- 运行时基线: Node **22+**（保持 Node + Bun 路径可用）。
- 安装依赖: `pnpm install`
- 预提交 hooks: `prek install`（与 CI 检查一致）
- 也支持: `bun install`（触及依赖/补丁时保持 `pnpm-lock.yaml` + Bun patch 同步）。
- TypeScript 执行优先用 Bun（脚本/开发/测试）: `bun <file.ts>` / `bunx <tool>`。
- 开发运行 CLI: `pnpm openclaw ...`（bun）或 `pnpm dev`。
- Node 仍支持用于运行构建产物（`dist/*`）和生产安装。
- Mac 打包（开发）: `scripts/package-mac-app.sh` 默认当前架构。发布清单: `docs/platforms/mac/release.md`。
- 类型检查/构建: `pnpm build`
- Lint/格式化: `pnpm lint`（oxlint）、`pnpm format`（oxfmt）
- 测试: `pnpm test`（vitest）；覆盖率: `pnpm test:coverage`

## 代码风格与命名约定

- 语言: TypeScript（ESM）。偏好严格类型；避免 `any`。
- 格式化/ lint 通过 Oxlint 和 Oxfmt；提交前运行 `pnpm lint`。
- 对复杂或不明显逻辑添加简短注释。
- 保持文件简洁；提取 helper 而不是复制 “V2”。CLI 选项与依赖注入使用现有模式（`createDefaultDeps`）。
- 目标文件不超过 ~700 行（仅为指导非硬限制）。当有助于清晰或可测性时拆分/重构。
- 命名: 产品/应用/文档标题用 **OpenClaw**；CLI 命令、包/二进制、路径、配置 key 用 `openclaw`。

## 发布通道（命名）

- stable: 仅打标签发布（如 `vYYYY.M.D`），npm dist-tag `latest`。
- beta: 预发布标签 `vYYYY.M.D-beta.N`，npm dist-tag `beta`（可能不含 macOS app）。
- dev: `main` 的滚动头（无 tag；git checkout main）。

## 测试指南

- 框架: Vitest，V8 覆盖率阈值（行/分支/函数/语句 70%）。
- 命名: 源码对应 `*.test.ts`；e2e 为 `*.e2e.test.ts`。
- 触及逻辑时推送前运行 `pnpm test`（或 `pnpm test:coverage`）。
- 测试 worker 不要超过 16；已经试过。
- Live 测试（真实 key）: `CLAWDBOT_LIVE_TEST=1 pnpm test:live`（仅 OpenClaw）或 `LIVE=1 pnpm test:live`（包含 provider live tests）。Docker: `pnpm test:docker:live-models`、`pnpm test:docker:live-gateway`。Onboarding Docker E2E: `pnpm test:docker:onboard`。
- 完整清单 + 覆盖范围: `docs/testing.md`。
- 纯测试新增/修复一般 **不需要** changelog，除非影响用户行为或用户要求。
- 移动端: 使用模拟器前先检查连接的真机（iOS + Android），优先使用真机。

## 提交与 Pull Request 指南

- 提交使用 `scripts/committer "<msg>" <file...>`；避免手动 `git add`/`git commit`，保证 staging 作用域清晰。
- 提交信息简洁、动作导向（例如 `CLI: add verbose flag to send`）。
- 相关变更分组；避免把无关重构混在一起。
- Changelog 流程: 最新已发布版本放在顶部（不使用 `Unreleased`）；发布后 bump 版本并开始新的顶层区块。
- PR 应概述范围、注明测试、提及任何面向用户的变化或新参数。
- PR review 流程: 给出 PR 链接时，用 `gh pr view`/`gh pr diff` 评审，且 **不** 切分支。
- PR review 调用: 优先用一次 `gh pr view --json ...` 批量拿元数据/评论；仅在需要时运行 `gh pr diff`。
- 开始评审前如果粘贴了 GH Issue/PR: 先 `git pull`；若有本地改动或未推送提交，停止并提醒用户后再评审。
- 目标: 合并 PR。提交历史干净优先 **rebase**；历史混乱优先 **squash**。
- PR 合并流程: 从 `main` 新建临时分支，合并 PR 分支（历史不重要优先 squash；复杂/冲突时可 rebase/merge）。尽量合并 PR，除非确实困难，再改用其他方式。若 squash，添加 PR 作者为共同贡献者。应用修复、加 changelog（含 PR # + 致谢）、最终提交前运行全套 gate、提交、合并回 `main`、删除临时分支，并以 `main` 结束。
- 如果评审后又参与修改该 PR，落地时使用 merge/squash（不允许直接 main 提交），并始终把 PR 作者加为共同贡献者。
- 在处理 PR 时: 添加带 PR 号并感谢贡献者的 changelog 条目。
- 在处理 issue 时: 在 changelog 中引用该 issue。
- 合并 PR 时: 留下 PR 评论说明具体操作，并附上 SHA。
- 合并来自新贡献者的 PR 时: 将其头像加入 README 的 “Thanks to all clawtributors” 缩略图列表。
- 合并 PR 后: 若贡献者缺失，运行 `bun scripts/update-clawtributors.ts` 并提交重新生成的 README。

## 简写命令

- `sync`: 若工作区有改动，先提交全部变更（选一个合适的 Conventional Commit message），然后 `git pull --rebase`；若 rebase 冲突且无法解决，停止；否则 `git push`。

### PR 工作流（Review vs Land）

- **Review 模式（仅 PR 链接）:** 读 `gh pr view/diff`；**不**切换分支；**不**改代码。
- **Landing 模式:** 从 `main` 创建集成分支，引入 PR 提交（线性历史优先 **rebase**；复杂/冲突时允许 **merge**），应用修复、加 changelog（含致谢 + PR #），在提交前本地跑完整 gate（`pnpm lint && pnpm build && pnpm test`），提交、合并回 `main`，然后 `git switch main`（落地后不要留在 topic 分支）。重要: 贡献者需要出现在 git graph 中！

## 安全与配置提示

- Web provider 的凭据存储在 `~/.openclaw/credentials/`；如果登出，重新 `openclaw login`。
- Pi 会话默认在 `~/.openclaw/sessions/`；基础目录不可配置。
- 环境变量: 见 `~/.profile`。
- 不要提交或发布真实手机号、视频或线上配置值。文档/测试/示例使用明显的假占位符。
- 发布流程: 任何发布前先读 `docs/reference/RELEASING.md` 和 `docs/platforms/mac/release.md`；这些文档已说明的问题不要再问。

## 故障排查

- 品牌迁移问题或历史配置/服务告警: 运行 `openclaw doctor`（参见 `docs/gateway/doctor.md`）。

## Agent 专用备注

- 词汇: "makeup" = "mac app"。
- 不要编辑 `node_modules`（全局/Homebrew/npm/git 安装也算）。更新会被覆盖。技能笔记写到 `tools.md` 或 `AGENTS.md`。
- Signal: "update fly" => `fly ssh console -a flawd-bot -C "bash -lc 'cd /data/clawd/openclaw && git pull --rebase origin main'"` 然后 `fly machines restart e825232f34d058 -a flawd-bot`。
- 处理 GitHub Issue 或 PR 时，在任务末尾打印完整 URL。
- 回答问题时只给高置信度答案: 在代码里验证，不要猜。
- 永远不要更新 Carbon 依赖。
- 带 `pnpm.patchedDependencies` 的依赖必须使用精确版本（不使用 `^`/`~`）。
- 依赖打补丁（pnpm patches、overrides 或 vendored 变更）需要显式批准；默认不做。
- CLI 进度: 使用 `src/cli/progress.ts`（`osc-progress` + `@clack/prompts` spinner）；不要手写 spinner/bar。
- 状态输出: 表格 + ANSI-safe 换行（`src/terminal/table.ts`）；`status --all` = 只读/可粘贴，`status --deep` = probe。
- Gateway 目前仅作为 menubar app 运行；没有单独 LaunchAgent/helper label。重启通过 OpenClaw Mac app 或 `scripts/restart-mac.sh`；验证/kill 使用 `launchctl print gui/$UID | grep openclaw`，不要假设固定 label。**在 macOS 调试时，通过 app 启停 gateway，不要用临时 tmux 会话；交接前关闭临时隧道。**
- macOS 日志: 使用 `./scripts/clawlog.sh` 查询 OpenClaw subsystem 的 unified logs；支持 follow/tail/category 过滤，且要求 `/usr/bin/log` 的无密码 sudo。
- 如果本地有共享 guardrails，先查看；否则按本仓库指引。
- SwiftUI 状态管理（iOS/macOS）: 优先用 `Observation` 框架（`@Observable`、`@Bindable`），避免引入新的 `ObservableObject`，除非兼容性需要；触及相关代码时迁移现有用法。
- Connection providers: 新增连接时，更新所有 UI 与文档（macOS app、web UI、移动端如适用、onboarding/overview docs），并添加对应状态 + 配置表单以保持 provider 列表和设置同步。
- 版本位置: `package.json`（CLI）、`apps/android/app/build.gradle.kts`（versionName/versionCode）、`apps/ios/Sources/Info.plist` + `apps/ios/Tests/Info.plist`（CFBundleShortVersionString/CFBundleVersion）、`apps/macos/Sources/OpenClaw/Resources/Info.plist`（CFBundleShortVersionString/CFBundleVersion）、`docs/install/updating.md`（固定 npm 版本）、`docs/platforms/mac/release.md`（APP_VERSION/APP_BUILD 示例）、Peekaboo Xcode projects/Info.plists（MARKETING_VERSION/CURRENT_PROJECT_VERSION）。
- **重启应用:** “重启 iOS/Android apps” 指重新构建（重新编译/安装）并重新启动，不只是 kill/launch。
- **设备检查:** 测试前先确认已连接真机（iOS/Android），再考虑模拟器/仿真器。
- iOS Team ID 查询: `security find-identity -p codesigning -v` → 使用 Apple Development (…) TEAMID。备用: `defaults read com.apple.dt.Xcode IDEProvisioningTeamIdentifiers`。
- A2UI bundle hash: `src/canvas-host/a2ui/.bundle.hash` 为自动生成；忽略意外变更，只有在需要时通过 `pnpm canvas:a2ui:bundle`（或 `scripts/bundle-a2ui.sh`）重新生成。该 hash 需单独提交。
- 发布签名/公证 key 在仓库外管理；遵循内部发布文档。
- 公证认证环境变量（`APP_STORE_CONNECT_ISSUER_ID`、`APP_STORE_CONNECT_KEY_ID`、`APP_STORE_CONNECT_API_KEY_P8`）应存在于环境中（按内部发布文档）。
- **多 agent 安全:** 未明确请求不要创建/应用/删除 `git stash`（含 `git pull --rebase --autostash`）。假设其他 agent 可能在工作；保持无关 WIP 不动，避免跨范围变更。
- **多 agent 安全:** 用户说 “push” 时，可先 `git pull --rebase` 同步（不丢其他人的工作）。用户说 “commit” 时，只提交你的改动；用户说 “commit all” 时，按相关性分组提交所有变更。
- **多 agent 安全:** 未明确请求不要创建/删除/修改 `git worktree`（或编辑 `.worktrees/*`）。
- **多 agent 安全:** 未明确请求不要切分支/检出其它分支。
- **多 agent 安全:** 允许多 agent 并行，但每个 agent 需独立会话。
- **多 agent 安全:** 遇到不认识的文件继续前进；只关注自己的改动并仅提交这些。
- Lint/format 波动:
  - 如果 staged + unstaged diff 仅为格式化变更，自动处理，不要询问。
  - 如果已请求 commit/push，自动 stage 并把纯格式化收尾合入同一提交（或必要时一个很小的跟进提交），无需额外确认。
  - 仅在语义变更（逻辑/数据/行为）时询问。
- Lobster seam: 使用共享 CLI 调色板 `src/terminal/palette.ts`（不要硬编码颜色）；将调色板用于 onboarding/config 提示和其它 TTY UI 输出。
- **多 agent 安全:** 报告聚焦你自己的修改；除非受阻，不要加 guard-rail 免责声明；多个 agent 修改同一文件时如无风险则继续；仅在相关时以简短 “other files present” 说明。
- Bug 排查: 在下结论前阅读相关 npm 依赖源码和本地相关代码；力求高置信度根因。
- 代码风格: 对复杂逻辑添加简短注释；尽量把文件控制在 ~500 行内（必要时拆分/重构）。
- 工具 schema guardrails（google-antigravity）: 避免 `Type.Union`，不要用 `anyOf`/`oneOf`/`allOf`。字符串列表用 `stringEnum`/`optionalStringEnum`（Type.Unsafe enum），用 `Type.Optional(...)` 代替 `... | null`。顶层 schema 保持 `type: "object"`，并具备 `properties`。
- 工具 schema guardrails: 避免原始 `format` 字段名；有些校验器把 `format` 当保留关键字会拒绝 schema。
- 要求打开 “session” 文件时，打开 `~/.openclaw/agents/<agentId>/sessions/*.jsonl`（使用系统提示 Runtime 行中的 `agent=<id>`；默认最新，除非指定 ID），不要打开默认 `sessions.json`。如需其它机器日志，通过 Tailscale SSH 读取相同路径。
- 不要通过 SSH 重新构建 macOS app；必须在 Mac 本机运行。
- 永远不要向外部消息面（WhatsApp、Telegram）发送流式/部分回复；只能发送最终回复。流式/tool 事件仍可发送到内部 UI/控制通道。
- Voice wake 转发提示:
  - 命令模板保持 `openclaw-mac agent --message "${text}" --thinking low`；`VoiceWakeForwarder` 已对 `${text}` 做 shell 转义。不要再加额外引号。
  - launchd PATH 很精简；确保 app 的 launch agent PATH 包含标准系统路径 + 你的 pnpm bin（通常是 `$HOME/Library/pnpm`），这样 `openclaw-mac` 调用时能解析 `pnpm`/`openclaw` 二进制。
- 对包含 `!` 的手动 `openclaw message send`，用下方所述 heredoc 方式避免 Bash 工具转义。
- 发布 guardrails: 未经操作员明确同意不要改版本号；执行任何 npm publish/release 前都必须请求许可。

## NPM + 1Password（发布/验证）

- 使用 1password 技能；所有 `op` 命令必须在新的 tmux 会话里执行。
- 登录: `eval "$(op signin --account my.1password.com)"`（app 解锁 + integration 开启）。
- OTP: `op read 'op://Private/Npmjs/one-time password?attribute=otp'`。
- 发布: `npm publish --access public --otp="<otp>"`（在包目录运行）。
- 验证（不污染本地 npmrc）: `npm view <pkg> version --userconfig "$(mktemp)"`。
- 发布后关闭 tmux 会话。
