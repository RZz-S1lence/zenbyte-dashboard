const { Events } = require('discord.js');
const activity = require('../activity/service');

module.exports = {
  name: Events.MessageCreate,
  execute(client, message) {
    if (!message.inGuild()) return;
    try { activity.onMessage(client, message); } catch { /* never break message handling */ }
  }
};
