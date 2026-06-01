const { PermissionFlagsBits } = require('discord.js');
const { ownerId } = require('../config');

function isOwner(userId) {
  return userId === ownerId;
}

// Evaluates a command's declared access rules against the invoking member.
// Returns { ok: true } or { ok: false, reason }.
function check(command, interaction) {
  const { member, user, client, guildId } = interaction;

  if (command.ownerOnly && !isOwner(user.id))
    return { ok: false, reason: 'This command can only be used by the bot owner.' };

  if (command.adminOnly && !member.permissions.has(PermissionFlagsBits.Administrator))
    return { ok: false, reason: 'You need the **Administrator** permission to use this command.' };

  if (Array.isArray(command.permissions)) {
    for (const perm of command.permissions) {
      if (!member.permissions.has(perm))
        return { ok: false, reason: 'You are missing the required permissions for this command.' };
    }
  }

  if (command.modPermission) {
    const allowed = client.store.isModerator(guildId, member) || member.permissions.has(command.modPermission);
    if (!allowed)
      return { ok: false, reason: 'You must be a server moderator or have the required permission.' };
  }

  return { ok: true };
}

module.exports = { isOwner, check };
