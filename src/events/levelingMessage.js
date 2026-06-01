const { Events } = require('discord.js');
const leveling = require('../leveling/service');

module.exports = {
  name: Events.MessageCreate,
  async execute(client, message) {
    if (message.author.bot || !message.inGuild()) return;
    try { await leveling.onMessage(client, message); }
    catch { /* never let XP errors break message handling */ }
  }
};
