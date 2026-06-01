const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const embeds = require('../../utils/embeds');
const { antinukeFields, verificationFields } = require('../../security/report');

module.exports = {
  category: 'Security',
  cooldown: 3,
  adminOnly: true,
  data: new SlashCommandBuilder()
    .setName('security')
    .setDescription('Show the current anti-nuke and verification status')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction, client) {
    const antinuke     = client.store.getSecurityConfig(interaction.guildId);
    const verification = client.store.getVerificationConfig(interaction.guildId);

    await interaction.reply({
      embeds: [
        embeds.custom({
          title: '🛡️ Anti-Nuke',
          color: antinuke.enabled ? embeds.COLORS.success : embeds.COLORS.error,
          fields: antinukeFields(antinuke)
        }),
        embeds.custom({
          title: '✅ Verification',
          color: verification.enabled ? embeds.COLORS.success : embeds.COLORS.error,
          fields: verificationFields(verification)
        })
      ],
      ephemeral: true
    });
  }
};
