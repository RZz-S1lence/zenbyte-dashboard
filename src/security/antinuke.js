const { PermissionFlagsBits } = require('discord.js');
const { ownerId } = require('../config');
const logger = require('../utils/logger');

// Sliding-window action timestamps: Map<"guildId:type:executorId", number[]>
const windows = new Map();
// Debounce so one offender isn't punished repeatedly while events flush in.
const recentlyPunished = new Map(); // "guildId:executorId" -> expiry ts

function isWhitelisted(config, protection, member) {
  if (member.id === ownerId) return true;
  if (member.id === member.guild.ownerId) return true;
  const ids = member.roles.cache;
  const inList = wl => wl.users?.includes(member.id) || wl.roles?.some(r => ids.has(r));
  return inList(config.globalWhitelist) || inList(protection.whitelist);
}

function pushWindow(key, windowMs) {
  const now = Date.now();
  const arr = (windows.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  windows.set(key, arr);
  return arr.length;
}

async function applyPunishment(member, punishment, reason) {
  try {
    switch (punishment) {
      case 'ban':
        if (member.bannable) return await member.ban({ reason }), 'banned';
        return 'failed (cannot ban, role hierarchy)';
      case 'kick':
        if (member.kickable) return await member.kick(reason), 'kicked';
        return 'failed (cannot kick, role hierarchy)';
      case 'stripRoles': {
        const removable = member.roles.cache.filter(r => r.id !== member.guild.id && r.editable);
        if (!removable.size) return 'no removable roles';
        await member.roles.remove(removable, reason);
        return 'roles stripped';
      }
      default: return 'no action (logging only)';
    }
  } catch (e) {
    logger.error(`Anti-nuke punishment failed for ${member.id}:`, e.message);
    return `failed (${e.message})`;
  }
}

async function logEvent(client, guild, config, { protection, label, executor, count, limit, windowMs, outcome }) {
  const channelId = config.logChannelId;
  if (!channelId) return;
  const channel = guild.channels.cache.get(channelId);
  if (!channel) return;
  await channel.send({
    embeds: [{
      title: '🛡️ Anti-Nuke Triggered',
      color: 0xed4245,
      fields: [
        { name: 'Protection', value: label, inline: true },
        { name: 'Offender', value: `${executor} (\`${executor.id}\`)`, inline: true },
        { name: 'Threshold', value: `${count}/${limit} in ${Math.round(windowMs / 1000)}s`, inline: true },
        { name: 'Punishment', value: `\`${protection.punishment}\` → ${outcome}`, inline: false }
      ],
      timestamp: new Date().toISOString()
    }]
  }).catch(() => {});
}

// Records one attributed dangerous action and punishes the executor if the
// configured threshold for `type` is exceeded. Safe to call on every event.
async function track(client, guild, type, executor, meta = {}) {
  if (!executor || executor.bot && executor.id === client.user.id) return;

  const config = client.store.getSecurityConfig(guild.id);
  if (!config.enabled) return;

  const protection = config.protections[type];
  if (!protection || !protection.enabled) return;

  let member = guild.members.cache.get(executor.id);
  if (!member) member = await guild.members.fetch(executor.id).catch(() => null);
  if (!member) return;

  if (isWhitelisted(config, protection, member)) return;

  const count = pushWindow(`${guild.id}:${type}:${executor.id}`, protection.windowMs);
  if (count < protection.limit) return;

  const punishKey = `${guild.id}:${executor.id}`;
  if ((recentlyPunished.get(punishKey) || 0) > Date.now()) return;
  recentlyPunished.set(punishKey, Date.now() + 15000);

  const { PROTECTIONS } = require('./protections');
  const label = PROTECTIONS.find(p => p.key === type)?.label || type;
  const reason = `Anti-Nuke: ${label} threshold exceeded (${count} in ${Math.round(protection.windowMs / 1000)}s)`;

  const outcome = await applyPunishment(member, protection.punishment, reason);
  logger.warn(`Anti-nuke: ${executor.tag} tripped ${type} in ${guild.name} → ${protection.punishment} (${outcome})`);
  windows.delete(`${guild.id}:${type}:${executor.id}`);

  await logEvent(client, guild, config, {
    protection, label, executor, count, limit: protection.limit, windowMs: protection.windowMs, outcome
  });
}

module.exports = { track };
