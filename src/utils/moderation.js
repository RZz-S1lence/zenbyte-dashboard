const { PermissionFlagsBits } = require('discord.js');
const { ownerId } = require('../config');

const PRIVILEGED_PERMS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels
];

function isPrivileged(member, store) {
  if (!member) return false;
  if (PRIVILEGED_PERMS.some(p => member.permissions.has(p))) return true;
  if (store && typeof store.isModerator === 'function') return store.isModerator(member.guild.id, member);
  return false;
}

// Validates whether `invoker` may act on `target`.
// protectedOnly = true → only enforce role hierarchy when the target is a mod/admin (used by /warn).
// protectedOnly = false → always require the invoker to outrank the target (used by /ban, /kick).
function canModerate(invoker, target, { store, action = 'moderate', protectedOnly = false } = {}) {
  if (!target) return { ok: false, reason: 'That user is not a member of this server.' };
  if (invoker.id === target.id) return { ok: false, reason: `You cannot ${action} yourself.` };
  if (target.id === invoker.guild.ownerId) return { ok: false, reason: `You cannot ${action} the server owner.` };

  if (invoker.id === ownerId || invoker.id === invoker.guild.ownerId) return { ok: true };

  const enforce = protectedOnly ? isPrivileged(target, store) : true;
  if (enforce && invoker.roles.highest.comparePositionTo(target.roles.highest) <= 0) {
    const who = protectedOnly ? 'another staff member with an equal or higher role' : 'a member with an equal or higher role';
    return { ok: false, reason: `You cannot ${action} ${who}.` };
  }
  return { ok: true };
}

module.exports = { canModerate, isPrivileged };
