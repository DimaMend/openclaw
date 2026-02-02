import type { CollectionConfig } from 'payload'

export const BotChannels: CollectionConfig = {
  slug: 'bot-channels',
  admin: {
    useAsTitle: 'displayName',
    defaultColumns: ['displayName', 'bot', 'channel', 'status'],
    group: 'Bot Management'
  },
  access: {
    create: ({ req: { user } }) => {
      return user?.role === 'admin' || user?.role === 'operator'
    },
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.role === 'operator') {
        return {
          bot: {
            in: user?.assignedBots || []
          }
        }
      }
      return false
    },
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.role === 'operator') {
        return {
          bot: {
            in: user?.assignedBots || []
          }
        }
      }
      return false
    },
    delete: ({ req: { user } }) => {
      if (user?.role === 'admin') return true
      if (user?.role === 'operator') {
        return {
          bot: {
            in: user?.assignedBots || []
          }
        }
      }
      return false
    }
  },
  hooks: {
    afterChange: [
      async ({ doc, operation, req }) => {
        if (operation === 'create' || operation === 'update') {
          req.payload.logger.info(`Channel config changed for bot, sync needed`)
          // TODO: Trigger channel reconnection
        }
      }
    ]
  },
  fields: [
    {
      name: 'displayName',
      type: 'text',
      required: false,
      admin: {
        description: 'Optional display name (auto-generated if empty)'
      }
    },
    {
      name: 'bot',
      type: 'relationship',
      relationTo: 'bots',
      required: true,
      admin: {
        description: 'Bot that uses this channel'
      }
    },
    {
      name: 'channel',
      type: 'select',
      required: true,
      options: [
        { label: 'Telegram', value: 'telegram' },
        { label: 'Discord', value: 'discord' },
        { label: 'Slack', value: 'slack' },
        { label: 'WhatsApp Web', value: 'whatsapp' },
        { label: 'Signal', value: 'signal' },
        { label: 'iMessage', value: 'imessage' },
        { label: 'LINE', value: 'line' },
        { label: 'Google Chat', value: 'googlechat' }
      ],
      admin: {
        description: 'Messaging platform'
      }
    },
    {
      name: 'accountId',
      type: 'text',
      required: true,
      defaultValue: 'default',
      admin: {
        description: 'Channel account identifier (e.g., "default", "bot1")'
      }
    },
    {
      name: 'status',
      type: 'select',
      required: true,
      defaultValue: 'disconnected',
      options: [
        { label: 'Connected', value: 'connected' },
        { label: 'Disconnected', value: 'disconnected' },
        { label: 'Error', value: 'error' }
      ],
      admin: {
        position: 'sidebar'
      }
    },
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Credentials',
          fields: [
            {
              name: 'credentials',
              type: 'group',
              admin: {
                description: 'Channel-specific authentication (encrypted at rest)'
              },
              fields: [
                {
                  name: 'telegram',
                  type: 'group',
                  admin: {
                    condition: (data) => data.channel === 'telegram'
                  },
                  fields: [
                    {
                      name: 'botToken',
                      type: 'text',
                      required: false,
                      admin: {
                        description: 'Get from @BotFather',
                        placeholder: '123456789:ABCdefGHIjklMNOpqrsTUVwxyz'
                      }
                    }
                  ]
                },
                {
                  name: 'discord',
                  type: 'group',
                  admin: {
                    condition: (data) => data.channel === 'discord'
                  },
                  fields: [
                    {
                      name: 'token',
                      type: 'text',
                      required: false,
                      admin: {
                        description: 'Discord bot token'
                      }
                    },
                    {
                      name: 'applicationId',
                      type: 'text',
                      required: false,
                      admin: {
                        description: 'Discord application ID'
                      }
                    }
                  ]
                },
                {
                  name: 'slack',
                  type: 'group',
                  admin: {
                    condition: (data) => data.channel === 'slack'
                  },
                  fields: [
                    {
                      name: 'botToken',
                      type: 'text',
                      required: false,
                      admin: {
                        description: 'Slack bot token (xoxb-...)'
                      }
                    },
                    {
                      name: 'appToken',
                      type: 'text',
                      required: false,
                      admin: {
                        description: 'Slack app token (xapp-...)'
                      }
                    }
                  ]
                },
                {
                  name: 'whatsapp',
                  type: 'group',
                  admin: {
                    condition: (data) => data.channel === 'whatsapp'
                  },
                  fields: [
                    {
                      name: 'sessionData',
                      type: 'json',
                      required: false,
                      admin: {
                        description: 'WhatsApp session (pairing via QR code)',
                        readOnly: true
                      }
                    }
                  ]
                }
              ]
            }
          ]
        },
        {
          label: 'Access Control',
          fields: [
            {
              name: 'config',
              type: 'group',
              fields: [
                {
                  name: 'dmPolicy',
                  type: 'select',
                  required: true,
                  defaultValue: 'allowlist',
                  options: [
                    { label: 'All (anyone can DM)', value: 'all' },
                    { label: 'Allowlist (restricted)', value: 'allowlist' },
                    { label: 'None (DMs disabled)', value: 'none' }
                  ]
                },
                {
                  name: 'groupPolicy',
                  type: 'select',
                  required: true,
                  defaultValue: 'allowlist',
                  options: [
                    { label: 'All (join any group)', value: 'all' },
                    { label: 'Allowlist (restricted)', value: 'allowlist' },
                    { label: 'None (groups disabled)', value: 'none' }
                  ]
                },
                {
                  name: 'allowlist',
                  type: 'array',
                  fields: [
                    {
                      name: 'peerId',
                      type: 'text',
                      required: true,
                      admin: {
                        description: 'User ID, group ID, or channel ID'
                      }
                    }
                  ],
                  admin: {
                    description: 'List of allowed peers',
                    condition: (data) =>
                      data?.config?.dmPolicy === 'allowlist' ||
                      data?.config?.groupPolicy === 'allowlist'
                  }
                },
                {
                  name: 'autoReply',
                  type: 'checkbox',
                  defaultValue: true,
                  admin: {
                    description: 'Send automatic replies'
                  }
                },
                {
                  name: 'mentionPolicy',
                  type: 'select',
                  defaultValue: 'always',
                  options: [
                    { label: 'Always respond', value: 'always' },
                    { label: 'Only when mentioned', value: 'mentioned' },
                    { label: 'Never in groups', value: 'never' }
                  ],
                  admin: {
                    description: 'How bot responds in group chats'
                  }
                }
              ]
            }
          ]
        }
      ]
    },
    {
      name: 'lastSeen',
      type: 'date',
      required: false,
      admin: {
        description: 'Last connection time',
        readOnly: true,
        position: 'sidebar'
      }
    },
    {
      name: 'errorMessage',
      type: 'textarea',
      required: false,
      admin: {
        description: 'Last error (if status is error)',
        readOnly: true,
        condition: (data) => data.status === 'error'
      }
    }
  ]
}
