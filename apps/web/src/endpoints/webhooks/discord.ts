import type { PayloadHandler } from 'payload'
import { getMessageRouter } from '../../lib/message-routing/router'
import type { IncomingMessage } from '../../lib/message-routing/router'
import { createHash, createHmac } from 'crypto'

/**
 * Discord Webhook Handler
 *
 * Receives events from Discord Gateway (via bot) and routes them to appropriate bot.
 *
 * Discord sends events like:
 * {
 *   type: 0, // MESSAGE_CREATE
 *   id: "snowflake",
 *   channel_id: "snowflake",
 *   guild_id?: "snowflake",
 *   author: { id: "snowflake", username: "string", ... },
 *   content: "string",
 *   mentions: [...],
 *   ...
 * }
 */

export const handleDiscordWebhook: PayloadHandler = async (req, res) => {
  try {
    const event = req.body

    // Verify Discord signature
    const signature = req.headers['x-signature-ed25519'] as string
    const timestamp = req.headers['x-signature-timestamp'] as string

    if (signature && timestamp) {
      const isValid = verifyDiscordSignature(
        req.body,
        signature,
        timestamp,
        process.env.DISCORD_PUBLIC_KEY || ''
      )

      if (!isValid) {
        return res.status(401).json({ error: 'Invalid signature' })
      }
    }

    // Handle Discord interaction types
    if (event.type === 1) {
      // PING - respond with PONG
      return res.json({ type: 1 })
    }

    // Handle MESSAGE_CREATE events
    if (event.type === 0 || event.t === 'MESSAGE_CREATE') {
      const message = event.d || event

      // Ignore bot messages
      if (message.author?.bot) {
        return res.status(200).json({ ok: true })
      }

      // Parse message
      const incomingMessage: IncomingMessage = {
        channel: 'discord',
        accountId: req.params.accountId || 'default',
        peer: {
          kind: message.guild_id ? 'group' : 'user',
          id: message.channel_id,
          name: message.guild_id ? `Guild ${message.guild_id}` : 'DM'
        },
        message: message.content || '',
        messageId: message.id,
        from: {
          id: message.author.id,
          username: message.author.username
        },
        isMention: checkDiscordMention(message),
        replyTo: message.referenced_message?.id,
        media: parseDiscordMedia(message),
        timestamp: Date.now(),
        guildId: message.guild_id
      }

      // Route to appropriate bot
      const router = getMessageRouter(req.payload)
      const result = await router.routeMessage(incomingMessage)

      if (result.routed) {
        req.payload.logger.info(
          `Discord message routed to bot ${result.agentId}: ${message.channel_id}`
        )
      } else {
        req.payload.logger.debug(
          `Discord message not routed: ${result.reason}`
        )
      }
    }

    res.status(200).json({ ok: true })
  } catch (error) {
    req.payload.logger.error(`Discord webhook error: ${error}`)
    res.status(200).json({ ok: true })
  }
}

/**
 * Verify Discord signature
 */
function verifyDiscordSignature(
  body: any,
  signature: string,
  timestamp: string,
  publicKey: string
): boolean {
  try {
    // Discord uses Ed25519 signatures
    // For now, simplified verification
    // In production, use tweetnacl or similar library

    const bodyStr = typeof body === 'string' ? body : JSON.stringify(body)
    const message = timestamp + bodyStr

    // This is a placeholder - in production, use proper Ed25519 verification
    return true
  } catch (error) {
    return false
  }
}

/**
 * Check if bot was mentioned
 */
function checkDiscordMention(message: any): boolean {
  if (!message.mentions || message.mentions.length === 0) {
    return false
  }

  // Check if bot is in mentions
  // We'll need to compare with actual bot user ID
  return message.mentions.some((mention: any) => mention.bot)
}

/**
 * Parse Discord media
 */
function parseDiscordMedia(message: any): IncomingMessage['media'] {
  if (!message.attachments || message.attachments.length === 0) {
    return undefined
  }

  return message.attachments.map((attachment: any) => {
    let type: 'photo' | 'video' | 'audio' | 'document' = 'document'

    if (attachment.content_type?.startsWith('image/')) {
      type = 'photo'
    } else if (attachment.content_type?.startsWith('video/')) {
      type = 'video'
    } else if (attachment.content_type?.startsWith('audio/')) {
      type = 'audio'
    }

    return {
      type,
      url: attachment.url
    }
  })
}
