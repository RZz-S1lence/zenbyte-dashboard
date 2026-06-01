const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  category: 'Config',
  adminOnly: true,
  cooldown: 3,
  data: new SlashCommandBuilder()
    .setName('prefix')
    .setDescription('View or change the text command prefix for this server')
    .addStringOption(o => o.setName('new').setDescription('The new prefix (1 to 5 characters, no spaces)').setRequired(false)),

  async execute(interaction, client) {
    const current = client.store.getPrefix(interaction.guildId);
    const value = interaction.options.getString('new');

    if (!value)
      return interaction.reply({
        embeds: [embeds.info(`The current prefix is **\`${current}\`**.\nChange it with \`${current}prefix <new>\` or \`/prefix\`.`)],
        ephemeral: true
      });

    const next = value.trim();
    if (!next || /\s/.test(next) || next.length > 5)
      return interaction.reply({ embeds: [embeds.error('Pick a prefix of 1 to 5 characters with no spaces.')], ephemeral: true });

    client.store.setPrefix(interaction.guildId, next);
    return interaction.reply({ embeds: [embeds.success(`Prefix updated to **\`${next}\`**. Slash commands keep working too.`)] });
  }
};
