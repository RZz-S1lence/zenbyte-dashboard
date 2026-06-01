const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.ManageNicknames],
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription("Change or reset a member's nickname")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames)
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)').setRequired(false).setMaxLength(32)),

  async execute(interaction) {
    const member = interaction.options.getMember('user');
    const nick   = interaction.options.getString('nickname') || null;
    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (!member.manageable) return interaction.reply({ embeds: [embeds.error("I can't change that member's nickname (higher role).")], ephemeral: true });

    try {
      await member.setNickname(nick, `Changed by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [embeds.success(nick
        ? `Set **${member.user.tag}**'s nickname to **${nick}**.`
        : `Reset **${member.user.tag}**'s nickname.`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to change the nickname.')], ephemeral: true });
    }
  }
};
