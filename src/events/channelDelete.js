const { Events, AuditLogEvent } = require('discord.js');
const { getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.ChannelDelete,
  async execute(client, channel) {
    if (!channel.guild) return;
    const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    if (executor) await antinuke.track(client, channel.guild, 'channelDelete', executor);
  }
};
