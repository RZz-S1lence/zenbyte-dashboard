const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');
const { formatDuration } = require('../../utils/time');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set channel slowmode (0 to disable)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds between messages (0–21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('channel').setDescription('Channel (default: current)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction) {
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.setRateLimitPerUser(seconds, `Slowmode by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [embeds.success(seconds === 0
        ? `Slowmode disabled in ${channel}.`
        : `Slowmode set to **${formatDuration(seconds * 1000)}** in ${channel}.`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('I could not set slowmode on that channel.')], ephemeral: true });
    }
  }
};
