const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.GuildBanAdd,
  async execute(client, ban) {
    const executor = await getAuditLogExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    if (executor) await antinuke.track(client, ban.guild, 'ban', executor);
    await sendLog(client, ban.guild, 'ban', {
      title: 'User Banned',
      color: 0xED4245,
      fields: [
        { name: 'User', value: `${ban.user.tag} (\`${ban.user.id}\`)`, inline: true },
        { name: 'Reason', value: ban.reason || '*No reason provided*', inline: true },
        { name: 'By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Unknown', inline: false }
      ],
      thumbnail: { url: ban.user.displayAvatarURL() },
      timestamp: new Date()
    });
  }
};
