const { Events, AuditLogEvent } = require('discord.js');
const { getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.GuildRoleCreate,
  async execute(client, role) {
    const executor = await getAuditLogExecutor(role.guild, AuditLogEvent.RoleCreate, role.id);
    if (executor) await antinuke.track(client, role.guild, 'roleCreate', executor);
  }
};
