const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { getPremiumStore } = require('../../premium');
const { GUMROAD_PRODUCTS, productByPermalink } = require('../../premium/tiers');
const { verifyByKey, permalinkOf, purchaseState } = require('../../premium/gumroad');

// Activation is locked to the official ZenByte server and one channel. When unset,
// the guard is skipped (handy for local testing).
const OFFICIAL_GUILD_ID   = process.env.OFFICIAL_GUILD_ID   || '';
const ACTIVATE_CHANNEL_ID = process.env.ACTIVATE_CHANNEL_ID || '';

const TIER_LABEL = { pro: 'Pro', max: 'Max', lifetime: 'Lifetime', complimentary: 'Complimentary' };

// True when an extra-slot key is being redeemed by an account that doesn't have
// an active Lifetime plan (extra slots are a Lifetime-only add-on).
function extraSlotBlocked(store, userId, info) {
  if (info.kind !== 'extra_slot') return false;
  const u = store.getUser(userId);
  return !u || u.lifetime !== 1 || !store.isUserActive(u);
}

// Shared success message for both local and Gumroad activations.
function successReply(interaction, store, userId, info) {
  const u = store.getUser(userId);
  const slots = store.slotCapacity(u);
  if (info.kind === 'extra_slot') {
    return interaction.editReply({ embeds: [embeds.custom({
      title: 'Extra slot added',
      color: embeds.COLORS.success,
      description:
        'Your **+1 permanent server slot** has been added to your account.\n\n' +
        `You can now activate premium on **${slots}** servers in total. ` +
        'Assign it from the dashboard **Premium** page.'
    })] });
  }
  const label = TIER_LABEL[info.tier] || 'Premium';
  return interaction.editReply({ embeds: [embeds.custom({
    title: `ZenByte ${label} activated`,
    color: embeds.COLORS.success,
    description:
      `Your account now has **ZenByte ${label}**.\n\n` +
      `• **Server slots:** ${slots} ${slots === 1 ? 'server' : 'servers'}\n` +
      (info.kind === 'lifetime' ? '• **Length:** lifetime — never expires\n' : '') +
      '\nHead to the **dashboard → Premium** page to choose which server(s) to enable premium on.'
  })] });
}

const errReply = (interaction, msg) => interaction.editReply({ embeds: [embeds.error(msg)] });

module.exports = {
  category: 'System',
  cooldown: 5,
  data: new SlashCommandBuilder()
    .setName('activate-premium')
    .setDescription('Activate a ZenByte Premium license key on your account')
    .setDMPermission(false),

  async execute(interaction) {
    if (OFFICIAL_GUILD_ID && interaction.guildId !== OFFICIAL_GUILD_ID)
      return interaction.reply({ embeds: [embeds.error('Premium can only be activated in the official **ZenByte** server.')], ephemeral: true });
    if (ACTIVATE_CHANNEL_ID && interaction.channelId !== ACTIVATE_CHANNEL_ID)
      return interaction.reply({ embeds: [embeds.error(`Please head to <#${ACTIVATE_CHANNEL_ID}> to activate your license.`)], ephemeral: true });

    const input = new TextInputBuilder()
      .setCustomId('key')
      .setLabel('License key')
      .setPlaceholder('XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX')
      .setStyle(TextInputStyle.Short)
      .setMinLength(8)
      .setMaxLength(100)
      .setRequired(true);

    const modal = new ModalBuilder()
      .setCustomId('activate-premium:modal')
      .setTitle('Activate ZenByte Premium')
      .addComponents(new ActionRowBuilder().addComponents(input));

    return interaction.showModal(modal);
  },

  async handleComponent(interaction) {
    if (!interaction.isModalSubmit() || interaction.customId !== 'activate-premium:modal') return;
    await interaction.deferReply({ ephemeral: true });

    const key = interaction.fields.getTextInputValue('key').trim();
    const userId = interaction.user.id;
    const store = getPremiumStore();
    const EXTRA_SLOT_MSG = 'Extra server slots can only be added to a **Lifetime** account. Activate your **Lifetime** license first, then add extra slots.';

    // A revoked key can never be re-activated (owner override).
    const known = store.getLicense(key);
    if (known && known.status === 'revoked')
      return errReply(interaction, 'This license has been revoked by an administrator and can no longer be used.');

    // ── A) Owner-minted local key (takes priority over Gumroad) ──
    const issued = store.getIssuedKey(key);
    if (issued) {
      const info = { kind: issued.kind, tier: issued.tier, permalink: null };
      if (issued.redeemed_by && issued.redeemed_by !== userId)
        return errReply(interaction, 'This license key has already been activated on another account.');
      if (extraSlotBlocked(store, userId, info))
        return errReply(interaction, EXTRA_SLOT_MSG);

      store.upsertLicense({
        license_key: key, user_id: userId, instance_id: 'owner', variant_id: null,
        kind: info.kind, tier: info.tier || null, status: 'active',
        activated_at: Date.now(), last_check: Date.now()
      });
      if (!issued.redeemed_by) store.redeemIssuedKey(key, userId);
      store.recomputeFromLicenses(userId);
      logger.warn(`Premium activated (local key) by ${interaction.user.tag} (${userId}): kind=${info.kind} tier=${info.tier || '-'}`);
      return successReply(interaction, store, userId, info);
    }

    // ── B) Gumroad license ──
    if (!GUMROAD_PRODUCTS.length)
      return errReply(interaction, 'Premium activation is not configured yet. Please try again later.');

    // Verify with Gumroad. verifyByKey auto-resolves the internal product_id
    // (newer Gumroad products reject the legacy permalink).
    let resp, productId;
    try { ({ resp, productId } = await verifyByKey(key, GUMROAD_PRODUCTS[0].permalink)); }
    catch (e) {
      logger.error('Gumroad verify failed:', e.message);
      return errReply(interaction, 'Could not reach the license server right now. Please try again in a moment.');
    }

    const state = purchaseState(resp);
    if (!state.found)
      return errReply(interaction, 'That license key is invalid or could not be found. Double-check it and try again.');
    if (state.dead)
      return errReply(interaction, 'This license is no longer active — it may have been refunded, charged back, or its subscription was cancelled or ended.');

    // Map the purchased product (by its permalink) → tier.
    const info = productByPermalink(permalinkOf(state.purchase));
    if (!info)
      return errReply(interaction, 'This key is not a recognized ZenByte Premium product.');
    if (extraSlotBlocked(store, userId, info))
      return errReply(interaction, EXTRA_SLOT_MSG);

    const existing = store.getLicense(key);
    if (existing && existing.user_id !== userId)
      return errReply(interaction, 'This license key has already been activated on another account.');

    store.upsertLicense({
      license_key: key, user_id: userId,
      instance_id: state.purchase?.sale_id || existing?.instance_id || null,
      variant_id: productId || existing?.variant_id || null,   // store product_id for the sweep
      kind: info.kind, tier: info.tier || null,
      status: 'active', activated_at: Date.now(), last_check: Date.now()
    });
    store.recomputeFromLicenses(userId);
    logger.warn(`Premium activated by ${interaction.user.tag} (${userId}): kind=${info.kind} tier=${info.tier || '-'} product=${productId}`);
    return successReply(interaction, store, userId, info);
  }
};
