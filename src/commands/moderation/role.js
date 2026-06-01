const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 2,
  permissions: [PermissionFlagsBits.ManageRoles],
  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Add or remove a role from a member')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles)
    .addSubcommand(s => s.setName('add').setDescription('Add a role to a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true)))
    .addSubcommand(s => s.setName('remove').setDescription('Remove a role from a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
      .addRoleOption(o => o.setName('role').setDescription('Role').setRequired(true))),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const member = interaction.options.getMember('user');
    const role   = interaction.options.getRole('role');
    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (!role)   return interaction.reply({ embeds: [embeds.error('Role not found.')], ephemeral: true });

    const me = interaction.guild.members.me;
    if (role.managed || role.id === interaction.guild.id)
      return interaction.reply({ embeds: [embeds.error('That role cannot be assigned manually.')], ephemeral: true });
    if (role.position >= me.roles.highest.position)
      return interaction.reply({ embeds: [embeds.error('That role is above my highest role. Move my role above it.')], ephemeral: true });
    if (role.position >= interaction.member.roles.highest.position && interaction.user.id !== interaction.guild.ownerId)
      return interaction.reply({ embeds: [embeds.error('You cannot manage a role equal to or higher than your own.')], ephemeral: true });

    try {
      if (sub === 'add') {
        if (member.roles.cache.has(role.id)) return interaction.reply({ embeds: [embeds.error(`**${member.user.tag}** already has ${role}.`)], ephemeral: true });
        await member.roles.add(role, `By ${interaction.user.tag}`);
        await interaction.reply({ embeds: [embeds.success(`Added ${role} to **${member.user.tag}**.`)] });
      } else {
        if (!member.roles.cache.has(role.id)) return interaction.reply({ embeds: [embeds.error(`**${member.user.tag}** doesn't have ${role}.`)], ephemeral: true });
        await member.roles.remove(role, `By ${interaction.user.tag}`);
        await interaction.reply({ embeds: [embeds.success(`Removed ${role} from **${member.user.tag}**.`)] });
      }
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to update the member’s roles.')], ephemeral: true });
    }
  }
};
