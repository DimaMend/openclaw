# Configuration Template Onboarding

Simplified onboarding flow using a JSON configuration template.

## Overview

Instead of interactive prompts, you can:
1. Generate a template JSON file
2. Fill it in with your credentials and policies
3. Import it to configure OpenClaw

This is ideal for:
- Automated deployments
- Team onboarding (share filled templates)
- Infrastructure as code workflows
- CI/CD pipelines

## Quick Start

### 1. Generate Template

```bash
openclaw config generate-template
```

This creates `openclaw-config-template.json` in your current directory.

### 2. Fill In the Template

Open the file and replace placeholder values:

```json
{
  "name": "Production Agent",
  "task": "Software development with GitHub and Slack",
  "github": {
    "token": "ghp_your_actual_token_here",
    "memoryRepo": "myorg/agent-memory",
    "policy": {
      "allowWrites": true,
      "allowPullRequests": true,
      "allowMerge": false,
      "allowedRepos": ["myorg/backend", "myorg/frontend"],
      "blockedPatterns": ["*.key", "*.pem", ".env"]
    }
  },
  "slack": {
    "botToken": "xoxb-actual-bot-token",
    "appToken": "xapp-actual-app-token",
    "policy": {
      "allowedChannels": ["#dev", "#ops"],
      "allowedUsers": [],
      "allowDMs": true,
      "allowPublicChannels": false,
      "maxMessageLength": 4000,
      "ignoredCommands": ["help", "ping"]
    }
  },
  "agent": {
    "model": {
      "provider": "anthropic",
      "name": "claude-sonnet-4-5"
    },
    "workspace": "~/.openclaw/workspace",
    "remoteExecution": {
      "enabled": true,
      "apiKey": "e2b_your_api_key"
    }
  },
  "gateway": {
    "port": 18789,
    "bind": "loopback",
    "auth": {
      "mode": "token",
      "token": "secure-random-token-here"
    }
  }
}
```

### 3. Preview Changes

```bash
openclaw config import-template openclaw-config-template.json --dry-run
```

### 4. Import Configuration

```bash
openclaw config import-template openclaw-config-template.json
```

### 5. Start the Gateway

```bash
openclaw gateway run
```

## Template Fields

### Basic Info

| Field | Required | Description |
|-------|----------|-------------|
| `name` | Yes | Agent or organization name |
| `task` | Yes | Primary purpose/task description |

### GitHub Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `github.token` | Yes | GitHub PAT with repo access |
| `github.memoryRepo` | Yes | Repo for agent memory (format: `owner/repo`) |
| `github.policy.allowWrites` | Yes | Allow file creation/updates |
| `github.policy.allowPullRequests` | Yes | Allow PR creation |
| `github.policy.allowMerge` | Yes | Allow PR merging |
| `github.policy.allowedRepos` | No | Whitelist repos (empty = all) |
| `github.policy.blockedPatterns` | No | File patterns to never modify |

#### GitHub Token Setup

1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `repo`, `workflow` (if using Actions)
4. Copy the token (starts with `ghp_`)

### Slack Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `slack.botToken` | Yes | Bot User OAuth Token (starts with `xoxb-`) |
| `slack.appToken` | Yes | App-Level Token (starts with `xapp-`) |
| `slack.policy.allowedChannels` | No | Channel whitelist (empty = all) |
| `slack.policy.allowedUsers` | No | User whitelist (empty = all) |
| `slack.policy.allowDMs` | Yes | Allow direct messages |
| `slack.policy.allowPublicChannels` | Yes | Allow public channel posting |
| `slack.policy.maxMessageLength` | Yes | Max message length (4000 recommended) |
| `slack.policy.ignoredCommands` | No | Commands to ignore |

#### Slack App Setup

1. Go to https://api.slack.com/apps
2. Create a new app (from manifest)
3. Enable Socket Mode and generate App-Level Token
4. Add Bot Token Scopes: `chat:write`, `channels:read`, `im:history`
5. Install app to workspace
6. Copy both tokens

### Agent Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `agent.model.provider` | Yes | AI provider: `anthropic`, `openai`, `google` |
| `agent.model.name` | Yes | Model name (e.g., `claude-sonnet-4-5`) |
| `agent.workspace` | Yes | Workspace directory path |
| `agent.remoteExecution.enabled` | Yes | Enable E2B remote execution |
| `agent.remoteExecution.apiKey` | No | E2B API key (if enabled) |

### Gateway Configuration

| Field | Required | Description |
|-------|----------|-------------|
| `gateway.port` | Yes | Gateway server port (default: 18789) |
| `gateway.bind` | Yes | `loopback` (local) or `lan` (network) |
| `gateway.auth.mode` | Yes | Auth mode: `token`, `password`, or `none` |
| `gateway.auth.token` | No | Auth token (if mode=token) |
| `gateway.auth.password` | No | Auth password (if mode=password) |

## Policy Configuration

### GitHub Policy Best Practices

**Restrictive (recommended for production):**
```json
{
  "allowWrites": true,
  "allowPullRequests": true,
  "allowMerge": false,
  "allowedRepos": ["myorg/allowed-repo"],
  "blockedPatterns": ["*.key", "*.pem", ".env", "secrets/*", "*.crt"]
}
```

**Permissive (development/testing):**
```json
{
  "allowWrites": true,
  "allowPullRequests": true,
  "allowMerge": true,
  "allowedRepos": [],
  "blockedPatterns": ["*.key", "*.pem"]
}
```

### Slack Policy Best Practices

**Restrictive (recommended for production):**
```json
{
  "allowedChannels": ["#dev-bot", "#ops-bot"],
  "allowedUsers": [],
  "allowDMs": true,
  "allowPublicChannels": false,
  "maxMessageLength": 4000,
  "ignoredCommands": ["help", "ping", "status"]
}
```

**Permissive (development/testing):**
```json
{
  "allowedChannels": [],
  "allowedUsers": [],
  "allowDMs": true,
  "allowPublicChannels": true,
  "maxMessageLength": 4000,
  "ignoredCommands": []
}
```

## Security

### Protecting Your Template

```bash
# Set restrictive permissions
chmod 600 openclaw-config-template.json

# Add to .gitignore
echo "openclaw-config-template.json" >> .gitignore

# Or use environment variables
export GITHUB_TOKEN=ghp_...
export SLACK_BOT_TOKEN=xoxb-...
export SLACK_APP_TOKEN=xapp-...
```

### Environment Variable Substitution

You can use environment variables in the template:

```json
{
  "github": {
    "token": "${GITHUB_TOKEN}",
    "memoryRepo": "${GITHUB_MEMORY_REPO}"
  },
  "slack": {
    "botToken": "${SLACK_BOT_TOKEN}",
    "appToken": "${SLACK_APP_TOKEN}"
  }
}
```

Then import with environment variables set:

```bash
GITHUB_TOKEN=ghp_... \
SLACK_BOT_TOKEN=xoxb-... \
SLACK_APP_TOKEN=xapp-... \
openclaw config import-template openclaw-config-template.json
```

## Team Onboarding

### Shared Team Template

Create a team template with policies but no credentials:

```json
{
  "name": "Team Agent",
  "task": "Software development assistant",
  "github": {
    "token": "${GITHUB_TOKEN}",
    "memoryRepo": "myorg/team-memory",
    "policy": {
      "allowWrites": true,
      "allowPullRequests": true,
      "allowMerge": false,
      "allowedRepos": ["myorg/*"],
      "blockedPatterns": ["*.key", "*.pem", ".env", "secrets/*"]
    }
  },
  "slack": {
    "botToken": "${SLACK_BOT_TOKEN}",
    "appToken": "${SLACK_APP_TOKEN}",
    "policy": {
      "allowedChannels": ["#dev", "#ops"],
      "allowedUsers": [],
      "allowDMs": true,
      "allowPublicChannels": false,
      "maxMessageLength": 4000,
      "ignoredCommands": ["help"]
    }
  },
  ...
}
```

Share this template with team members who provide their own credentials.

### CI/CD Integration

```yaml
# .github/workflows/deploy-agent.yml
name: Deploy OpenClaw Agent

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install OpenClaw
        run: npm install -g openclaw@latest

      - name: Import Configuration
        env:
          GITHUB_TOKEN: ${{ secrets.AGENT_GITHUB_TOKEN }}
          SLACK_BOT_TOKEN: ${{ secrets.SLACK_BOT_TOKEN }}
          SLACK_APP_TOKEN: ${{ secrets.SLACK_APP_TOKEN }}
        run: |
          openclaw config import-template .openclaw/config-template.json

      - name: Start Gateway
        run: openclaw gateway run --daemon
```

## Troubleshooting

### Validation Errors

```bash
# Check template syntax
jq . openclaw-config-template.json

# Dry-run to see what would be imported
openclaw config import-template openclaw-config-template.json --dry-run

# Check current config
openclaw config get .
```

### Common Issues

**Error: "github.token must be a valid token"**
- Ensure you've replaced the placeholder `YOUR_GITHUB_TOKEN_HERE`
- Token should start with `ghp_` or `github_pat_`

**Error: "github.memoryRepo must be a valid repo"**
- Format must be `owner/repo`
- Repo must exist (create it first on GitHub)

**Error: "slack.botToken must be a valid token"**
- Token should start with `xoxb-`
- Ensure Socket Mode is enabled in Slack app

**Error: "slack.appToken must be a valid token"**
- Token should start with `xapp-`
- Generate in Slack app settings under Basic Information > App-Level Tokens

## Migration from Interactive Onboarding

If you already have a config from `openclaw onboard`:

```bash
# Export current config
openclaw config get . > current-config.json

# Generate new template
openclaw config generate-template -o my-template.json

# Manually merge values from current-config.json into my-template.json
# Then re-import
openclaw config import-template my-template.json
```

## Related Commands

- `openclaw onboard` - Interactive onboarding wizard
- `openclaw config` - Configuration wizard
- `openclaw config get <path>` - Get config values
- `openclaw config set <path> <value>` - Set config values
- `openclaw doctor` - Check configuration health
