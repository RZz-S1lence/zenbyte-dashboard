const { Events } = require('discord.js');
const activity = require('../activity/service');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    try {
      if (reaction.partial) await reaction.fetch();
      if (!reaction.message.guild) return;
      await activity.onReaction(client, reaction, user);
    } catch { /* ignore */ }
  }
};
