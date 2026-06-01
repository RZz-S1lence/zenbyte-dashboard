const { Events, AuditLogEvent } = require('discord.js');
const { getRecentExecutor } = require('../utils/audit');
const antinuke = require('../security/antinuke');

module.exports = {
  name: Events.WebhooksUpdate,
  async execute(client, channel) {
    if (!channel.guild) return;
    const executor = await getRecentExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (executor) await antinuke.track(client, channel.guild, 'webhookCreate', executor);
  }
};
