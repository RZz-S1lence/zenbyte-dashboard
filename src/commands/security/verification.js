const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');
const verificationHandler = require('../../handlers/verification');
const { verificationFields } = require('../../security/report');

module.exports = {
  category: 'Security',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('verification')
    .setDescription('Enable, disable, view, or re-post the verification system')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption(o => o.setName('action').setDescription('What to do').setRequired(false)
      .addChoices(
        { name: 'status', value: 'status' },
        { name: 'on',      value: 'on' },
        { name: 'off',     value: 'off' },
        { name: 'panel',   value: 'panel' }
      ))
    .addRoleOption(o => o.setName('role').setDescription('Verified role (when turning on)').setRequired(false))
    .addChannelOption(o => o.setName('channel').setDescription('Panel channel (when turning on)')
      .addChannelTypes(ChannelType.GuildText).setRequired(false)),

  async execute(interaction, client) {
    const action  = (interaction.options.getString('action') || 'status').toLowerCase();
    const role    = interaction.options.getRole('role');
    const channel = interaction.options.getChannel('channel');
    const config  = { ...client.store.getVerificationConfig(interaction.guildId) };

    if (action === 'on') {
      if (role) config.verifiedRoleId = role.id;
      if (channel) config.channelId = channel.id;
      if (!config.verifiedRoleId || !config.channelId)
        return interaction.reply({ embeds: [embeds.error('Set a verified `role` and `channel` first (pass them here or use `/verifysetup`).')], ephemeral: true });
      config.enabled = true;
      client.store.verification.set(interaction.guildId, config);
      client.store.saveVerification();
    } else if (action === 'off') {
      config.enabled = false;
      client.store.verification.set(interaction.guildId, config);
      client.store.saveVerification();
    } else if (action === 'panel') {
      if (!config.channelId)
        return interaction.reply({ embeds: [embeds.error('No panel channel configured yet.')], ephemeral: true });
      const ch = interaction.guild.channels.cache.get(config.channelId);
      if (!ch) return interaction.reply({ embeds: [embeds.error('The configured panel channel no longer exists.')], ephemeral: true });
      await ch.send(verificationHandler.buildPanel(config)).catch(() => {});
    }

    await interaction.reply({
      embeds: [embeds.custom({
        title: '✅ Verification',
        description: action === 'on' ? 'Verification is now **enabled**.'
          : action === 'off' ? 'Verification is now **disabled**.'
          : action === 'panel' ? 'Verification panel re-posted.'
          : 'Manage full settings with `/verifysetup` or the dashboard.',
        color: config.enabled ? embeds.COLORS.success : embeds.COLORS.error,
        fields: verificationFields(config)
      })],
      ephemeral: true
    });
  }
};
