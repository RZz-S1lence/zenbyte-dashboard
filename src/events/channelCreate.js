const { Events, AuditLogEvent } = require('discord.js');
const { getAuditLogExecutor } = require('../utils/audit');
const { findMuteRole, applyMuteToChannel } = require('../utils/muteRole');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.ChannelCreate,
  async execute(client, channel) {
    if (!channel.guild) return;

    // Keep muted members silenced in channels created after the role was set up.
    const muteRole = findMuteRole(channel.guild, client.store);
    if (muteRole) await applyMuteToChannel(channel, muteRole, 'Re-applying Muted role to new channel');

    const executor = await getAuditLogExecutor(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    if (executor) await antinuke.track(client, channel.guild, 'channelCreate', executor);
  }
};
