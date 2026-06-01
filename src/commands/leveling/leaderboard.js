const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const leveling = require('../../leveling/service');

const fmt = n => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
const MEDALS = ['🥇', '🥈', '🥉'];
const TITLES = { all: 'All-Time Leaderboard', weekly: 'Weekly Leaderboard', monthly: 'Monthly Leaderboard' };

module.exports = {
  category: 'Leveling',
  cooldown: 5,
  aliases: ['lb', 'top'],
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show the XP leaderboard')
    .addStringOption(o => o.setName('scope').setDescription('Which leaderboard').setRequired(false)
      .addChoices(
        { name: 'All-Time', value: 'all' },
        { name: 'Weekly',   value: 'weekly' },
        { name: 'Monthly',  value: 'monthly' }
      )),

  async execute(interaction, client) {
    const scope = (interaction.options.getString('scope') || 'all').toLowerCase();
    const cfg = client.levels.getConfig(interaction.guildId);
    if (scope === 'weekly' && !cfg.leaderboard.weeklyEnabled)
      return interaction.reply({ embeds: [embeds.error('The weekly leaderboard is disabled.')], ephemeral: true });
    if (scope === 'monthly' && !cfg.leaderboard.monthlyEnabled)
      return interaction.reply({ embeds: [embeds.error('The monthly leaderboard is disabled.')], ephemeral: true });

    const board = leveling.leaderboard(client, interaction.guild, scope).slice(0, 10);
    if (!board.length)
      return interaction.reply({ embeds: [embeds.info('No one has earned XP yet.')], ephemeral: true });

    const lines = board.map((e, i) =>
      `${MEDALS[i] || `**${i + 1}.**`} <@${e.userId}> · **Level ${e.level}** · ${fmt(e.xp)} XP`);

    await interaction.reply({
      embeds: [embeds.custom({
        title: `🏆 ${interaction.guild.name} · ${TITLES[scope]}`,
        description: lines.join('\n'),
        color: embeds.COLORS.brand
      })],
      allowedMentions: { parse: [] }
    });
  }
};
