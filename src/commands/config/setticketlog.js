const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('setticketlog')
    .setDescription('Set the channel where ticket transcripts are posted')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption(o => o.setName('channel').setDescription('Transcript log channel')
      .addChannelTypes(ChannelType.GuildText).setRequired(true)),

  async execute(interaction, client) {
    const channel = interaction.options.getChannel('channel');
    const config = client.store.tickets.get(interaction.guildId) || {};
    config.logChannelId = channel.id;
    client.store.tickets.set(interaction.guildId, config);
    client.store.saveTickets();
    await interaction.reply({ embeds: [embeds.success(`Ticket transcripts will be sent to ${channel}.`)] });
  }
};
