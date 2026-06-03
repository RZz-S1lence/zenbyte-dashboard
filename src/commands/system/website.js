const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { dashboard } = require('../../config');

module.exports = {
  category: 'System',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('website')
    .setDescription('Get the link to the dashboard'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [embeds.custom({
        title: "🌐 ZenByte Dashboard",
        description: `**http://localhost:${dashboard.port}**\n\nManage log channels, the ticket system, transcripts, and view bot logs.`,
        color: embeds.COLORS.brand,
        footer: { text: 'The bot must be running for the dashboard to be reachable.' }
      })],
      ephemeral: true
    });
  }
};
