const { Events } = require('discord.js');
const { sendLog } = require('../utils/audit');

module.exports = {
  name: Events.MessageUpdate,
  async execute(client, oldMessage, newMessage) {
    if (oldMessage.author?.bot || !oldMessage.guild || oldMessage.content === newMessage.content) return;
    if (client.store.isTicketChannel(oldMessage.guild.id, oldMessage.channel.id)) return;
    await sendLog(client, oldMessage.guild, 'messageedit', {
      title: 'Message Edited',
      color: 0xFEE75C,
      fields: [
        { name: 'Author', value: `${newMessage.author} (\`${newMessage.author.id}\`)`, inline: true },
        { name: 'Channel', value: `${newMessage.channel}`, inline: true },
        { name: 'Before', value: oldMessage.content?.substring(0, 1024) || '*Empty*', inline: false },
        { name: 'After', value: newMessage.content?.substring(0, 1024) || '*Empty*', inline: false },
        { name: 'Jump', value: `[Go to Message](${newMessage.url})`, inline: true }
      ],
      timestamp: new Date()
    });
  }
};
