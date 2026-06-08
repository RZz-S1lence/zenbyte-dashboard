const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');
const { parseDuration, formatDuration } = require('../../utils/time');

const MAX = 28 * 86400000;

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout (mute) a member for a duration')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption(o => o.setName('user').setDescription('Member to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('e.g. 10m, 2h, 1d (max 28d)').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(false)),

  async execute(interaction, client) {
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';
    const ms = parseDuration(interaction.options.getString('duration'));

    if (!member) return interaction.reply({ embeds: [embeds.error('That user is not a member of this server.')], ephemeral: true });
    if (!ms || ms < 1000) return interaction.reply({ embeds: [embeds.error('Invalid duration. Try `10m`, `2h`, or `1d`.')], ephemeral: true });
    if (ms > MAX) return interaction.reply({ embeds: [embeds.error('Timeout cannot exceed 28 days.')], ephemeral: true });

    const check = canModerate(interaction.member, member, { store: client.store, action: 'timeout' });
    if (!check.ok) return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });
    if (!member.moderatable) return interaction.reply({ embeds: [embeds.error('I cannot timeout this member (higher role or admin).')], ephemeral: true });

    try {
      await member.timeout(ms, `${reason}, by ${interaction.user.tag}`);
      await interaction.reply({ embeds: [embeds.custom({
        title: '🔇 Member Timed Out',
        color: embeds.COLORS.warn,
        fields: [
          { name: 'User', value: `${member.user.tag} (\`${member.id}\`)`, inline: true },
          { name: 'Duration', value: formatDuration(ms), inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Reason', value: reason }
        ]
      })] });
    } catch {
      await interaction.reply({ embeds: [embeds.error('Failed to timeout that member.')], ephemeral: true });
    }
  }
};
