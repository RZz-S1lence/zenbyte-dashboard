const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const activity = require('../../activity/service');
const { formatDuration } = require('../../utils/time');

const MEDALS = ['🥇', '🥈', '🥉'];
const TITLES = { all: 'All-Time', weekly: 'Weekly', monthly: 'Monthly' };

module.exports = {
  category: 'Activity',
  cooldown: 5,
  aliases: ['actlb', 'activitylb', 'activitytop'],
  data: new SlashCommandBuilder()
    .setName('activityleaderboard')
    .setDescription('Show the most active members')
    .addStringOption(o => o.setName('scope').setDescription('Time range').setRequired(false)
      .addChoices(
        { name: 'All-Time', value: 'all' },
        { name: 'Weekly', value: 'weekly' },
        { name: 'Monthly', value: 'monthly' }
      )),

  async execute(interaction, client) {
    const scope = (interaction.options.getString('scope') || 'all').toLowerCase();
    const cfg = client.activity.getConfig(interaction.guildId);
    if (scope === 'weekly' && !cfg.leaderboard.weeklyEnabled)
      return interaction.reply({ embeds: [embeds.error('The weekly activity leaderboard is disabled.')], ephemeral: true });
    if (scope === 'monthly' && !cfg.leaderboard.monthlyEnabled)
      return interaction.reply({ embeds: [embeds.error('The monthly activity leaderboard is disabled.')], ephemeral: true });

    const board = activity.leaderboard(client, interaction.guild, scope).slice(0, 10);
    if (!board.length)
      return interaction.reply({ embeds: [embeds.info('No activity recorded yet.')], ephemeral: true });

    const lines = board.map((e, i) =>
      `${MEDALS[i] || `**${i + 1}.**`} <@${e.userId}> · **${e.score.toLocaleString()}** pts · ${e.messages} msgs · ${formatDuration(e.voiceMinutes * 60000)}`);

    await interaction.reply({
      embeds: [embeds.custom({
        title: `📈 ${interaction.guild.name} · ${TITLES[scope]} Activity`,
        description: lines.join('\n'),
        color: embeds.COLORS.brand
      })],
      allowedMentions: { parse: [] }
    });
  }
};
