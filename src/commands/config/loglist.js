const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('loglist')
    .setDescription('Show which channels are assigned to each log type')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const config = client.store.logChannels.get(interaction.guildId) || {};
    const entries = Object.entries(config);

    if (!entries.length)
      return interaction.reply({ embeds: [embeds.info('No log channels are configured. Use `/setlogchannel` to add some.')], ephemeral: true });

    const description = entries.map(([type, channelId]) => {
      const channel = interaction.guild.channels.cache.get(channelId);
      return `\`${type}\` → ${channel ? channel.toString() : '*Unknown channel*'}`;
    }).join('\n');

    await interaction.reply({
      embeds: [embeds.custom({ title: '📋 Log Channel Configuration', description, color: embeds.COLORS.brand })],
      ephemeral: true
    });
  }
};
