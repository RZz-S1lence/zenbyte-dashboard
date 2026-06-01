const { SlashCommandBuilder, PermissionFlagsBits, AuditLogEvent } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Moderation',
  cooldown: 5,
  modPermission: PermissionFlagsBits.BanMembers,
  data: new SlashCommandBuilder()
    .setName('baninfo')
    .setDescription('View the audit-log ban record for a user')
    .addUserOption(o => o.setName('user').setDescription('The banned user').setRequired(true)),

  async execute(interaction) {
    const user = interaction.options.getUser('user');
    await interaction.deferReply({ ephemeral: true });

    const logs = await interaction.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 50 });
    const entry = logs.entries.find(e => e.target?.id === user.id);

    if (!entry)
      return interaction.editReply({ embeds: [embeds.error('No ban record found for that user. Audit logs may take a few seconds to update.')] });

    await interaction.editReply({
      embeds: [embeds.custom({
        title: 'Ban Information',
        color: embeds.COLORS.error,
        fields: [
          { name: 'User', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Moderator', value: entry.executor ? `${entry.executor.tag} (<@${entry.executor.id}>)` : 'Unknown', inline: true },
          { name: 'Date', value: `<t:${Math.floor(entry.createdTimestamp / 1000)}:f>`, inline: true },
          { name: 'Reason', value: entry.reason || 'No reason provided' }
        ]
      })]
    });
  }
};
