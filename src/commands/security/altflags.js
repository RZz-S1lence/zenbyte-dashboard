const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { LEVELS } = require('../../altdetect/service');

module.exports = {
  category: 'Security',
  cooldown: 3,
  modPermission: PermissionFlagsBits.ModerateMembers,
  data: new SlashCommandBuilder()
    .setName('altflags')
    .setDescription('List accounts flagged by alt detection')
    .addStringOption(o => o.setName('status').setDescription('Which flags to show').setRequired(false)
      .addChoices(
        { name: 'Pending review', value: 'pending' },
        { name: 'Cleared', value: 'cleared' },
        { name: 'Actioned', value: 'actioned' },
        { name: 'All', value: 'all' }
      )),

  async execute(interaction, client) {
    const status = interaction.options.getString('status') || 'pending';
    const flags = client.altdetect.listFlags(interaction.guildId, status === 'all' ? null : status).slice(0, 25);

    if (!flags.length)
      return interaction.reply({ embeds: [embeds.info(`No **${status}** flags in this server.`)], ephemeral: true });

    const lines = flags.map(f => {
      const meta = LEVELS[f.level] || LEVELS.flag;
      const when = `<t:${Math.floor((f.flaggedAt || 0) / 1000)}:R>`;
      const top = (f.signals || []).slice(0, 3).map(s => s.label).join(', ') || 'none';
      return `**${f.score}/100** · ${meta.label} · <@${f.userId}> (\`${f.tag || f.userId}\`)\n` +
             `└ ${top} · ${when}${f.status !== 'pending' ? ` · _${f.status}_` : ''}`;
    });

    await interaction.reply({
      embeds: [embeds.custom({
        title: `🔍 Alt Detection · ${status === 'all' ? 'All Flags' : status[0].toUpperCase() + status.slice(1)}`,
        description: lines.join('\n\n'),
        color: embeds.COLORS.brand,
        footer: { text: `${client.altdetect.pendingCount(interaction.guildId)} pending • use /altcheck <user> to re-run` }
      })],
      ephemeral: true
    });
  }
};
