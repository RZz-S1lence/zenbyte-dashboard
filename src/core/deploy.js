const { REST, Routes } = require('discord.js');
const { token, guildId } = require('../config');
const logger = require('../utils/logger');

// Registers all loaded slash commands with Discord.
// Uses guild-scoped registration when GUILD_ID is set (instant), otherwise global.
async function deployCommands(client) {
  const body = [...client.commands.values()].map(c => c.data.toJSON());
  if (!body.length) return;

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      const data = await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body });
      logger.success(`Registered ${data.length} guild command(s) to ${guildId}.`);
    } else {
      const data = await rest.put(Routes.applicationCommands(client.user.id), { body });
      logger.success(`Registered ${data.length} global command(s).`);
    }
  } catch (err) {
    logger.error('Slash command registration failed:', err);
  }
}

module.exports = deployCommands;
