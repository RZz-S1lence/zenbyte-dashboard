const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('ticketsetup')
    .setDescription('Post the ticket panel in the current channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const config = client.store.tickets.get(interaction.guildId) || {};

    const title = config.panelTitle || '🎫 Support Tickets';
    const desc  = config.panelDescription || 'Need help? Click the button below to open a ticket!';
    const color = config.panelColor ? parseInt(config.panelColor.replace('#', ''), 16) : embeds.COLORS.brand;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket:create').setLabel('Create Ticket').setStyle(ButtonStyle.Primary).setEmoji('🎫')
    );

    const panel = await interaction.channel.send({
      embeds: [{ title, description: desc, color, footer: { text: 'One ticket per user' } }],
      components: [row]
    });

    client.store.tickets.set(interaction.guildId, {
      ...config,
      panelChannelId: interaction.channel.id,
      panelMessageId: panel.id
    });
    client.store.saveTickets();

    await interaction.reply({ embeds: [embeds.success('Ticket panel created! Configure it further on the dashboard.')], ephemeral: true });
  }
};
