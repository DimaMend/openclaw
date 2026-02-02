# OpenClaw Web Application (Payload CMS Integration)

A user-friendly web application for managing multiple OpenClaw bots simultaneously, built with Payload CMS and Next.js.

## Features

- **Multi-Bot Management**: Deploy and manage multiple OpenClaw bots from a single interface
- **User-Friendly Admin Panel**: Configure bots through intuitive forms and wizards
- **Real-Time Monitoring**: Track bot status, connections, and activity
- **Channel Integration**: Set up and manage multiple messaging channels (Telegram, Discord, Slack, WhatsApp, etc.)
- **Access Control**: Role-based permissions (Admin, Operator, Viewer)
- **Session Management**: View and manage active conversations
- **Secure Credentials**: Encrypted storage of API keys and tokens

## Architecture

```
┌─────────────────────────────────────────┐
│         Payload CMS (Next.js)            │
│  - Admin UI                              │
│  - Collections (Bots, Channels, etc.)   │
│  - REST API                              │
└────────────────┬────────────────────────┘
                 │
      ┌──────────▼─────────────┐
      │  Gateway Orchestrator   │
      │  - Process Management   │
      │  - Config Sync          │
      └──────────┬─────────────┘
                 │
┌────────────────▼────────────────────────┐
│      Multiple OpenClaw Gateways         │
│  Bot1:18789  Bot2:18790  Bot3:18791    │
└─────────────────────────────────────────┘
```

## Prerequisites

- Node.js 22.12.0 or higher
- PostgreSQL database
- OpenClaw CLI installed globally or locally

## Installation

1. **Install dependencies**:
```bash
cd apps/web
pnpm install
```

2. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL`: PostgreSQL connection string
- `PAYLOAD_SECRET`: Random secret key for Payload
- `ENCRYPTION_KEY`: Key for encrypting credentials
- `OPENCLAW_BASE_PATH`: Base directory for bot configs (default: `/var/openclaw`)
- `OPENCLAW_BASE_PORT`: Starting port for gateways (default: `18789`)

3. **Initialize database**:
```bash
pnpm payload migrate:create
pnpm payload migrate
```

4. **Start development server**:
```bash
pnpm dev
```

The application will be available at `http://localhost:3000/admin`

## Project Structure

```
apps/web/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (payload)/          # Payload admin routes
│   │   │   └── admin/[[...segments]]/
│   │   ├── (app)/              # Custom app routes
│   │   └── layout.tsx
│   ├── collections/            # Payload collections
│   │   ├── Bots.ts
│   │   ├── BotChannels.ts
│   │   ├── BotBindings.ts
│   │   ├── Sessions.ts
│   │   ├── Users.ts
│   │   └── Media.ts
│   ├── endpoints/              # Custom API endpoints
│   │   ├── start-bot.ts
│   │   ├── stop-bot.ts
│   │   ├── restart-bot.ts
│   │   └── bot-status.ts
│   ├── lib/                    # Shared utilities
│   │   ├── gateway/
│   │   │   ├── orchestrator.ts # Multi-gateway process manager
│   │   │   └── config-sync.ts  # DB → OpenClaw config sync
│   │   └── utils/
│   │       └── encryption.ts   # Credential encryption
│   ├── components/             # React components
│   └── payload.config.ts       # Payload configuration
├── package.json
├── tsconfig.json
└── next.config.mjs
```

## Core Components

### 1. Collections

#### **Bots** (`/collections/Bots.ts`)
Stores bot configuration:
- Name, agent ID, model selection
- System prompt and avatar
- Gateway settings (port, bind policy, auth token)
- Session configuration
- Tool permissions (bash, browser, media)

#### **BotChannels** (`/collections/BotChannels.ts`)
Manages messaging channel connections:
- Channel type (Telegram, Discord, Slack, etc.)
- Encrypted credentials
- Access control policies (DM/group allowlists)
- Auto-reply settings

#### **BotBindings** (`/collections/BotBindings.ts`)
Routes messages to specific bots:
- Channel and peer matching
- Priority-based routing
- Guild/team-specific bindings

#### **Sessions** (`/collections/Sessions.ts`)
Tracks active conversations (read-only, auto-populated by gateways)

#### **Users** (`/collections/Users.ts`)
User management with role-based access control

### 2. Gateway Orchestrator (`/lib/gateway/orchestrator.ts`)

Manages multiple OpenClaw gateway processes:

```typescript
const orchestrator = getOrchestrator()

// Start a bot
await orchestrator.startBot(bot)

// Stop a bot
await orchestrator.stopBot(botId)

// Restart with new config
await orchestrator.restartBot(bot)

// Get status
const status = orchestrator.getStatus(botId)
```

**Features:**
- Automatic port allocation
- Process lifecycle management
- Isolated config directories per bot
- Health monitoring and error recovery
- Event emission (started, stopped, error, log)

### 3. Config Sync (`/lib/gateway/config-sync.ts`)

Converts Payload database records to OpenClaw JSON5 config format:

```typescript
const configSync = getConfigSync(payload)

// Generate config from DB
const config = await configSync.generateBotConfig(botId)

// Write to file
await configSync.writeConfigToFile(config, outputPath)

// Full sync
await configSync.syncBotConfig(botId, outputPath)
```

### 4. API Endpoints

- **POST `/api/start-bot`**: Start a bot gateway
- **POST `/api/stop-bot`**: Stop a bot gateway
- **POST `/api/restart-bot`**: Restart a bot gateway
- **GET `/api/bot-status`**: Get gateway status

## Usage Guide

### Creating a Bot

1. Navigate to **Bots** in the admin panel
2. Click **Create New**
3. Fill in:
   - **Name**: Display name (e.g., "Customer Support Bot")
   - **Model**: Select Claude model
   - **System Prompt**: Bot personality and instructions
   - **Avatar**: Upload bot profile image
4. Configure gateway settings:
   - Port will be auto-assigned
   - Choose bind policy (loopback recommended)
5. Set session and tool preferences
6. Click **Save**

### Adding a Channel

1. Go to **Bot Channels**
2. Click **Create New**
3. Select:
   - **Bot**: Which bot uses this channel
   - **Channel**: Platform (Telegram, Discord, etc.)
   - **Account ID**: Identifier (usually "default")
4. Enter credentials:
   - **Telegram**: Bot token from @BotFather
   - **Discord**: Bot token + application ID
   - **Slack**: Bot token + app token
   - **WhatsApp**: Session data (QR pairing)
5. Configure access control:
   - DM policy (all / allowlist / none)
   - Group policy
   - Allowlist of peer IDs
6. Click **Save**

### Starting a Bot

**Via Admin UI:**
1. Go to **Bots**
2. Click on a bot
3. Click **Start Bot** (custom action)

**Via API:**
```bash
curl -X POST http://localhost:3000/api/start-bot \
  -H "Content-Type: application/json" \
  -d '{"botId": "1"}'
```

### Monitoring Bots

**Via Admin UI:**
- View bot status in the bot list (Active/Inactive/Error)
- Check **Last Seen** timestamp
- View error messages if status is "Error"

**Via API:**
```bash
# Get status for specific bot
curl http://localhost:3000/api/bot-status?botId=1

# Get all bot statuses
curl http://localhost:3000/api/bot-status
```

## Security

### Credential Encryption

All sensitive credentials (API keys, tokens) are encrypted at rest using AES-256-GCM:

```typescript
import { encrypt, decrypt } from '@/lib/utils/encryption'

// Encrypt before storing
const encrypted = encrypt(apiKey)

// Decrypt when loading
const apiKey = decrypt(encrypted)
```

**Important:** Set `ENCRYPTION_KEY` environment variable before storing any credentials.

### Access Control

Three user roles:

1. **Admin**: Full access (create/edit/delete bots, manage users)
2. **Operator**: Manage assigned bots only
3. **Viewer**: Read-only access

### Gateway Security

- Gateways bind to loopback by default (localhost only)
- Auth tokens protect gateway RPC endpoints
- Isolated config directories per bot

## Deployment

### Development

```bash
pnpm dev
```

### Production (Docker)

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Production (Vercel/Netlify)

1. Connect GitHub repository
2. Set environment variables
3. Deploy (Next.js detected automatically)

### Production (VPS)

```bash
# Build
pnpm build

# Start with PM2
pm2 start "pnpm start" --name openclaw-web

# Or use systemd
sudo systemctl enable openclaw-web
sudo systemctl start openclaw-web
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://localhost:5432/openclaw` |
| `PAYLOAD_SECRET` | Payload CMS secret key | Required |
| `ENCRYPTION_KEY` | Key for encrypting credentials | Required |
| `NEXT_PUBLIC_SERVER_URL` | Public URL of the application | `http://localhost:3000` |
| `OPENCLAW_BASE_PATH` | Base directory for bot configs | `/var/openclaw` |
| `OPENCLAW_BASE_PORT` | Starting port for gateways | `18789` |
| `OPENCLAW_MAX_BOTS` | Maximum number of bots | `50` |
| `OPENCLAW_BINARY_PATH` | Path to OpenClaw CLI | `openclaw` |

## Troubleshooting

### Bot won't start

1. Check bot status for error message
2. Verify OpenClaw CLI is installed: `which openclaw`
3. Check gateway logs in `/var/openclaw/bots/{botId}/`
4. Ensure port is not already in use: `lsof -i :18789`

### Credentials not working

1. Verify `ENCRYPTION_KEY` is set correctly
2. Re-enter credentials if key changed
3. Check channel documentation for correct format

### Database connection errors

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` format
3. Ensure database exists: `createdb openclaw`
4. Run migrations: `pnpm payload migrate`

## Development

### Adding a New Collection

1. Create collection file in `src/collections/`
2. Import in `payload.config.ts`
3. Add to `collections` array
4. Run `pnpm generate:types` to update TypeScript types

### Adding a New Endpoint

1. Create endpoint file in `src/endpoints/`
2. Import in `payload.config.ts`
3. Add to `endpoints` array
4. Test with curl or Postman

### Running Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Architecture Decisions

### Why Payload CMS?

- Native Next.js integration
- Auto-generated TypeScript types
- Built-in admin UI
- Flexible collections and hooks
- Strong authentication and access control

### Why PostgreSQL?

- Robust relational data model
- Strong consistency guarantees
- JSON support for flexible fields
- Excellent Payload integration

### Why Process-Per-Bot?

- Isolation: Each bot has independent config
- Reliability: One bot crash doesn't affect others
- Scalability: Distribute bots across machines
- Simplicity: Reuses existing OpenClaw CLI

## Contributing

1. Follow the main OpenClaw contributing guidelines
2. Use TypeScript strict mode
3. Add tests for new features
4. Update documentation
5. Run `pnpm lint` before committing

## License

MIT - See main OpenClaw LICENSE file

## Support

- GitHub Issues: https://github.com/openclaw/openclaw/issues
- Documentation: https://docs.openclaw.ai
- Discord: https://discord.gg/openclaw
