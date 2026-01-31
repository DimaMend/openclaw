/**
 * Channel configuration type definitions
 */

// DM access policy
export type DmPolicy = "pairing" | "allowlist" | "open" | "disabled";

// Group access policy
export type GroupPolicy = "open" | "disabled" | "allowlist";

// Base channel configuration
export type BaseChannelConfig = {
  enabled?: boolean;
  name?: string;
  dmPolicy?: DmPolicy;
  allowFrom?: Array<string | number>;
  groupPolicy?: GroupPolicy;
  groupAllowFrom?: Array<string | number>;
  textChunkLimit?: number;
  historyLimit?: number;
  dmHistoryLimit?: number;
  mediaMaxMb?: number;
};

// Telegram config
export type TelegramChannelConfig = BaseChannelConfig & {
  botToken?: string;
  tokenFile?: string;
  streamMode?: "off" | "partial" | "block";
  chunkMode?: "length" | "newline";
  reactionNotifications?: "off" | "own" | "all" | "allowlist";
};

// Discord config
export type DiscordChannelConfig = BaseChannelConfig & {
  token?: string;
  intents?: {
    presence?: boolean;
    guildMembers?: boolean;
  };
  reactionNotifications?: "off" | "own" | "all" | "allowlist";
};

// Slack config
export type SlackChannelConfig = BaseChannelConfig & {
  mode?: "socket" | "http";
  botToken?: string;
  appToken?: string;
  userToken?: string;
  requireMention?: boolean;
  slashCommand?: string;
};

// WhatsApp config
export type WhatsAppChannelConfig = BaseChannelConfig & {
  authDir?: string;
  sendReadReceipts?: boolean;
  selfChatMode?: "off" | "forward" | "local";
  debounceMs?: number;
  ackReaction?: string;
};

// Signal config
export type SignalChannelConfig = BaseChannelConfig & {
  account?: string;
  httpUrl?: string;
  httpHost?: string;
  httpPort?: number;
  cliPath?: string;
  autoStart?: boolean;
  sendReadReceipts?: boolean;
};

// Google Chat config
export type GoogleChatChannelConfig = BaseChannelConfig & {
  serviceAccount?: string | object;
  serviceAccountFile?: string;
  webhookPath?: string;
  webhookUrl?: string;
  typingIndicator?: "none" | "message" | "reaction";
};

// iMessage config
export type IMessageChannelConfig = BaseChannelConfig & {
  cliPath?: string;
  dbPath?: string;
  remoteHost?: string;
  service?: "imessage" | "sms" | "auto";
  region?: string;
  includeAttachments?: boolean;
};

// MS Teams config
export type MSTeamsChannelConfig = BaseChannelConfig & {
  appId?: string;
  appPassword?: string;
  tenantId?: string;
  webhook?: {
    port?: number;
    path?: string;
  };
  replyStyle?: "thread" | "top-level";
};

// WeChat config
export type WeChatPollingConfig = {
  pollingIntervalMs?: number;
  pollContactIds?: string[];
  pollAllContacts?: boolean;
  maxPollContacts?: number;
};

export type WeChatChannelConfig = BaseChannelConfig & {
  name?: string;
  baseUrl?: string;
  apiToken?: string;
  tokenFile?: string;
  robotId?: number;
  defaultAccount?: string;
  requireMention?: boolean;
  polling?: WeChatPollingConfig;
  accounts?: Record<string, WeChatChannelConfig>;
};

// Matrix config
export type MatrixChannelConfig = BaseChannelConfig & {
  homeserver?: string;
  userId?: string;
  accessToken?: string;
  password?: string;
  encryption?: boolean;
  autoJoin?: "always" | "allowlist" | "off";
};

// Mattermost config
export type MattermostChannelConfig = BaseChannelConfig & {
  baseUrl?: string;
  botToken?: string;
  requireMention?: boolean;
};

// Nostr config
export type NostrChannelConfig = BaseChannelConfig & {
  privateKey?: string;
};

// LINE config
export type LineChannelConfig = BaseChannelConfig & {
  channelAccessToken?: string;
  channelSecret?: string;
};

// Twitch config
export type TwitchChannelConfig = BaseChannelConfig & {
  username?: string;
  accessToken?: string;
  clientId?: string;
  channel?: string;
  requireMention?: boolean;
};

// BlueBubbles config
export type BlueBubblesChannelConfig = BaseChannelConfig & {
  serverUrl?: string;
  password?: string;
  webhookPath?: string;
  sendReadReceipts?: boolean;
};

// Zalo config
export type ZaloChannelConfig = BaseChannelConfig & {
  botToken?: string;
  tokenFile?: string;
webhookUrl?: string;
  webhookSecret?: string;
};

// Nextcloud Talk config
export type NextcloudTalkChannelConfig = BaseChannelConfig & {
  baseUrl?: string;
  botSecret?: string;
  apiUser?: string;
  apiPassword?: string;
};

// Tlon (Urbit) config
export type TlonChannelConfig = BaseChannelConfig & {
  ship?: string;
  url?: string;
  code?: string;
  autoDiscoverChannels?: boolean;
};

// Channel metadata
export type ChannelMeta = {
  id: string;
  label: string;
  icon: string;
  description: string;
  docsUrl?: string;
  configFields: ChannelConfigField[];
};

// Config field definition
export type ChannelConfigField = {
  key: string;
  label: string;
  type: "text" | "password" | "number" | "select" | "toggle" | "array";
  placeholder?: string;
  description?: string;
  options?: Array<{ value: string; label: string }>;
  required?: boolean;
  section?: string;
};

// All channel configs
export type ChannelsConfigData = {
  defaults?: {
    groupPolicy?: GroupPolicy;
  };
  // Built-in channels
  telegram?: TelegramChannelConfig;
  discord?: DiscordChannelConfig;
  slack?: SlackChannelConfig;
  whatsapp?: WhatsAppChannelConfig;
  signal?: SignalChannelConfig;
  googlechat?: GoogleChatChannelConfig;
  imessage?: IMessageChannelConfig;
  msteams?: MSTeamsChannelConfig;
  // Extended channels
  wechat?: WeChatChannelConfig;
  matrix?: MatrixChannelConfig;
  mattermost?: MattermostChannelConfig;
  nostr?: NostrChannelConfig;
  line?: LineChannelConfig;
  twitch?: TwitchChannelConfig;
  bluebubbles?: BlueBubblesChannelConfig;
  zalo?: ZaloChannelConfig;
  "nextcloud-talk"?: NextcloudTalkChannelConfig;
  tlon?: TlonChannelConfig;
  [key: string]: unknown;
};
