const { AuditLogEvent } = require('discord.js');

// Single source of truth for every anti-nuke protection.
// `audit` is the audit-log event used to attribute the action to an executor.
const PROTECTIONS = [
  { key: 'ban',                 label: 'Mass Ban',              audit: AuditLogEvent.MemberBanAdd,  defaultPunishment: 'ban' },
  { key: 'kick',                label: 'Mass Kick',             audit: AuditLogEvent.MemberKick,    defaultPunishment: 'ban' },
  { key: 'channelDelete',       label: 'Mass Channel Delete',   audit: AuditLogEvent.ChannelDelete, defaultPunishment: 'ban' },
  { key: 'channelCreate',       label: 'Mass Channel Create',   audit: AuditLogEvent.ChannelCreate, defaultPunishment: 'stripRoles' },
  { key: 'roleDelete',          label: 'Mass Role Delete',      audit: AuditLogEvent.RoleDelete,    defaultPunishment: 'ban' },
  { key: 'roleCreate',          label: 'Mass Role Create',      audit: AuditLogEvent.RoleCreate,    defaultPunishment: 'stripRoles' },
  { key: 'webhookCreate',       label: 'Mass Webhook Create',   audit: AuditLogEvent.WebhookCreate, defaultPunishment: 'stripRoles' },
  { key: 'botAdd',              label: 'Mass Bot Add',          audit: AuditLogEvent.BotAdd,        defaultPunishment: 'ban' },
  { key: 'emojiDelete',         label: 'Mass Emoji/Sticker Delete', audit: AuditLogEvent.EmojiDelete, defaultPunishment: 'stripRoles' },
  { key: 'dangerousPermission', label: 'Dangerous Permission Grant', audit: AuditLogEvent.RoleUpdate, defaultPunishment: 'stripRoles' }
];

const PUNISHMENTS = ['none', 'stripRoles', 'kick', 'ban'];

function defaultProtection(p) {
  return {
    enabled:    true,
    limit:      3,
    windowMs:   10000,
    punishment: p.defaultPunishment,
    whitelist:  { users: [], roles: [] }
  };
}

function defaultConfig() {
  const protections = {};
  for (const p of PROTECTIONS) protections[p.key] = defaultProtection(p);
  return {
    enabled:         false,
    logChannelId:    null,
    globalWhitelist: { users: [], roles: [] },
    protections
  };
}

// Merges a stored (possibly partial) config onto fresh defaults so new protections
// always exist and missing fields are filled in.
function mergeConfig(stored = {}) {
  const base = defaultConfig();
  base.enabled      = stored.enabled ?? base.enabled;
  base.logChannelId = stored.logChannelId ?? base.logChannelId;
  base.globalWhitelist = {
    users: stored.globalWhitelist?.users || [],
    roles: stored.globalWhitelist?.roles || []
  };
  for (const p of PROTECTIONS) {
    const s = stored.protections?.[p.key] || {};
    base.protections[p.key] = {
      enabled:    s.enabled ?? true,
      limit:      Number.isFinite(s.limit) ? s.limit : base.protections[p.key].limit,
      windowMs:   Number.isFinite(s.windowMs) ? s.windowMs : base.protections[p.key].windowMs,
      punishment: PUNISHMENTS.includes(s.punishment) ? s.punishment : base.protections[p.key].punishment,
      whitelist:  { users: s.whitelist?.users || [], roles: s.whitelist?.roles || [] }
    };
  }
  return base;
}

module.exports = { PROTECTIONS, PUNISHMENTS, defaultConfig, mergeConfig };
