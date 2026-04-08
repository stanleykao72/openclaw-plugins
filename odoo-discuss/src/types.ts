/** Odoo Discuss channel configuration for a single account. */
export type OdooDiscussAccountConfig = {
  /** If false, do not start this Odoo Discuss account. Default: true. */
  enabled?: boolean;
  /** Optional display name for this account. */
  name?: string;
  /** Base URL of the Odoo instance (e.g., "https://odoo.example.com"). */
  odooUrl?: string;
  /** Shared HMAC secret for webhook signature verification. */
  hmacSecret?: string;
  /** DM policy (default: "open"). Discuss channels are inherently group-based. */
  dmPolicy?: "pairing" | "allowlist" | "open";
  /** Group message policy (default: "open"). */
  groupPolicy?: "allowlist" | "open" | "disabled";
  /** Optional allowlist of Odoo user IDs allowed to interact. */
  allowFrom?: string[];
  /** Optional allowlist for group senders. */
  groupAllowFrom?: string[];
  /** Per-channel configuration (key is Odoo discuss channel ID). */
  rooms?: Record<string, OdooDiscussRoomConfig>;
  /** Max group messages to keep as history context (0 disables). */
  historyLimit?: number;
  /** Outbound text chunk size (chars). Default: 4000. */
  textChunkLimit?: number;
  /** Outbound response prefix override. */
  responsePrefix?: string;
};

/** Per-Discuss-channel configuration. */
export type OdooDiscussRoomConfig = {
  /** If false, disable the bot for this channel. */
  enabled?: boolean;
  /** Require @mention to trigger the bot. Default: true. */
  requireMention?: boolean;
  /** Tool policy overrides for this channel. */
  tools?: { allow?: string[]; deny?: string[] };
  /** Skill allowlist for this channel. */
  skills?: string[];
  /** Sender allowlist for this channel. */
  allowFrom?: string[];
  /** System prompt snippet for this channel. */
  systemPrompt?: string;
};

/** Top-level config shape for odoo-discuss channel. */
export type OdooDiscussConfig = OdooDiscussAccountConfig;

/** Subset of OpenClaw config relevant to this plugin. */
export type CoreConfig = {
  channels?: {
    "odoo-discuss"?: OdooDiscussConfig;
  };
  [key: string]: unknown;
};

/**
 * Inbound webhook payload from Odoo openclaw_bridge.
 * Sent by message_post override when a user posts in a Discuss channel.
 */
export type OdooDiscussWebhookPayload = {
  event: string;
  /** Odoo discuss.channel ID. */
  channel_id: number;
  /** Odoo discuss.channel name. */
  channel_name: string;
  /** mail.message ID. */
  message_id: number;
  /** Message body (may contain HTML from Discuss). */
  body: string;
  /** Odoo res.partner ID of the author. */
  author_id: number | null;
  /** Display name of the author. */
  author_name: string | null;
  /** Channel type from identity (e.g., "odoo_discuss"). */
  channel_type: string | null;
  /** Channel UID from identity. */
  channel_uid: string | null;
  /** Whether this is an AI-enabled channel. */
  is_ai_channel: boolean;
  /** Whether outbound forwarding is enabled. */
  is_outbound_channel: boolean;
};

/** Parsed inbound message. */
export type OdooDiscussInboundMessage = {
  channelId: string;
  channelName: string;
  authorId: string;
  authorName: string;
  messageId: string;
  body: string;
  timestamp: number;
};

/** Result from sending a message to Odoo Discuss. */
export type OdooDiscussSendResult = {
  messageId: string;
  channelId: string;
};

/** Resolved account with all secrets loaded. */
export type ResolvedOdooDiscussAccount = {
  accountId: string;
  enabled: boolean;
  name?: string;
  odooUrl: string;
  hmacSecret: string;
  config: OdooDiscussAccountConfig;
};
