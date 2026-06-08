const { Colors, PermissionFlagsBits } = require('discord.js');

const ROLE_NAME = 'Muted';

// Permissions a muted member loses in every channel.
const DENY = {
  SendMessages: false,
  SendMessagesInThreads: false,
  CreatePublicThreads: false,
  CreatePrivateThreads: false,
  AddReactions: false,
  Speak: false
};

// Finds the guild's mute role: the one saved in the store if it still exists,
// otherwise any role named "Muted" (case-insensitive). Returns the role or null.
// When `store` is given, a name match is remembered so later lookups are stable.
function findMuteRole(guild, store) {
  if (store) {
    const savedId = store.getMuteRoleId(guild.id);
    if (savedId) {
      const saved = guild.roles.cache.get(savedId);
      if (saved) return saved;
    }
  }
  const byName = guild.roles.cache.find(r => r.name.toLowerCase() === ROLE_NAME.toLowerCase()) || null;
  if (byName && store && store.getMuteRoleId(guild.id) !== byName.id) store.setMuteRoleId(guild.id, byName.id);
  return byName;
}

// Applies the muting deny-overwrite to a single channel, if possible.
async function applyMuteToChannel(channel, role, reason) {
  if (!channel?.manageable || typeof channel.permissionOverwrites?.edit !== 'function') return;
  await channel.permissionOverwrites.edit(role, DENY, { reason }).catch(() => {});
}

// Applies the muting deny-overwrite to every channel the bot can manage.
async function applyMuteOverwrites(guild, role, reason) {
  const tasks = [];
  for (const channel of guild.channels.cache.values())
    tasks.push(applyMuteToChannel(channel, role, reason));
  await Promise.allSettled(tasks);
}

// Creates a red "Muted" role with no permissions, then locks it out of every channel.
// When `store` is given, the new role is remembered as the guild's mute role.
async function createMuteRole(guild, reason, store) {
  const role = await guild.roles.create({
    name: ROLE_NAME,
    color: Colors.Red,
    permissions: [],
    hoist: false,
    mentionable: false,
    reason
  });
  await applyMuteOverwrites(guild, role, reason);
  if (store) store.setMuteRoleId(guild.id, role.id);
  return role;
}

module.exports = { ROLE_NAME, findMuteRole, createMuteRole, applyMuteOverwrites, applyMuteToChannel, DENY, PermissionFlagsBits };
