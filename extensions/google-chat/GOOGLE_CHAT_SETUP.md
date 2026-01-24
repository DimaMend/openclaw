# Google Chat Bot Configuration Guide

## Current Status

✅ **Completed:**
- HTTP webhook server implemented and running on port 8790
- Gateway status: `enabled, configured, running`
- Webhook server is accessible at: `https://remixs-mac-mini.tail73ba30.ts.net/google-chat-webhook`
- Health check verified: `https://remixs-mac-mini.tail73ba30.ts.net/healthz` returns "ok"
- Tailscale Funnel is forwarding traffic correctly
- Configuration saved to `~/.clawdbot/clawdbot.json`
- All code changes committed to git

⏳ **Next Step: Configure Google Chat Bot in Google Cloud Console**

This requires using the web UI - follow the steps below.

## Configuration Steps

### 1. Open Google Cloud Console

Visit: https://console.cloud.google.com/

### 2. Select Your Project

- Click the project dropdown at the top
- Select: **clawdbot-mac-mini**

### 3. Navigate to Google Chat API

- In the left navigation menu, click "APIs & Services"
- Click "Enabled APIs & services"
- Find and click "Google Chat API"
- OR direct link: https://console.cloud.google.com/apis/api/chat.googleapis.com/hangouts-chat

### 4. Configure the Bot

Click **"Configuration"** in the left sidebar, then:

#### Bot Configuration

- **App name**: Clawdbot Mac Mini (or your preferred name)
- **Avatar URL**: https://clawd.bot/images/icon.png (or your preferred icon)
- **Description**: AI assistant for Google Chat

#### Connection Settings

**IMPORTANT:** Select **"App URL"** (HTTP endpoint), NOT "Apps Script"

- **App URL**: `https://remixs-mac-mini.tail73ba30.ts.net/google-chat-webhook`

#### Functionality

Enable:
- ✅ **Receive 1:1 messages**
- ✅ **Join spaces and group conversations**

#### Visibility

- Select **"Make this Chat app available to specific people and groups in [your domain]"**
- Add your email: `justin@remixpartners.ai`
- Add: `jason@remixpartners.ai`

### 5. Save Configuration

Click **"SAVE"** at the bottom of the page.

## Testing

Once configured, you can test by:

1. **Open Google Chat**: https://chat.google.com
2. **Start a DM**: Search for your bot name ("Clawdbot Mac Mini")
3. **Send a test message**: "Hello!"

The bot should respond through Clawdbot.

## Monitoring

Check the webhook is receiving events:

```bash
# Watch the gateway logs
tail -f /tmp/clawdbot-gateway.log

# Watch the main Clawdbot log
tail -f /tmp/clawdbot/clawdbot-2026-01-23.log
```

## Troubleshooting

### Bot doesn't respond

1. **Check webhook is running:**
   ```bash
   curl https://remixs-mac-mini.tail73ba30.ts.net/healthz
   # Should return: ok
   ```

2. **Check gateway is running:**
   ```bash
   pnpm clawdbot gateway status
   ```

3. **Check logs for errors:**
   ```bash
   tail -n 100 /tmp/clawdbot/clawdbot-2026-01-23.log | grep -i error
   ```

### Webhook returns errors

- Ensure the App URL exactly matches: `https://remixs-mac-mini.tail73ba30.ts.net/google-chat-webhook`
- Verify Tailscale Funnel is still running
- Check gateway logs for incoming requests

## Configuration Files

### Clawdbot Config: `~/.clawdbot/clawdbot.json`

```json
{
  "channels": {
    "googlechat": {
      "enabled": true,
      "projectId": "clawdbot-mac-mini",
      "webhookMode": true,
      "webhookPort": 8790,
      "webhookHost": "0.0.0.0",
      "webhookPath": "/google-chat-webhook",
      "webhookPublicUrl": "https://remixs-mac-mini.tail73ba30.ts.net/google-chat-webhook",
      "allowFrom": [
        "justin@remixpartners.ai",
        "jason@remixpartners.ai"
      ]
    }
  }
}
```

### Plugin Config: `extensions/google-chat/clawdbot.plugin.json`

The plugin manifest declares webhook configuration support.

## What's Different from Laptop Setup?

This Mac mini instance is **completely separate** from your laptop Clawdbot:

- ✅ Separate Google Cloud project (`clawdbot-mac-mini` vs laptop's project)
- ✅ Separate Google Chat bot (different bot in Google Chat)
- ✅ Separate webhook endpoint (Mac mini vs laptop)
- ✅ No shared infrastructure

You can safely run both without conflicts.
