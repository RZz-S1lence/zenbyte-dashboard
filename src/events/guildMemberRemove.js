const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');
const ticketHandler = require('../handlers/tickets');
const memberCounter = require('../membercounter/service');

module.exports = {
  name: Events.GuildMemberRemove,
  async execute(client, member) {
    memberCounter.scheduleGuildUpdate(client, member.guild.id);
    await ticketHandler.handleMemberLeave(client, member).catch(() => {});

    const kicker = await getAuditLogExecutor(member.guild, AuditLogEvent.MemberKick, member.id);
    if (kicker) await antinuke.track(client, member.guild, 'kick', kicker);

    const joinedAt    = member.joinedTimestamp ? Math.floor(member.joinedTimestamp / 1000) : null;
    const timeInGuild = joinedAt ? Math.floor((Date.now() - member.joinedTimestamp) / 86400000) : null;

    await sendLog(client, member.guild, 'memberleave', {
      title: 'Member Left',
      color: 0xED4245,
      fields: [
        { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
        { name: 'Roles', value: member.roles.cache.filter(r => r.id !== member.guild.id).map(r => r.name).join(', ') || '*None*', inline: false },
        { name: 'Joined', value: joinedAt ? `<t:${joinedAt}:R>` : '*Unknown*', inline: true },
        { name: 'Time in Server', value: timeInGuild !== null ? `${timeInGuild} days` : '*Unknown*', inline: true }
      ],
      thumbnail: { url: member.user.displayAvatarURL() },
      timestamp: new Date()
    });
  }
};
