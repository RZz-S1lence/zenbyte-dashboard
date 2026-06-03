const { SlashCommandBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const service = require('../../applications/service');

module.exports = {
  category: 'Applications',
  adminOnly: true,
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('applicationpanel')
    .setDescription('Post a persistent applications panel in a channel')
    .addChannelOption(o => o.setName('channel')
      .setDescription('Channel to post the panel in (defaults to here)')
      .addChannelTypes(ChannelType.GuildText))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    if (!interaction.inGuild())
      return interaction.reply({ embeds: [embeds.error('This command can only be used in a server.')], ephemeral: true });

    const channel = interaction.options.getChannel('channel') || interaction.channel;
    if (!channel || channel.type !== ChannelType.GuildText)
      return interaction.reply({ embeds: [embeds.error('Please choose a text channel.')], ephemeral: true });

    const result = await service.publishPanel(client, interaction.guildId, channel.id);
    if (!result.ok)
      return interaction.reply({ embeds: [embeds.error(result.error)], ephemeral: true });

    return interaction.reply({ embeds: [embeds.success(`Applications panel posted in <#${result.channelId}>.`)], ephemeral: true });
  }
};
