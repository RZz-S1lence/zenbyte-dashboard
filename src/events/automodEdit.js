const { Events } = require('discord.js');
const automod = require('../automod/service');
const logger = require('../utils/logger');

// Re-checks edited messages so filters can't be dodged by editing afterwards.
// Only content filters run here (no spam / duplicate tracking).
module.exports = {
  name: Events.MessageUpdate,
  async execute(client, oldMessage, newMessage) {
    try {
      if (newMessage.partial) newMessage = await newMessage.fetch().catch(() => null);
      if (!newMessage || oldMessage.content === newMessage.content) return;
      await automod.onMessage(client, newMessage, { edited: true });
    } catch (e) { logger.error('AutoMod edit error:', e.message); }
  }
};
