const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { antinukeFields } = require('../../security/report');

module.exports = {
  category: 'Security',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('antinuke')
    .setDescription('Enable, disable, or view the anti-nuke system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('action').setDescription('What to do').setRequired(false)
      .addChoices(
        { name: 'status', value: 'status' },
        { name: 'on',      value: 'on' },
        { name: 'off',     value: 'off' }
      )),

  async execute(interaction, client) {
    const action = (interaction.options.getString('action') || 'status').toLowerCase();
    const config = client.store.getSecurityConfig(interaction.guildId);

    if (action === 'on' || action === 'off') {
      config.enabled = action === 'on';
      client.store.saveSecurity();
    }

    await interaction.reply({
      embeds: [embeds.custom({
        title: '🛡️ Anti-Nuke',
        description: action === 'on' ? '✅ Anti-nuke is now **enabled**.'
          : action === 'off' ? '🔴 Anti-nuke is now **disabled**.'
          : 'Configure detailed limits and whitelists on the dashboard.',
        color: config.enabled ? embeds.COLORS.success : embeds.COLORS.error,
        fields: antinukeFields(config)
      })],
      ephemeral: true
    });
  }
};
