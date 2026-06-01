const { SlashCommandBuilder } = require('discord.js');
const rank = require('./rank');

// Alias of /rank. Shares the exact same execution logic.
module.exports = {
  category: 'Leveling',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('level')
    .setDescription('Show your level, XP and rank')
    .addUserOption(o => o.setName('user').setDescription('Member to view').setRequired(false)),
  execute: rank.execute
};
