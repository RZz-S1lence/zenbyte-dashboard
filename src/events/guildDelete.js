const { Events } = require('discord.js');
const logger = require('../utils/logger');

// When the bot is removed from a server, delete everything stored for it.
// Keeps memory and disk from growing forever and honours the data deletion
// promise in the Terms of Service.
module.exports = {
  name: Events.GuildDelete,
  async execute(client, guild) {
    // GuildDelete also fires on a brief outage; skip those so we don't wipe live data.
    if (guild.unavailable) return;

    const stores = [client.store, client.levels, client.activity, client.trust, client.altdetect, client.polls, client.social, client.autoroles, client.reactionroles];
    for (const store of stores) {
      try { store.purgeGuild(guild.id); }
      catch (e) { logger.error(`Failed to purge ${store?.constructor?.name || 'store'} for guild ${guild.id}:`, e.message); }
    }
    logger.info(`Removed from guild ${guild.id}; stored data purged.`);
  }
};
