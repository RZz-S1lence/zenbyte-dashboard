const embeds = require('../utils/embeds');
const { formatDuration } = require('../utils/time');
const { findMuteRole } = require('../utils/muteRole');

// Builds the stored record for a mute.
function buildRecord({ moderatorId, moderatorTag, userTag, reason, durationMs }) {
  const mutedAt = Date.now();
  return {
    moderatorId,
    moderatorTag,
    userTag,
    reason: reason || 'No reason provided',
    mutedAt,
    durationMs: durationMs || null,
    expiresAt: durationMs ? mutedAt + durationMs : null
  };
}

// Adds the mute role to a member and records the mute. Returns the record.
async function applyMute(client, guild, member, role, opts) {
  await member.roles.add(role, `Muted by ${opts.moderatorTag}: ${opts.reason || 'No reason provided'}`);
  const record = buildRecord({ ...opts, userTag: member.user.tag });
  client.store.setMute(guild.id, member.id, record);
  return record;
}

// Removes the mute role (if present) and clears the record. Safe if the member left.
async function lift(client, guild, userId, { byTag = 'Auto', reason = '' } = {}) {
  const role = findMuteRole(guild, client.store);
  const member = await guild.members.fetch(userId).catch(() => null);
  if (member && role && member.roles.cache.has(role.id))
    await member.roles.remove(role, `Unmuted by ${byTag}${reason ? `: ${reason}` : ''}`).catch(() => {});
  client.store.removeMute(guild.id, userId);
  return member;
}

// Unmutes everyone whose timed mute has elapsed. Called periodically from ready.js.
async function sweep(client) {
  const now = Date.now();
  for (const { guildId, userId, record } of client.store.listAllMutes()) {
    if (!record.expiresAt || record.expiresAt > now) continue;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) { client.store.removeMute(guildId, userId); continue; }
    await lift(client, guild, userId, { byTag: 'ZenByte', reason: 'timed mute expired' }).catch(() => {});
  }
}

// A detailed embed describing one member's mute.
function infoEmbed(userId, record) {
  const secs = ms => Math.floor(ms / 1000);
  const fields = [
    { name: 'Member', value: `<@${userId}>${record.userTag ? ` (\`${record.userTag}\`)` : ''}`, inline: true },
    { name: 'Muted by', value: record.moderatorTag ? `${record.moderatorTag}` : `<@${record.moderatorId}>`, inline: true },
    { name: 'When', value: `<t:${secs(record.mutedAt)}:R>`, inline: true },
    { name: 'Duration', value: record.durationMs ? formatDuration(record.durationMs) : 'Permanent', inline: true },
    { name: 'Expires', value: record.expiresAt ? `<t:${secs(record.expiresAt)}:R>` : 'Never', inline: true },
    { name: 'Reason', value: record.reason || 'No reason provided' }
  ];
  return embeds.custom({ title: '🔇 Mute Details', color: embeds.COLORS.warn, fields });
}

module.exports = { applyMute, lift, sweep, infoEmbed, buildRecord };
