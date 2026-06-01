const { Events } = require('discord.js');
const reactionRoles = require('../reactionrole/service');
const logger = require('../utils/logger');

module.exports = {
  name: Events.MessageReactionAdd,
  async execute(client, reaction, user) {
    if (user.bot) return;
    try {
      if (reaction.partial) await reaction.fetch();
      if (reaction.message.partial) await reaction.message.fetch();
      await reactionRoles.handleReaction(client, reaction, user, true);
    } catch (e) { logger.debug?.(`Reaction-role add skipped: ${e.message}`); }
  }
};
