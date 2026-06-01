const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');

module.exports = {
  name: Events.GuildBanRemove,
  async execute(client, ban) {
    const executor = await getAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    await sendLog(client, ban.guild, 'unban', {
      title: 'User Unbanned',
      color: 0x57F287,
      fields: [
        { name: 'User', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
        { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: false }
      ],
      thumbnail: { url: ban.user.displayAvatarURL() },
      timestamp: new Date()
    });
  }
};
