const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');
const altdetect = require('../altdetect/service');
const antinuke = require('../security/antinuke');
const leveling = require('../leveling/service');
const autorole = require('../autorole/service');
const memberCounter = require('../membercounter/service');

module.exports = {
  name: Events.GuildMemberAdd,
  async execute(client, member) {
    memberCounter.scheduleGuildUpdate(client, member.guild.id);
    if (member.user.bot) {
      const adder = await getAuditLogExecutor(member.guild, AuditLogEvent.BotAdd, member.id);
      if (adder) await antinuke.track(client, member.guild, 'botAdd', adder);
    } else {
      // Alt / suspicious-account detection. May kick/ban before the join log fires.
      const removed = await altdetect.runJoinCheck(client, member).catch(() => false);
      if (removed) return;

      // Rejoin sync. Restore any level role rewards the member earned previously.
      await leveling.syncRewards(client, member).catch(() => {});
    }

    // Autoroles: grant the configured join roles (separate sets for humans/bots).
    await autorole.applyOnJoin(client, member).catch(() => {});

    const createdAt = Math.floor(member.user.createdTimestamp / 1000);
    const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

    await sendLog(client, member.guild, 'memberjoin', {
      content: `<@${member.id}>`,
      embeds: [{
        title: 'Member Joined',
        color: 0x57F287,
        fields: [
          { name: 'User', value: `${member.user.tag}`, inline: true },
          { name: 'User ID', value: `\`${member.id}\``, inline: true },
          { name: 'Account Created', value: `<t:${createdAt}:f>`, inline: true },
          { name: 'Account Age', value: `${accountAgeDays} days`, inline: true },
          { name: 'Joined At', value: `<t:${Math.floor(Date.now() / 1000)}:R>`, inline: true }
        ],
        thumbnail: { url: member.user.displayAvatarURL() },
        timestamp: new Date()
      }]
    });
  }
};
