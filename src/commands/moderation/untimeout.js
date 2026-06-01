const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  aliases: ['unmute'],
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Remove a timeout from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to un-timeout').setRequired(true)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (!member.isCommunicationDisabled()) return interaction.reply({ embeds: [embeds.error('That member is not timed out.')], ephemeral: true });

    try {
      await member.timeout(null, `Timeout removed by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [embeds.success(`🔊 Removed timeout from **${member.user.tag}**.`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to remove the timeout.')], ephemeral: true });
    }
  }
};
