const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');
const { findMuteRole } = require('../../utils/muteRole');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('unmute')
    .setDescription('Unmute a member so they can type again')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to unmute').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });

    const check = canModerate(interaction.member, member, { store: client.store, action: 'unmute' });
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });

    const role = findMuteRole(interaction.guild, client.store);
    if (!role)
      return interaction.reply({ embeds: [embeds.error('There is no **Muted** role in this server.')], ephemeral: true });
    if (!member.roles.cache.has(role.id))
      return interaction.reply({ embeds: [embeds.error(`**${member.user.tag}** is not muted.`)], ephemeral: true });

    const me = interaction.guild.members.me;
    if (role.position >= me.roles.highest.position)
      return interaction.reply({ embeds: [embeds.error('The **Muted** role is above my highest role, so I cannot remove it.')], ephemeral: true });

    try {
      await member.roles.remove(role, `Unmuted by ${interaction.user.tag}: ${reason}`);
      await interaction.reply({ embeds: [embeds.success(`🔊 Unmuted **${member.user.tag}**.`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to unmute that member. Check my role position and permissions.')], ephemeral: true });
    }
  }
};
