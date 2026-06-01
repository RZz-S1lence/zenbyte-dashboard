const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const trust = require('../../trust/service');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  category: 'Trust',
  cooldown: 5,
  aliases: ['trustlb', 'trusttop'],
  data: new SlashCommandBuilder()
    .setName('trustleaderboard')
    .setDescription('Show the most trusted members'),

  async execute(interaction, client) {
    const board = trust.leaderboard(client, interaction.guild).slice(0, 10);
    if (!board.length)
      return interaction.reply({ embeds: [embeds.info('No trust data yet. Members need activity, levels or history first.')], ephemeral: true });

    const lines = board.map((e, i) =>
      `${MEDALS[i] || `**${i + 1}.**`} <@${e.userId}> · **${e.score}/100** · ${e.tier}`);

    await interaction.reply({
      embeds: [embeds.custom({
        title: `🛡️ ${interaction.guild.name} · Most Trusted Members`,
        description: lines.join('\n'),
        color: embeds.COLORS.brand
      })],
      allowedMentions: { parse: [] }
    });
  }
};
