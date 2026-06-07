const { REST, Routes } = require('discord.js');
const { token, guildId, prefix } = require('../config');
const logger = require('../utils/logger');

// Registers all loaded slash commands with Discord.
//
// Owner-only commands are deliberately kept out of the global registration: a
// global command shows up in every server's slash-command picker, which would
// expose owner utilities like /restart or /gen-license to everyone. Instead they
// are scoped to the owner/admin guild (OFFICIAL_GUILD_ID, falling back to the
// test GUILD_ID). They remain usable anywhere through the text-prefix path, which
// runs the same owner check before executing.
//
// Registration target:
//   GUILD_ID set        → everything to that one guild (instant; for testing).
//   GUILD_ID not set     → public commands global, owner commands to the owner guild.
async function deployCommands(client) {
  const all = [...client.commands.values()];
  if (!all.length) return;

  const ownerCmds  = all.filter(c => c.ownerOnly);
  const publicCmds = all.filter(c => !c.ownerOnly);
  const ownerGuildId = process.env.OFFICIAL_GUILD_ID || guildId || null;

  const rest = new REST({ version: '10' }).setToken(token);
  const toBody = list => list.map(c => c.data.toJSON());

  try {
    // Test mode: register the full set (owner commands included) to the test guild.
    if (guildId) {
      const data = await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), { body: toBody(all) });
      logger.success(`Registered ${data.length} guild command(s) to ${guildId}.`);
      return;
    }

    // Production: public commands globally; owner commands only in the owner guild.
    const data = await rest.put(Routes.applicationCommands(client.user.id), { body: toBody(publicCmds) });
    logger.success(`Registered ${data.length} global command(s).`);

    if (!ownerCmds.length) return;
    if (ownerGuildId) {
      const od = await rest.put(Routes.applicationGuildCommands(client.user.id, ownerGuildId), { body: toBody(ownerCmds) });
      logger.success(`Registered ${od.length} owner command(s) to ${ownerGuildId}.`);
    } else {
      logger.warn(
        `${ownerCmds.length} owner-only command(s) were not registered as slash commands. ` +
        `Set OFFICIAL_GUILD_ID to your admin server to enable them there. ` +
        `They still work everywhere via the "${prefix}" text prefix.`
      );
    }
  } catch (err) {
    logger.error('Slash command registration failed:', err);
  }
}

module.exports = deployCommands;
