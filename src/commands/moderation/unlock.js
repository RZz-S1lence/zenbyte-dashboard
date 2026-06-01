const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageChannels],
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a previously locked channel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (default: current)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') || interaction.channel;
    try {
      await channel.permissionOverwrites.edit(interaction.guild.roles.everyone, { SendMessages: null }, { reason: `Unlocked by ${interaction.user.tag}` });
      await interaction.reply({ embeds: [embeds.success(`🔓 Unlocked ${channel}.`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('I could not unlock that channel. Check my permissions.')], ephemeral: true });
    }
  }
};
