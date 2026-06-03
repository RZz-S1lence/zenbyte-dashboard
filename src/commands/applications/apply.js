const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const service = require('../../applications/service');

module.exports = {
  category: 'Applications',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('apply')
    .setDescription('Apply for a role or position in this server'),

  async execute(interaction, client) {
    if (!interaction.inGuild())
      return interaction.reply({ embeds: [embeds.error('This command can only be used in a server.')], ephemeral: true });

    const config = client.applications.getConfig(interaction.guildId);
    const forms  = client.applications.listForms(interaction.guildId);
    const picker = service.buildPicker(forms, config.panel);
    if (!picker)
      return interaction.reply({ embeds: [embeds.error('There are no applications open right now.')], ephemeral: true });

    return interaction.reply({
      embeds: [service.buildPanelEmbed(config.panel)],
      components: picker.components,
      ephemeral: true
    });
  }
};
