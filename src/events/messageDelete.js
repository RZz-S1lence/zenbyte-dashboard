const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageDelete,
  async execute(client, message) {
    if (!message.guild) return;

    // If a reaction-role panel's message is deleted, remove the stored panel too,
    // so admins don't also have to run /reactionrole delete. Runs before the
    // bot-author check below because managed panels are posted by the bot.
    const rrMenu = client.reactionroles.findByMessage(message.guild.id, message.id);
    if (rrMenu) {
      client.reactionroles.deleteMenu(message.guild.id, rrMenu.id);
      logger.info(`Reaction-role panel ${rrMenu.id} removed in ${message.guild.id} because its message was deleted.`);
    }

    if (message.author?.bot) return;
    if (client.store.isTicketChannel(message.guild.id, message.channel.id)) return;
    const executor = await getAuditLogExecutor(message.guild, AuditLogEvent.MessageDelete, message.author?.id);
    await sendLog(client, message.guild, 'deletemessage', {
      title: 'Message Deleted',
      color: 0xED4245,
      fields: [
        { name: 'Author', value: `${message.author} (\`${message.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${message.channel}`, inline: true },
        { name: 'Content', value: message.content?.substring(0, 1024) || '*Empty/Embed*', inline: false },
        { name: 'Deleted By', value: executor ? `${executor} (\`${executor.id}\`)` : 'Self/Unknown', inline: true }
      ],
      timestamp: new Date()
    });
  }
};
