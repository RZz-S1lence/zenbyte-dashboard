const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const { formatDuration } = require('../../utils/time');
const muteService = require('../../mute/service');

module.exports = {
  category: 'Moderation',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('mutelist')
    .setDescription('List every muted member; pick one to see full details')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction, client) {
    const mutes = client.store.getMutes(interaction.guildId);
    const ids = Object.keys(mutes);
    if (!ids.length)
      return interaction.reply({ embeds: [embeds.info('No members are currently muted in this server.')], ephemeral: true });

    // Newest mutes first, capped at the Discord 25-option select limit.
    const entries = ids
      .map(id => ({ id, record: mutes[id] }))
      .sort((a, b) => (b.record.mutedAt || 0) - (a.record.mutedAt || 0));
    const shown = entries.slice(0, 25);

    const lines = shown.map(({ id, record }) => {
      const dur = record.durationMs ? formatDuration(record.durationMs) : 'Permanent';
      const exp = record.expiresAt ? ` · ends <t:${Math.floor(record.expiresAt / 1000)}:R>` : '';
      return `• <@${id}> — ${dur}${exp}`;
    });

    const menu = new StringSelectMenuBuilder()
      .setCustomId(`mutelist:select:${interaction.user.id}`)
      .setPlaceholder('Select a member to see full mute details')
      .addOptions(shown.map(({ id, record }) => ({
        label: (record.userTag || id).slice(0, 100),
        value: id,
        description: (record.reason || 'No reason provided').slice(0, 100)
      })));

    await interaction.reply({
      embeds: [embeds.custom({
        title: `🔇 Muted Members (${entries.length})`,
        color: embeds.COLORS.warn,
        description: lines.join('\n') + (entries.length > 25 ? `\n\n*Showing the 25 most recent.*` : '')
      })],
      components: [new ActionRowBuilder().addComponents(menu)],
      ephemeral: true
    });
  },

  // Routed for customIds beginning with "mutelist:".
  async handleComponent(interaction, client) {
    const [, , modId] = interaction.customId.split(':');
    if (interaction.user.id !== modId)
      return interaction.reply({ embeds: [embeds.error('Only the moderator who ran the command can use this menu.')], ephemeral: true });

    const userId = interaction.values[0];
    const record = client.store.getMute(interaction.guildId, userId);
    if (!record)
      return interaction.reply({ embeds: [embeds.info('That member is no longer muted.')], ephemeral: true });

    return interaction.reply({ embeds: [muteService.infoEmbed(userId, record)], ephemeral: true });
  }
};
