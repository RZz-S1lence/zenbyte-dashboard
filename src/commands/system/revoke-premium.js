const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { getPremiumStore } = require('../../premium');

module.exports = {
  category: 'System',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('revoke-premium')
    .setDescription('Remove a user\'s premium grant (owner only)')
    .addUserOption(o => o.setName('user').setDescription('User to revoke premium from').setRequired(true)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    if (!user) return interaction.reply({ embeds: [embeds.error('Could not resolve that user. Pass a user mention or ID.')], ephemeral: true });

    const store = getPremiumStore();
    if (!store.getUser(user.id))
      return interaction.reply({ embeds: [embeds.warn(`**${user.tag}** has no premium record.`)], ephemeral: true });

    // Fully revoke (clears lifetime + disables their licenses) rather than deleting,
    // so any assigned servers simply lapse and can be restored later if needed.
    store.revokeUser(user.id);
    logger.warn(`Premium revoked from ${user.tag} (${user.id}) by ${interaction.user.tag}.`);

    return interaction.reply({
      embeds: [embeds.success(`Revoked premium from **${user.tag}**. Their servers will fall back to the free tier.`)],
      ephemeral: true
    });
  }
};
