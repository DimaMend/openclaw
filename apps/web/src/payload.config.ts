import { buildConfig } from 'payload'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Collections
import { Users } from './collections/Users'
import { Bots } from './collections/Bots'
import { BotChannels } from './collections/BotChannels'
import { BotBindings } from './collections/BotBindings'
import { Sessions } from './collections/Sessions'
import { Media } from './collections/Media'

// Endpoints
import { startBot } from './endpoints/start-bot'
import { stopBot } from './endpoints/stop-bot'
import { restartBot } from './endpoints/restart-bot'
import { botStatus } from './endpoints/bot-status'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname)
    }
  },
  collections: [
    Users,
    Bots,
    BotChannels,
    BotBindings,
    Sessions,
    Media
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || 'your-secret-key-change-in-production',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts')
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/openclaw'
    }
  }),
  endpoints: [
    {
      path: '/start-bot',
      method: 'post',
      handler: startBot
    },
    {
      path: '/stop-bot',
      method: 'post',
      handler: stopBot
    },
    {
      path: '/restart-bot',
      method: 'post',
      handler: restartBot
    },
    {
      path: '/bot-status',
      method: 'get',
      handler: botStatus
    }
  ],
  sharp: true
})
