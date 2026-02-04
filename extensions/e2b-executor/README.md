# E2B Remote Code Executor

Execute code remotely in [E2B](https://e2b.dev) sandboxed environments to avoid local disk usage issues.

## Why E2B?

When agents run heavy operations like `npm install` or `pip install`, they can quickly fill up local disk space (especially on Render's 1GB persistent disk). E2B provides:

- **Sandboxed execution** - isolated cloud environments
- **Pre-configured** - Node.js, Python, and common dev tools
- **Scalable** - no local disk limits
- **Secure** - isolated from gateway machine

## Installation

1. **Get E2B API Key**
   - Sign up at https://e2b.dev
   - Get your API key from the dashboard
   - Free tier: 100 hours/month
   - Pro tier: $20/month for 1000 hours

2. **Install dependencies**
   ```bash
   cd extensions/e2b-executor
   npm install
   ```

3. **Configure OpenClaw**
   Add to `~/.openclaw/config.json`:
   ```json
   {
     "plugins": {
       "e2b-executor": {
         "enabled": true,
         "apiKey": "your-e2b-api-key-here",
         "autoTriggerThreshold": "100MB",
         "timeoutMs": 300000
       }
     }
   }
   ```

## Usage

### Tool 1: `execute_remote`

Execute shell commands remotely in E2B sandbox.

**Example: Install dependencies and run tests**
```typescript
// Agent tool call
execute_remote({
  command: "npm install && npm test",
  workingDirectory: "/home/user",
  uploadFiles: [
    { path: "/home/user/package.json", content: packageJsonContent },
    { path: "/home/user/index.js", content: sourceCode }
  ],
  downloadPaths: ["coverage/", "dist/"]
})
```

**Example: Python project**
```typescript
execute_remote({
  command: "pip install -r requirements.txt && python test.py",
  uploadFiles: [
    { path: "/home/user/requirements.txt", content: reqContent },
    { path: "/home/user/test.py", content: testCode }
  ]
})
```

### Tool 2: `sync_workspace`

Sync entire workspace directory to E2B for full project work.

**Example: Clone and test a repo**
```typescript
// First, sync the local repo
sync_workspace({
  localPath: "/tmp/my-project",
  remotePath: "/home/user/project"
})
// Returns: { sandboxId: "sb_abc123..." }

// Then run commands in that sandbox
execute_remote({
  sandboxId: "sb_abc123...",
  command: "npm install && npm test",
  workingDirectory: "/home/user/project"
})
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | boolean | `false` | Enable remote execution |
| `apiKey` | string | - | **Required** E2B API key |
| `autoTriggerThreshold` | string | `"100MB"` | Auto-use E2B for operations > threshold |
| `timeoutMs` | number | `300000` | Timeout (5 minutes) |
| `template` | string | `"base"` | E2B template (base has Node/Python) |

## Use Cases

### ✅ Good for E2B

- `npm install` / `pip install` (heavy dependencies)
- Running tests that need dependencies
- Building projects (`npm run build`)
- Running CI/CD steps
- Working with full projects remotely

### ❌ Not needed for E2B

- Simple file reads/writes
- Quick commands (`ls`, `cat`, etc.)
- Operations on small projects (<10MB)

## Cost Optimization

- **Reuse sandboxes** - use `sandboxId` to reconnect
- **Upload only necessary files** - exclude `node_modules`, `.git`
- **Kill sandboxes** - they auto-terminate after timeout
- **Monitor usage** - check E2B dashboard for hours used

## Render Integration

On Render with limited disk, configure aggressive auto-trigger:

```json
{
  "plugins": {
    "e2b-executor": {
      "enabled": true,
      "apiKey": "...",
      "autoTriggerThreshold": "50MB"
    }
  }
}
```

This will automatically route heavy operations to E2B, keeping `/data` disk clean.

## Troubleshooting

**Error: E2B API key not configured**
- Add `apiKey` to plugin config

**Error: Timeout**
- Increase `timeoutMs` in config
- Check E2B dashboard for sandbox status

**Error: Sandbox not found**
- Sandbox may have expired (default: 15 minutes idle)
- Create a new sandbox with `sync_workspace`

## Development

```bash
# Install deps
pnpm install

# Build
pnpm build

# Test
pnpm test
```

## Links

- E2B Documentation: https://e2b.dev/docs
- E2B Dashboard: https://e2b.dev/dashboard
- OpenClaw Plugins: https://docs.openclaw.ai/plugins
