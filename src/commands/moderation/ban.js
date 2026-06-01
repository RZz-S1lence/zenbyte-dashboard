const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption(o => o.setName('user').setDescription('The user to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });

    const check = canModerate(interaction.member, member, { store: client.store, action: 'ban' });
    if (!check.ok)
      return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    if (!member.bannable)
      return interaction.reply({ embeds: [embeds.error('I cannot ban this user (higher role or admin).')], ephemeral: true });

    await member.ban({ reason: `${reason}, Moderator: ${interaction.user.tag}` });
    await interaction.reply({
      embeds: [embeds.custom({
        title: '🔨 Member Banned',
        color: embeds.COLORS.error,
        fields: [
          { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        ]
      })]
    });
  }
};
