const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.KickMembers],
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption(o => o.setName('user').setDescription('The user to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });

    const check = canModerate(interaction.member, member, { store: client.store, action: 'kick' });
    if (!check.ok)
      return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    if (!member.kickable)
      return interaction.reply({ embeds: [embeds.error('I cannot kick this user (higher role or admin).')], ephemeral: true });

    await member.kick(`${reason}, Moderator: ${interaction.user.tag}`);
    await interaction.reply({
      embeds: [embeds.custom({
        title: '👢 Member Kicked',
        color: embeds.COLORS.warn,
        fields: [
          { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        ]
      })]
    });
  }
};
