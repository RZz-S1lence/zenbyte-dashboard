const { SlashCommandBuilder } = require('discord.js');
const embeds    = require('../../utils/embeds');
const LOG_TYPES = require('../../config/logTypes');

module.exports = {
  category: 'Config',
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('logs')
    .setDescription('List every available log type'),

  async execute(interaction) {
    const groups = {};
    for (const t of LOG_TYPES) (groups[t.group] = groups[t.group] || []).push(t);

    const fields = Object.entries(groups).map(([group, items]) => ({
      name: group,
      value: items.map(t => `\`${t.key}\` · ${t.desc}`).join('\n')
    }));

    await interaction.reply({
      embeds: [embeds.custom({
        title: '📋 Available Log Types',
        color: embeds.COLORS.brand,
        fields,
        footer: { text: 'Use /setlogchannel <type> <channel> to assign one.' }
      })],
      ephemeral: true
    });
  }
};
