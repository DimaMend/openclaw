---
summary: "AgentMail email channel support, capabilities, and configuration"
read_when:
  - Working on AgentMail/email channel features
---

# AgentMail

AgentMail is an email API service designed for AI agents. Moltbot connects to AgentMail via
WebSockets to receive incoming emails in real-time and uses the AgentMail API to send replies.
This enables email as a conversation channel for your AI assistant.

Status: supported as a core channel. Direct messages (email threads), media (attachments as links),
and threading are supported.

## Quick setup

1. Create an AgentMail account at [agentmail.to](https://agentmail.to) (free to sign up)
2. Get your API token from the AgentMail dashboard
3. Run onboarding or configure manually:

```bash
moltbot onboard
# Select AgentMail and follow the prompts
```

Or set credentials directly:
- Env: `AGENTMAIL_TOKEN`, `AGENTMAIL_EMAIL_ADDRESS`
- Or config: `channels.agentmail.token`, `channels.agentmail.emailAddress`

4. Start the gateway

Minimal config:

```json5
{
  channels: {
    agentmail: {
      enabled: true,
      token: "am_***",
      emailAddress: "you@agentmail.to",
    },
  },
}
```

## How it works

1. The gateway connects to AgentMail via WebSocket on startup
2. When an email arrives at your inbox, AgentMail pushes a real-time event
3. Moltbot fetches the full thread for context and routes to the agent
4. The agent's reply is sent via the AgentMail API (reply-all to preserve recipients)

No public URL or webhook setup required - WebSocket connections are outbound only.

## Configuration

| Key            | Type     | Description                                         |
| -------------- | -------- | --------------------------------------------------- |
| `name`         | string   | Account name for identifying this configuration     |
| `enabled`      | boolean  | Enable/disable the channel (default: true)          |
| `token`        | string   | AgentMail API token (required)                      |
| `emailAddress` | string   | AgentMail inbox email address to monitor (required) |
| `allowFrom`    | string[] | Allowed sender emails/domains (empty = allow all)   |

## Environment Variables

| Variable                  | Description                   |
| ------------------------- | ----------------------------- |
| `AGENTMAIL_TOKEN`         | AgentMail API token           |
| `AGENTMAIL_EMAIL_ADDRESS` | AgentMail inbox email address |

If both env and config are set, config takes precedence.

## Sender Filtering

AgentMail uses `allowFrom` to filter incoming emails. The list accepts email addresses and domains.

### Filtering Logic

1. If `allowFrom` is empty, all senders are allowed (open mode)
2. If `allowFrom` is non-empty, only matching senders trigger Moltbot
3. Allowed messages are labeled `allowed` in AgentMail
4. Non-matching senders are silently ignored

### Example Configuration

```json5
{
  channels: {
    agentmail: {
      enabled: true,
      token: "am_***",
      emailAddress: "clawd@agentmail.to",
      // Allow specific emails and domains
      allowFrom: ["alice@example.com", "trusted-domain.org"],
    },
  },
}
```

### Domain Matching

Domain entries match any email from that domain:

- `example.org` in allowFrom allows `alice@example.org`, `bob@example.org`, etc.

## Thread Context

When an email arrives, Moltbot fetches the full email thread to provide conversation context
to the AI. This enables the assistant to understand prior messages in the thread and provide
contextually relevant replies.

Thread context includes:
- Subject line
- All senders and recipients
- Message history with timestamps
- Attachment metadata (filenames, sizes, types)

The plugin uses AgentMail's `extracted_text` field which contains only the new content from
each message (excluding quoted reply text). This provides cleaner context without duplicated
quoted sections.

## Reply Behavior

Moltbot uses **reply-all** when responding to emails. This ensures all original recipients
(To, Cc) receive the reply, maintaining proper email thread etiquette.

## WebSocket Connection

The AgentMail channel uses WebSockets for real-time message delivery:

- **Automatic reconnection**: The SDK handles reconnection with up to 30 retry attempts
- **Resubscription**: On reconnect, the channel automatically resubscribes to inbox events
- **No public URL needed**: WebSocket connections are outbound-only, no firewall configuration required

Connection status is visible in gateway logs and `moltbot channels status`.

## Capabilities

| Feature             | Supported            |
| ------------------- | -------------------- |
| Direct messages     | Yes                  |
| Groups/rooms        | No                   |
| Threads             | Yes                  |
| Media (attachments) | Partial (links only) |
| Reactions           | No                   |
| Polls               | No                   |

## Agent Tools

The AgentMail channel provides tools for the agent to interact with email:

- List and search threads
- Read message content and attachments
- Send new emails
- Reply to existing threads
- Manage labels

Tools are provided by the [AgentMail Toolkit](https://github.com/nicholasgriffintn/agentmail-toolkit).

## Troubleshooting

### Messages not being received

1. Verify the API token is valid (check AgentMail dashboard)
2. Confirm the email address matches an inbox you own
3. Check gateway logs for WebSocket connection errors
4. Run `moltbot channels status --probe` to verify connectivity

### WebSocket connection issues

1. Check network connectivity to AgentMail servers
2. Look for `WebSocket closed` or `WebSocket error` in logs
3. The SDK auto-reconnects; persistent failures indicate token or network issues

### Replies not being sent

1. Verify the API token has send permissions
2. Check the gateway logs for outbound errors
3. Ensure the email address is correctly configured

### Sender not allowed

1. Check the `allowFrom` configuration
2. Verify the sender email matches an entry in allowFrom (exact email or domain)
3. Remember: empty allowFrom means all senders are allowed

### Connection keeps reconnecting

1. Check if the API token is valid and not expired
2. Verify the inbox exists in your AgentMail account
3. Check for network issues or firewall blocking outbound WebSocket connections

## Status and Probing

Check channel status:

```bash
moltbot channels status
moltbot channels status --probe  # includes API connectivity test
```

The probe verifies:
- API token is valid
- Inbox exists and is accessible
- WebSocket connection can be established
