import {
  createScopedPairingAccess,
  createNormalizedOutboundDeliverer,
  createReplyPrefixOptions,
  formatTextWithAttachmentLinks,
  resolveOutboundMediaUrls,
  resolveAllowlistProviderRuntimeGroupPolicy,
  resolveDefaultGroupPolicy,
  readStoreAllowFromForDmPolicy,
  resolveDmGroupAccessWithCommandGate,
  logInboundDrop,
  type OutboundReplyPayload,
  type OpenClawConfig,
} from "openclaw/plugin-sdk";
import { getOdooDiscussRuntime } from "./runtime.js";
import { sendMessageOdooDiscuss } from "./send.js";
import type {
  CoreConfig,
  OdooDiscussInboundMessage,
  ResolvedOdooDiscussAccount,
} from "./types.js";

const CHANNEL_ID = "odoo-discuss" as const;

async function deliverOdooDiscussReply(params: {
  payload: OutboundReplyPayload;
  channelId: string;
  accountId: string;
}): Promise<void> {
  const { payload, channelId, accountId } = params;
  const combined = formatTextWithAttachmentLinks(payload.text, resolveOutboundMediaUrls(payload));
  if (!combined) {
    return;
  }

  await sendMessageOdooDiscuss(channelId, combined, { accountId });
}

export async function handleOdooDiscussInbound(params: {
  message: OdooDiscussInboundMessage;
  account: ResolvedOdooDiscussAccount;
  config: CoreConfig;
}): Promise<void> {
  const { message, account, config } = params;
  const core = getOdooDiscussRuntime();

  const logger = core.logging.getChildLogger({ channel: "odoo-discuss" });
  const rawBody = message.body?.trim() ?? "";
  if (!rawBody) {
    logger.info("odoo-discuss inbound: empty body, skipping");
    return;
  }

  const channelId = message.channelId;
  const channelName = message.channelName;
  const senderId = message.authorId;
  const senderName = message.authorName;

  // Discuss channels are always group chats
  const isGroup = true;

  // Access control
  const dmPolicy = account.config.dmPolicy ?? "open";
  const defaultGroupPolicy = resolveDefaultGroupPolicy(config as OpenClawConfig);
  const { groupPolicy } = resolveAllowlistProviderRuntimeGroupPolicy({
    providerConfigPresent:
      ((config.channels as Record<string, unknown> | undefined)?.["odoo-discuss"] ?? undefined) !==
      undefined,
    groupPolicy: (account.config.groupPolicy ?? "open") as "allowlist" | "open" | "disabled",
    defaultGroupPolicy,
  });

  const configAllowFrom = (account.config.allowFrom ?? []).map((s) => String(s).toLowerCase());
  const configGroupAllowFrom = (account.config.groupAllowFrom ?? []).map((s) =>
    String(s).toLowerCase(),
  );

  // Room-level config (check specific channel, then wildcard)
  const roomConfig = account.config.rooms?.[channelId] ?? account.config.rooms?.["*"];
  if (roomConfig?.enabled === false) {
    logger.info("odoo-discuss inbound: room disabled, skipping");
    return;
  }
  logger.info(`odoo-discuss inbound: access check — dmPolicy=${dmPolicy} groupPolicy=${groupPolicy} allowFrom=${JSON.stringify(configAllowFrom)} senderId=${senderId}`);

  const allowTextCommands = core.channel.commands.shouldHandleTextCommands({
    cfg: config as OpenClawConfig,
    surface: CHANNEL_ID,
  });
  const hasControlCommand = core.channel.text.hasControlCommand(rawBody, config as OpenClawConfig);

  const access = resolveDmGroupAccessWithCommandGate({
    isGroup,
    dmPolicy,
    groupPolicy,
    allowFrom: configAllowFrom,
    groupAllowFrom: configGroupAllowFrom,
    storeAllowFrom: [],
    isSenderAllowed: (allowFrom) => {
      const normalizedSender = String(senderId).toLowerCase();
      return (
        allowFrom.includes("*") ||
        allowFrom.includes(normalizedSender) ||
        allowFrom.length === 0
      );
    },
    command: {
      useAccessGroups: true,
      allowTextCommands,
      hasControlCommand,
    },
  });

  logger.info(`odoo-discuss inbound: access decision=${access.decision} reason=${access.reason ?? "none"} commandAuthorized=${access.commandAuthorized}`);

  if (access.decision !== "allow") {
    logger.info(`odoo-discuss inbound: ACCESS DENIED reason=${access.reason}`);
    return;
  }

  if (access.shouldBlockControlCommand) {
    logger.info("odoo-discuss inbound: blocked control command");
    return;
  }

  // Mention gating
  const mentionRegexes = core.channel.mentions.buildMentionRegexes(config as OpenClawConfig);
  const wasMentioned = mentionRegexes.length
    ? core.channel.mentions.matchesMentionPatterns(rawBody, mentionRegexes)
    : false;
  const shouldRequireMention =
    roomConfig?.requireMention !== undefined ? roomConfig.requireMention : true;

  logger.info(`odoo-discuss inbound: mention check — requireMention=${shouldRequireMention} wasMentioned=${wasMentioned} hasControlCommand=${hasControlCommand}`);
  if (isGroup && shouldRequireMention && !wasMentioned && !hasControlCommand) {
    logger.info("odoo-discuss inbound: skipping (no mention in group)");
    return;
  }
  logger.info("odoo-discuss inbound: passed all gates, dispatching to AI");

  // Route resolution
  const route = core.channel.routing.resolveAgentRoute({
    cfg: config as OpenClawConfig,
    channel: CHANNEL_ID,
    accountId: account.accountId,
    peer: { kind: "group", id: channelId },
  });

  // Build envelope
  const fromLabel = `room:${channelName || channelId}`;
  const storePath = core.channel.session.resolveStorePath(
    (config.session as Record<string, unknown> | undefined)?.store as string | undefined,
    { agentId: route.agentId },
  );
  const envelopeOptions = core.channel.reply.resolveEnvelopeFormatOptions(config as OpenClawConfig);
  const previousTimestamp = core.channel.session.readSessionUpdatedAt({
    storePath,
    sessionKey: route.sessionKey,
  });
  const body = core.channel.reply.formatAgentEnvelope({
    channel: "Odoo Discuss",
    from: fromLabel,
    timestamp: message.timestamp,
    previousTimestamp,
    envelope: envelopeOptions,
    body: rawBody,
  });

  const groupSystemPrompt = roomConfig?.systemPrompt?.trim() || undefined;

  const ctxPayload = core.channel.reply.finalizeInboundContext({
    Body: body,
    BodyForAgent: rawBody,
    RawBody: rawBody,
    CommandBody: rawBody,
    From: `odoo-discuss:room:${channelId}`,
    To: `odoo-discuss:${channelId}`,
    SessionKey: route.sessionKey,
    AccountId: route.accountId,
    ChatType: "group",
    ConversationLabel: fromLabel,
    SenderName: senderName || undefined,
    SenderId: senderId,
    GroupSubject: channelName || channelId,
    GroupSystemPrompt: groupSystemPrompt,
    Provider: CHANNEL_ID,
    Surface: CHANNEL_ID,
    WasMentioned: wasMentioned || undefined,
    MessageSid: message.messageId,
    Timestamp: message.timestamp,
    OriginatingChannel: CHANNEL_ID,
    OriginatingTo: `odoo-discuss:${channelId}`,
    CommandAuthorized: access.commandAuthorized,
  });

  await core.channel.session.recordInboundSession({
    storePath,
    sessionKey: ctxPayload.SessionKey ?? route.sessionKey,
    ctx: ctxPayload,
    onRecordError: (err) => {
      core.logging
        .getChildLogger()
        .error(`odoo-discuss: failed updating session meta: ${String(err)}`);
    },
  });

  const { onModelSelected, ...prefixOptions } = createReplyPrefixOptions({
    cfg: config as OpenClawConfig,
    agentId: route.agentId,
    channel: CHANNEL_ID,
    accountId: account.accountId,
  });

  const deliverReply = createNormalizedOutboundDeliverer(async (payload) => {
    logger.info(`odoo-discuss inbound: delivering reply to channel=${channelId} textLen=${payload.text?.length ?? 0}`);
    try {
      await deliverOdooDiscussReply({
        payload,
        channelId,
        accountId: account.accountId,
      });
      logger.info(`odoo-discuss inbound: reply delivered successfully`);
    } catch (err) {
      logger.error(`odoo-discuss inbound: reply delivery FAILED: ${String(err)}`);
      throw err;
    }
  });

  await core.channel.reply.dispatchReplyWithBufferedBlockDispatcher({
    ctx: ctxPayload,
    cfg: config as OpenClawConfig,
    dispatcherOptions: {
      ...prefixOptions,
      deliver: deliverReply,
      onError: (err, info) => {
        core.logging
          .getChildLogger()
          .error(`odoo-discuss ${info.kind} reply failed: ${String(err)}`);
      },
    },
    replyOptions: {
      skillFilter: roomConfig?.skills,
      onModelSelected,
    },
  });
}
