const { Events } = require('discord.js');
const { broadcastMessage } = require('../dashboard/chat');

module.exports = {
  name: Events.MessageCreate,
  execute(client, message) {
    if (!message.guild) return;
    broadcastMessage(client, message);

    // Track last activity for ticket auto-close (skip the bot's own messages).
    if (!message.author.bot) {
      const data = client.store.openTickets.get(message.guild.id)?.get(message.channel.id);
      if (data) data.lastActivity = Date.now();
    }
  }
};
