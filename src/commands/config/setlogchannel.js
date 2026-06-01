const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds   = require('../../utils/embeds');
const LOG_TYPES = require('../../config/logTypes');

module.exports = {
  category: 'Config',
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('setlogchannel')
    .setDescription('Assign a channel to a specific log type')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('type').setDescription('The log type').setRequired(true).setAutocomplete(true))
    .addChannelOption(o => o.setName('channel').setDescription('Target channel (omit to disable this log)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async autocomplete(interaction) {
    const focused = interaction.options.getFocused().toLowerCase();
    const choices = LOG_TYPES
      .filter(t => t.key.includes(focused) || t.label.toLowerCase().includes(focused))
      .slice(0, 25)
      .map(t => ({ name: `${t.label} (${t.key})`, value: t.key }));
    await interaction.respond(choices);
  },

  async execute(interaction, client) {
    const type    = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');

    if (!LOG_TYPES.some(t => t.key === type))
      return interaction.reply({ embeds: [embeds.error(`Invalid log type \`${type}\`. Use the autocomplete suggestions or \`/logs\`.`)], ephemeral: true });

    const { logChannels } = client.store;
    const config = logChannels.get(interaction.guildId) || {};

    if (channel) config[type] = channel.id;
    else delete config[type];

    logChannels.set(interaction.guildId, config);
    client.store.saveLogChannels();

    await interaction.reply({
      embeds: [embeds.success(channel
        ? `\`${type}\` logs will now be sent to ${channel}.`
        : `\`${type}\` logging has been disabled.`)]
    });
  }
};
