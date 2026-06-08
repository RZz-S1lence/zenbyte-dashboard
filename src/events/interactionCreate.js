const { Events } = require('discord.js');
const cooldowns   = require('../middleware/cooldowns');
const permissions = require('../middleware/permissions');
const channelRules = require('../middleware/channelRules');
const componentRouter = require('../handlers/componentRouter');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(client, interaction) {
    if (interaction.isAutocomplete()) {
      const command = client.commands.get(interaction.commandName);
      if (!command?.autocomplete) return;
      try { await command.autocomplete(interaction, client); }
      catch (e) { logger.error(`Autocomplete for /${interaction.commandName} failed:`, e.message); }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command)
        return interaction.reply({ embeds: [embeds.error('Unknown command.')], ephemeral: true });

      if (!interaction.inGuild())
        return interaction.reply({ embeds: [embeds.error('This command can only be used in a server.')], ephemeral: true });

      if (client.store.isCommandDisabled(interaction.guildId, command.data.name))
        return interaction.reply({ embeds: [embeds.error('This command is disabled in this server.')], ephemeral: true });

      const chan = channelRules.check(client, {
        guildId: interaction.guildId, channelId: interaction.channelId,
        channel: interaction.channel, name: command.data.name
      });
      if (!chan.ok)
        return interaction.reply({ embeds: [embeds.error(chan.reason)], ephemeral: true });

      const perm = permissions.check(command, interaction);
      if (!perm.ok)
        return interaction.reply({ embeds: [embeds.error(perm.reason)], ephemeral: true });

      const cd = cooldowns.check(client, command, interaction.user.id);
      if (!cd.ok)
        return interaction.reply({ embeds: [embeds.error(`Please wait **${cd.remaining}s** before using \`/${command.data.name}\` again.`)], ephemeral: true });

      try {
        await command.execute(interaction, client);
        logger.debug(`/${interaction.commandName} used by ${interaction.user.tag}`);
      } catch (e) {
        logger.error(`/${interaction.commandName} failed:`, e);
        const payload = { embeds: [embeds.error('Something went wrong executing that command.')], ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
        else await interaction.reply(payload).catch(() => {});
      }
      return;
    }

    if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
      await componentRouter.route(interaction, client);
    }
  }
};
