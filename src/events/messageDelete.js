const { Events, AuditLogEvent } = require('discord.js');
const { sendLog, getAuditLogExecutor } = require('../utils/audit');

module.exports = {
  name: Events.MessageDelete,
  async execute(client, message) {
    if (message.author?.bot || !message.guild) return;
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
