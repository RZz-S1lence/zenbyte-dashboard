const { Events, AuditLogEvent, PermissionFlagsBits } = require('discord.js');
const { getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

const DANGEROUS = [
  PermissionFlagsBits.Administrator,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageWebhooks
];

module.exports = {
  name: Events.GuildRoleUpdate,
  async execute(client, oldRole, newRole) {
    const gained = DANGEROUS.some(p => !oldRole.permissions.has(p) && newRole.permissions.has(p));
    if (!gained) return;
    const executor = await getAuditLogExecutor(newRole.guild, AuditLogEvent.RoleUpdate, newRole.id);
    if (executor) await antinuke.track(client, newRole.guild, 'dangerousPermission', executor);
  }
};
