const { Events, AuditLogEvent } = require('discord.js');
const { getAuditLogExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.ChannelCreate,
  async execute(client, channel) {
    if (!channel.guild) return;
    const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    if (executor) await antinuke.track(client, channel.guild, 'channelCreate', executor);
  }
};
