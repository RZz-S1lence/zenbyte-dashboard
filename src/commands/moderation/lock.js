const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so @everyone cannot send messages')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (default: current)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    const reason  = interaction.options.getString('reason') || 'No reason provided';
    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: false }, { reason });
      await interaction.reply({ embeds: [embeds.success(`🔒 Locked ${channel}: ${reason}`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('I could not lock that channel. Check my permissions.')], ephemeral: true });
    }
  }
};
