const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  category: 'System',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Fully shut down the bot (owner only)'),

  async execute(interaction, client) {
    await interaction.reply({ embeds: [embeds.info('⛔ **Shutting down. Goodbye!**')] });
    client.levels.flush(); client.activity.flush(); client.altdetect.flush(); client.polls.flush(); client.social.flush();
    await new Promise(r => setTimeout(r, 500));
    logger.warn(`Shutdown triggered by ${interaction.user.tag}.`);
    process.exit(0);
  }
};
