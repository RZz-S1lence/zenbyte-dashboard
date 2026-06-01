const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  permissions: [PermissionFlagsBits.BanMembers],
  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Unban a user by ID')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption(o => o.setName('user_id').setDescription('The ID of the user to unban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction) {
    const id = interaction.options.getString('user_id').replace(/\D/g, '');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    if (!/^\d{16,20}$/.test(id))
      return interaction.reply({ embeds: [embeds.error('Provide a valid user ID.')], ephemeral: true });

    const ban = await interaction.guild.bans.fetch(id).catch(() => null);
    if (!ban) return interaction.reply({ embeds: [embeds.error('That user is not banned.')], ephemeral: true });

    try {
      await interaction.guild.bans.remove(id, `${reason}, by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [embeds.success(`Unbanned **${ban.user.tag}** (\`${id}\`).`)] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to unban that user.')], ephemeral: true });
    }
  }
};
