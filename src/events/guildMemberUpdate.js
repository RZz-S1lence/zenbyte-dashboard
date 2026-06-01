const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(client, oldMember, newMember) {
    const g = newMember.guild;

    if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberUpdate, newMember.id);
      const duration = newMember.communicationDisabledUntil - Date.now();
      const hours = Math.floor(duration / 3600000);
      const mins  = Math.floor((duration % 3600000) / 60000);
      return sendLog(client, g, 'timeout', {
        title: 'User Timed Out',
        color: 0xFEE75C,
        fields: [
          { name: 'User', value: `${newMember} (\`${newMember.id}\`)`, inline: true },
          { name: 'Duration', value: `${hours}h ${mins}m`, inline: true },
          { name: 'Until', value: `<t:${Math.floor(newMember.communicationDisabledUntil.getTime() / 1000)}:R>`, inline: true },
          { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: false }
        ],
        timestamp: new Date()
      });
    }

    if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberUpdate, newMember.id);
      return sendLog(client, g, 'untimeout', {
        title: 'Timeout Removed',
        color: 0x57F287,
        fields: [
          { name: 'User', value: `${newMember} (\`${newMember.id}\`)`, inline: true },
          { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: true }
        ],
        timestamp: new Date()
      });
    }

    if (oldMember.nickname !== newMember.nickname) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberUpdate, newMember.id);
      return sendLog(client, g, 'changename', {
        title: 'Nickname Changed',
        color: 0x5865F2,
        fields: [
          { name: 'User', value: `${newMember} (\`${newMember.id}\`)`, inline: true },
          { name: 'Before', value: oldMember.nickname || '*None*', inline: true },
          { name: 'After', value: newMember.nickname || '*None*', inline: true },
          { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Self', inline: false }
        ],
        timestamp: new Date()
      });
    }

    const added = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
    if (added.size > 0) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberRoleUpdate, newMember.id);
      return sendLog(client, g, 'addroles', {
        title: 'Roles Added',
        color: 0x57F287,
        fields: [
          { name: 'User', value: `${newMember} (\`${newMember.id}\`)`, inline: false },
          { name: 'Added', value: added.map(r => r.name).join(', '), inline: false },
          { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: false }
        ],
        timestamp: new Date()
      });
    }

    const removed = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));
    if (removed.size > 0) {
      const executor = await getAuditLogExecutor(g, AuditLogEvent.MemberRoleUpdate, newMember.id);
      return sendLog(client, g, 'removeroles', {
        title: 'Roles Removed',
        color: 0xED4245,
        fields: [
          { name: 'User', value: `${newMember} (\`${newMember.id}\`)`, inline: false },
          { name: 'Removed', value: removed.map(r => r.name).join(', '), inline: false },
          { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: false }
        ],
        timestamp: new Date()
      });
    }
  }
};
