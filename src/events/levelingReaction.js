const { Events } = require('discord.js');
const leveling = require('../leveling/service');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (!reaction.message.guild) return;
      await leveling.onReaction(client, reaction, user);
    } catch (e) { logger.debug?.(`Reaction XP skipped: ${e.message}`); }
  }
};
