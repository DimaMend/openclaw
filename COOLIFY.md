# 🚀 Moltbot on Coolify - Quick Reference

Deploy Moltbot AI assistant on [Coolify](https://coolify.io) in minutes.

## 📋 Quick Start

1. **In Coolify**: Create new Docker Compose resource
2. **Repository**: Point to this repo
3. **Compose file**: `docker-compose.coolify.yml`
4. **Environment**: Set required variables (see below)
5. **Deploy**: Click deploy button

## 🔑 Required Environment Variables

```env
CLAWDBOT_GATEWAY_TOKEN=<generate-random-token>
ANTHROPIC_API_KEY=sk-ant-xxxxx
```

Generate secure token:
```bash
openssl rand -base64 32
```

## 📚 Full Documentation

See [docs/deployment/coolify.md](docs/deployment/coolify.md) for complete guide including:
- Custom domains & SSL
- Messaging channels (Telegram, Discord, Slack)
- AWS Bedrock integration
- Performance tuning
- Monitoring & troubleshooting

## 🔗 Links

- **Moltbot Docs**: https://docs.molt.bot
- **Coolify Docs**: https://coolify.io/docs
- **GitHub**: https://github.com/moltbot/moltbot
