const { SlashCommandBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { getPremiumStore } = require('../../premium');
const { variantInfo } = require('../../premium/tiers');
const { validateLicense, activateLicense } = require('../../premium/lemonsqueezy');

// Activation is locked to the official ZenByte server and one channel. When unset,
// the guard is skipped (handy for local testing).
const OFFICIAL_GUILD_ID   = process.env.OFFICIAL_GUILD_ID   || '';
const ACTIVATE_CHANNEL_ID = process.env.ACTIVATE_CHANNEL_ID || '';

const TIER_LABEL = { pro: 'Pro', max: 'Max', lifetime: 'Lifetime', complimentary: 'Complimentary' };

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

    // 1) Validate the key with Lemon Squeezy.
    let v;
    try { v = await validateLicense(key); }
    catch (e) {
      logger.error('LS validate failed:', e.message);
      return interaction.editReply({ embeds: [embeds.error('Could not reach the license server right now. Please try again in a moment.')] });
    }

    if (!v || v.valid === false || !v.license_key)
      return interaction.editReply({ embeds: [embeds.error('That license key is invalid or could not be found. Double-check it and try again.')] });

    const status = v.license_key.status;
    if (status === 'expired')  return interaction.editReply({ embeds: [embeds.error('This license has **expired**. Renew your subscription to reactivate it.')] });
    if (status === 'disabled') return interaction.editReply({ embeds: [embeds.error('This license has been **disabled** and can no longer be used.')] });

    // 2) Make sure it's one of our products.
    const variantId = v.meta?.variant_id;
    const info = variantInfo(variantId);
    if (!info)
      return interaction.editReply({ embeds: [embeds.error('This key is not a recognized ZenByte Premium product.')] });

    // 3) Extra slots are a Lifetime-only add-on. Reject before activating (so the
    // key isn't consumed) unless the account already has an active Lifetime plan.
    if (info.kind === 'extra_slot') {
      const u = store.getUser(userId);
      if (!u || u.lifetime !== 1 || !store.isUserActive(u))
        return interaction.editReply({ embeds: [embeds.error(
          'Extra server slots can only be added to a **Lifetime** account. Activate your **Lifetime** license first, then add extra slots.'
        )] });
    }

    // 4) Ownership: if we've already recorded this key, it must belong to this user.
    const existing = store.getLicense(key);
    if (existing && existing.user_id !== userId)
      return interaction.editReply({ embeds: [embeds.error('This license key has already been activated on another account.')] });

    // 5) Activate (skip if this user already owns it — keeps re-runs idempotent).
    let instanceId = existing?.instance_id || null;
    if (!existing) {
      let a;
      try { a = await activateLicense(key, `discord:${userId}`); }
      catch (e) {
        logger.error('LS activate failed:', e.message);
        return interaction.editReply({ embeds: [embeds.error('Could not activate the license right now. Please try again in a moment.')] });
      }
      if (!a || a.activated === false)
        return interaction.editReply({ embeds: [embeds.error('This license has already been used. Each key can only be activated **once** — if this is yours and you think it\'s a mistake, contact support.')] });
      instanceId = a.instance?.id || null;
    }

    // 6) Record + recompute the account's premium state.
    store.upsertLicense({
      license_key: key, user_id: userId, instance_id: instanceId,
      variant_id: String(variantId), kind: info.kind, tier: info.tier || null,
      status: 'active', activated_at: Date.now(), last_check: Date.now()
    });
    store.recomputeFromLicenses(userId);
    logger.warn(`Premium activated by ${interaction.user.tag} (${userId}): kind=${info.kind} tier=${info.tier || '-'}`);

    // 7) Friendly confirmation.
    if (info.kind === 'extra_slot') {
      const u = store.getUser(userId);
      return interaction.editReply({ embeds: [embeds.custom({
        title: 'Extra slot added',
        color: embeds.COLORS.success,
        description:
          'Your **+1 permanent server slot** has been added to your account.\n\n' +
          `You can now activate premium on **${store.slotCapacity(u)}** servers in total. ` +
          'Assign it from the dashboard **Premium** page.'
      })] });
    }

    const u = store.getUser(userId);
    const label = TIER_LABEL[info.tier] || 'Premium';
    const slots = store.slotCapacity(u);
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
};
