const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { dashboard } = require('../../config');

module.exports = {
  category: 'System',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Get the link to the dashboard'),

  async execute(interaction) {
    // Prefer the configured public URL (DASHBOARD_URL); fall back to the live domain.
    const url = (dashboard.url || 'https://zenbyte-dashboard.de').replace(/\/+$/, '');
    await interaction.reply({
      embeds: [embeds.custom({
        title: "🌐 ZenByte Dashboard",
        description: `**${url}**\n\nManage log channels, the ticket system, transcripts, and view bot logs.`,
        color: embeds.COLORS.brand,
        footer: { text: 'Made by Zen • @uqjc' }
      })],
      ephemeral: true
    });
  }
};
