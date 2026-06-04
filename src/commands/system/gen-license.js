const { SlashCommandBuilder } = require('discord.js');
const crypto = require('crypto');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { getPremiumStore } = require('../../premium');

// type → what the redeemed key grants (mirrors the Gumroad product kinds).
const TYPE_MAP = {
  pro:        { kind: 'subscription', tier: 'pro',      label: 'Pro' },
  max:        { kind: 'subscription', tier: 'max',      label: 'Max' },
  lifetime:   { kind: 'lifetime',     tier: 'lifetime', label: 'Lifetime' },
  extra_slot: { kind: 'extra_slot',   tier: null,       label: 'Extra Slot' }
};

const group = () => crypto.randomBytes(3).toString('hex').toUpperCase();   // 6 hex chars
const newKey = () => `ZB-${group()}-${group()}-${group()}-${group()}`;     // ZB-XXXXXX-XXXXXX-XXXXXX-XXXXXX

module.exports = {
  category: 'System',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('gen-license')
    .setDescription('Generate local ZenByte Premium license key(s) (owner only)')
    .addStringOption(o => o.setName('type').setDescription('What the key grants').setRequired(true)
      .addChoices(
        { name: 'Pro',        value: 'pro' },
        { name: 'Max',        value: 'max' },
        { name: 'Lifetime',   value: 'lifetime' },
        { name: 'Extra Slot', value: 'extra_slot' }
      ))
    .addIntegerOption(o => o.setName('amount').setDescription('How many keys to generate (default 1)').setMinValue(1).setMaxValue(10).setRequired(false)),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const spec = TYPE_MAP[type];
    if (!spec) return interaction.reply({ embeds: [embeds.error('Unknown license type.')], ephemeral: true });

    const amount = Math.min(10, Math.max(1, interaction.options.getInteger('amount') || 1));
    const store = getPremiumStore();

    const keys = [];
    for (let i = 0; i < amount; i++) {
      let key = newKey();
      while (store.getIssuedKey(key)) key = newKey();   // avoid the (astronomically unlikely) collision
      store.createIssuedKey({ license_key: key, kind: spec.kind, tier: spec.tier, created_by: interaction.user.id });
      keys.push(key);
    }

    logger.warn(`${interaction.user.tag} generated ${amount} local ${spec.label} license key(s).`);

    const note = spec.kind === 'subscription'
      ? '\n\n_Note: locally-issued Pro/Max keys grant the tier for ~35 days (no auto-renewal)._'
      : (spec.kind === 'extra_slot'
        ? '\n\n_Extra-slot keys only apply to an account that already has active Lifetime._'
        : '');

    return interaction.reply({
      embeds: [embeds.custom({
        title: `Generated ${amount} ${spec.label} key${amount > 1 ? 's' : ''}`,
        color: embeds.COLORS.brand,
        description:
          '```\n' + keys.join('\n') + '\n```' +
          `\nRedeem with **/activate-premium** in the activation channel.${note}`
      })],
      ephemeral: true
    });
  }
};
