const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Security',
  cooldown: 2,
  modPermission: PermissionFlagsBits.ManageRoles,
  data: new SlashCommandBuilder()
    .setName('verify')
    .setDescription('Manually verify a member (override for when the captcha flow fails)')
    .addUserOption(o => o.setName('user').setDescription('Member to verify').setRequired(true)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const config = client.store.getVerificationConfig(interaction.guildId);

    if (!member)
      return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (!config.verifiedRoleId)
      return interaction.reply({ embeds: [embeds.error('No verified role is configured. Run `/verifysetup` first.')], ephemeral: true });

    const role = interaction.guild.roles.cache.get(config.verifiedRoleId);
    if (!role)
      return interaction.reply({ embeds: [embeds.error('The configured verified role no longer exists.')], ephemeral: true });

    if (member.roles.cache.has(role.id))
      return interaction.reply({ embeds: [embeds.success(`**${member.user.tag}** is already verified.`)], ephemeral: true });

    const me = interaction.guild.members.me;
    if (me && role.position >= me.roles.highest.position)
      return interaction.reply({ embeds: [embeds.error('That role is above my highest role. Move my role above it.')], ephemeral: true });

    try {
      await member.roles.add(role, `Manually verified by ${interaction.user.tag}`);
    } catch {
      return interaction.reply({ embeds: [embeds.error('I could not assign the verified role.')], ephemeral: true });
    }

    await interaction.reply({ embeds: [embeds.success(`Manually verified **${member.user.tag}**.`)] });
  }
};
