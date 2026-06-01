const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { canModerate } = require('../../utils/moderation');

module.exports = {
  category: 'Moderation',
  cooldown: 2,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addUserOption(o => o.setName('user').setDescription('The user to warn').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the warning').setRequired(false)),

  async execute(interaction, client) {
    const user   = interaction.options.getUser('user');
    const member = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') || 'No reason provided';

    if (user.id === interaction.user.id)
      return interaction.reply({ embeds: [embeds.error('You cannot warn yourself.')], ephemeral: true });

    if (member) {
      const check = canModerate(interaction.member, member, {
        store: client.store, action: 'warn', protectedOnly: true
      });
      if (!check.ok)
        return interaction.reply({ embeds: [embeds.error(check.reason)], ephemeral: true });
    }

    const { warnings } = client.store;
    if (!warnings.has(interaction.guildId)) warnings.set(interaction.guildId, new Map());
    const guildWarnings = warnings.get(interaction.guildId);
    if (!guildWarnings.has(user.id)) guildWarnings.set(user.id, []);

    const userWarnings = guildWarnings.get(user.id);
    userWarnings.push({ moderator: interaction.user.tag, moderatorId: interaction.user.id, reason, timestamp: Date.now() });
    client.store.saveWarnings();

    await interaction.reply({
      embeds: [embeds.custom({
        title: '⚠️ Member Warned',
        color: embeds.COLORS.warn,
        fields: [
          { name: 'User', value: `${user.tag} (\`${user.id}\`)`, inline: true },
          { name: 'Moderator', value: interaction.user.tag, inline: true },
          { name: 'Total Warnings', value: String(userWarnings.length), inline: true },
          { name: 'Reason', value: reason }
        ]
      })]
    });
  }
};
