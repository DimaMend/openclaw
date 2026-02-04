# E2B Executor Examples

## Example 1: Simple npm install

**Problem:** Running `npm install` locally fills up disk space

**Solution:** Use E2B remote execution

```bash
# Agent conversation
User: Install dependencies for this package.json and run the tests

Agent: I'll use E2B to avoid filling up local disk space.

# Agent uses execute_remote tool:
{
  "command": "npm install && npm test",
  "uploadFiles": [
    {
      "path": "/home/user/package.json",
      "content": "{ \"name\": \"my-app\", \"dependencies\": { \"express\": \"^4.18.0\" } }"
    },
    {
      "path": "/home/user/index.test.js",
      "content": "const assert = require('assert'); ..."
    }
  ],
  "downloadPaths": ["coverage/"]
}

# Result:
✓ Tests passed
✓ Coverage report downloaded
✓ Local disk: 0 bytes used
```

## Example 2: Clone and test a GitHub repo

**Problem:** Cloning large repos with dependencies fills disk

**Solution:** Use sync_workspace + execute_remote

```bash
# Step 1: Clone locally (lightweight, no dependencies)
git clone https://github.com/user/repo /tmp/repo

# Step 2: Sync to E2B
sync_workspace({
  localPath: "/tmp/repo",
  remotePath: "/home/user/repo"
})
# Returns: { sandboxId: "sb_abc123" }

# Step 3: Install deps and run tests remotely
execute_remote({
  sandboxId: "sb_abc123",
  command: "npm install && npm test",
  workingDirectory: "/home/user/repo",
  downloadPaths: ["test-results.xml"]
})

# Step 4: Clean up local clone
rm -rf /tmp/repo

# Result: Repo tested without any local disk usage for node_modules
```

## Example 3: Build a TypeScript project

**Problem:** TypeScript builds need dependencies + create output files

**Solution:** Remote build with download

```bash
execute_remote({
  command: "npm install && npm run build",
  uploadFiles: [
    { path: "/home/user/package.json", content: packageJson },
    { path: "/home/user/tsconfig.json", content: tsconfig },
    { path: "/home/user/src/index.ts", content: sourceCode }
  ],
  downloadPaths: ["dist/"],
  env: { NODE_ENV: "production" }
})

# Downloads the built dist/ folder
# Can then deploy it without having installed deps locally
```

## Example 4: Python data processing

**Problem:** Large datasets + dependencies fill disk

**Solution:** Process in E2B

```bash
execute_remote({
  command: "pip install pandas numpy && python process.py",
  uploadFiles: [
    { path: "/home/user/requirements.txt", content: "pandas\nnumpy\n" },
    { path: "/home/user/process.py", content: pythonScript },
    { path: "/home/user/data.csv", content: csvData }
  ],
  downloadPaths: ["output.csv", "report.pdf"]
})
```

## Example 5: Reuse sandbox for multiple operations

**Problem:** Creating sandboxes for every command is slow

**Solution:** Reuse sandbox ID

```bash
# First operation: setup
const result1 = await sync_workspace({
  localPath: "/tmp/project",
  remotePath: "/home/user/project"
});
const sandboxId = result1.details.sandboxId;

# Second operation: run tests
await execute_remote({
  sandboxId,
  command: "npm test",
  workingDirectory: "/home/user/project"
});

# Third operation: run linter
await execute_remote({
  sandboxId,
  command: "npm run lint",
  workingDirectory: "/home/user/project"
});

# Sandbox auto-terminates after 15 minutes idle
```

## Example 6: Render deployment with E2B

**Config:** `~/.openclaw/config.json` on Render

```json
{
  "plugins": {
    "e2b-executor": {
      "enabled": true,
      "apiKey": "${E2B_API_KEY}",
      "autoTriggerThreshold": "50MB",
      "timeoutMs": 600000
    }
  }
}
```

**Environment:** Render dashboard

```bash
E2B_API_KEY=e2b_xxx...
```

**Result:** All heavy operations automatically use E2B, keeping /data disk clean

## Example 7: Agent prompt integration

Add to agent system prompt:

```
When you need to install dependencies or run tests, use the execute_remote tool to avoid filling up local disk space. This is especially important for:
- npm install / pip install
- Running test suites
- Building projects

Example:
Instead of: bash("npm install")
Use: execute_remote({ command: "npm install", ... })
```

## Cost Breakdown

**Free tier:** 100 hours/month
- Good for: Personal projects, testing, light usage
- ~3 hours/day of sandbox time

**Pro tier:** $20/month for 1000 hours
- Good for: Production deployments, team usage
- ~33 hours/day of sandbox time
- Multiple agents can share the quota

**Typical usage:**
- npm install: 2-5 minutes
- Test suite: 1-10 minutes
- Full CI pipeline: 5-15 minutes

**Monthly estimate:**
- 10 deployments/day × 10 minutes = 100 minutes/day = 50 hours/month (Free tier ✓)
- 100 deployments/day × 10 minutes = 1000 minutes/day = 500 hours/month (Pro tier)
