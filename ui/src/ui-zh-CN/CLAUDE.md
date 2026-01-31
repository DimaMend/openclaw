# OpenClaw UI Configuration Panel

## Project Overview
This is a web-based visual configuration interface for OpenClaw (an AI agent orchestration platform). The UI enables users to configure:
- Model providers (OpenAI, Anthropic, Google, AWS Bedrock, etc.)
- Agent runtime parameters
- Messaging channels (Telegram, Discord, Slack, WhatsApp, Signal, etc.)
- Permissions and security policies
- Skills management and allowlists
- Scheduled tasks (cron jobs)
- Workspace files

## Location
`~/Programming/moltbot/ui/src/ui-zh-CN/`

## Architecture

### Core Components
- **`views/`** - Top-level view components for each configuration section
- **`components/`** - Reusable UI components for specific config areas
- **`i18n/`** - Internationalization support (English, Spanish, Chinese)
- **`types/`** - TypeScript type definitions for configuration structures

### Key Files
- `index.tsx` - Main entry point for the config panel
- `navigation.ts` - Sidebar navigation structure
- `i18n/index.ts` - i18n system entry point
- `i18n/en.ts` - English translations
- `i18n/es.ts` - Spanish translations
- `i18n/zh-CN.ts` - Chinese translations

## Translation System
The project uses a key-based i18n system:
- Translation keys follow dot notation: `section.subsection.key`
- All UI strings are externalized to translation files
- Supports dynamic interpolation with `{{variable}}` syntax

### Translation Key Structure
- `sidebar.*` - Sidebar navigation elements
- `section.*` - Section titles and descriptions
- `action.*` - Common action buttons
- `label.*` - Common labels
- `providers.*` - Model provider configuration
- `agent.*` - Agent settings
- `gateway.*` - Gateway configuration
- `channels.*` - Channel configuration
- `permissions.*` - Permission management
- `skills.*` - Skills management
- `workspace.*` - Workspace file editor
- `cron.*` - Scheduled tasks
- `status.*` - Status messages
- `validation.*` - Form validation messages
- `time.*` - Time formatting strings
- `stats.*` - Statistics labels

## Development

### Building
```bash
npm run build
```

### Type Checking
The project is written in TypeScript. All configuration types are defined in `types/` directory.

### Code Style
- Use TypeScript for all new code
- Follow existing component patterns
- Keep translation keys organized by feature area
- Add new translation keys to ALL language files (en.ts, es.ts, zh-CN.ts)

## Known Issues
- ~~Duplicate translation keys in i18n files~~ (FIXED)

## Testing
- Verify builds pass with `npm run build`
- Test UI in browser to ensure translations work correctly
- Check that all new features have translations in all supported languages

## Migration History
- Originally written in Chinese
- Migrated to i18n system with English as default
- Added Spanish translations
- All UI components updated to use translation keys
