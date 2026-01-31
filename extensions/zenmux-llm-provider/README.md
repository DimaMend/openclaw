# Zenmux LLM Provider Plugin

OpenClaw plugin for Zenmux LLM API integration.

## Features

- API key authentication
- Environment variable support
- Multiple model configurations
- OpenAI-compatible API interface

## Installation

### Development (local)

```bash
# Link the plugin for development
openclaw plugins install -l ./extensions/zenmux-llm-provider

# Or enable if already bundled
openclaw plugins enable zenmux-llm-provider
```

### Production (npm)

```bash
openclaw plugins install @openclaw/zenmux-llm-provider
```

## Configuration

### Enable the plugin

```json5
{
  "plugins": {
    "entries": {
      "zenmux-llm-provider": {
        "enabled": true,
        "config": {
          "defaultBaseUrl": "https://api.zenmux.com/v1",
          "defaultModel": "zenmux/chat-model"
        }
      }
    }
  }
}
```

### Authenticate

#### Method 1: Interactive API key input

```bash
openclaw models auth login --provider zenmux --method api-key
```

#### Method 2: Environment variable

```bash
export ZENMUX_API_KEY="your-api-key-here"
openclaw models auth login --provider zenmux --method env
```

### Set as default model

```bash
openclaw config set agents.defaults.model.primary zenmux/chat-model
```

Or in config:

```json5
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "zenmux/chat-model"
      }
    }
  }
}
```

## Available Models

- `zenmux/chat-model` - Standard chat model (128K context)
- `zenmux/vision-model` - Vision-capable model (128K context)
- `zenmux/large-model` - Large context model (200K context, 16K max tokens)

## Usage

After authentication, use Zenmux models like any other provider:

```bash
# Send a message using Zenmux
openclaw message send "Hello from Zenmux!" --model zenmux/chat-model

# Test the provider
openclaw models test --provider zenmux

# List available models
openclaw models list --provider zenmux
```

## Provider Configuration

Full provider config structure:

```json5
{
  "models": {
    "providers": {
      "zenmux": {
        "baseUrl": "https://api.zenmux.com/v1",
        "apiKey": "your-api-key",
        "authMode": "api-key",
        "api": "openai-completions"
      }
    }
  }
}
```

## Troubleshooting

### Check plugin status

```bash
openclaw plugins list
openclaw plugins info zenmux-llm-provider
```

### Verify authentication

```bash
openclaw models auth list
```

### Test connectivity

```bash
openclaw models test --provider zenmux --verbose
```

### Check logs

```bash
# Gateway logs
tail -f ~/.openclaw/logs/gateway.log

# Or use the log command
openclaw logs --follow
```

## Development

### Project structure

```
zenmux-llm-provider/
├── index.ts                  # Main plugin entry
├── openclaw.plugin.json      # Plugin manifest
├── package.json             # Package metadata
└── README.md                # This file
```

### Local development

1. Make changes to `index.ts`
2. Restart the OpenClaw gateway
3. Test with `openclaw plugins info zenmux-llm-provider`

### Adding OAuth support

If Zenmux supports OAuth, add an OAuth auth method:

```typescript
{
  id: "oauth",
  label: "OAuth Login",
  hint: "Browser-based OAuth flow",
  kind: "oauth",
  run: async (ctx) => {
    // Implement OAuth flow
    // See google-antigravity-auth plugin for example
  }
}
```

### Custom API implementation

If Zenmux API is not OpenAI-compatible, you may need to:

1. Implement a custom API adapter in OpenClaw core
2. Set `api: "custom"` in provider config
3. Add model-specific request/response transformations

## License

MIT

## Support

For issues and questions:
- OpenClaw docs: https://docs.openclaw.ai
- Plugin docs: https://docs.openclaw.ai/plugins
- Zenmux API docs: [Add your API docs URL]
