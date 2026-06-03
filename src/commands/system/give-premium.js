const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');
const { parseDuration } = require('../../utils/time');
const { getPremiumStore } = require('../../premium');

// Named presets plus anything parseDuration understands (e.g. "3d", "2w", "12h").
// "forever"/"lifetime" grants permanent premium with no expiry.
const PRESETS = {
  day:   86400000,
  week:  604800000,
  month: 2592000000,    // 30 days
  year:  31536000000    // 365 days
};
const FOREVER = ['forever', 'lifetime', 'perm', 'permanent'];

function parseGrant(input) {
  const s = String(input || '').trim().toLowerCase();
  if (!s) return null;
  if (FOREVER.includes(s)) return { lifetime: true };
  if (PRESETS[s]) return { ms: PRESETS[s] };
  const ms = parseDuration(s);
  return ms ? { ms } : null;
}

module.exports = {
  category: 'System',
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('give-premium')
    .setDescription('Grant complimentary premium to a user (owner only)')
    .addUserOption(o => o.setName('user').setDescription('User to grant premium to').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('day, week, month, year, forever — or a span like 3d / 2w').setRequired(true))
    .addIntegerOption(o => o.setName('slots').setDescription('How many server slots (default 1)').setRequired(false)),

  async execute(interaction, client) {
    const user = interaction.options.getUser('user');
    if (!user) return interaction.reply({ embeds: [embeds.error('Could not resolve that user. Pass a user mention or ID.')], ephemeral: true });

    const grant = parseGrant(interaction.options.getString('duration'));
    if (!grant) return interaction.reply({ embeds: [embeds.error('Invalid duration. Use `day`, `week`, `month`, `year`, `forever`, or a span like `3d` / `2w`.')], ephemeral: true });

    const slots = Math.min(25, Math.max(1, interaction.options.getInteger('slots') || 1));
    const store = getPremiumStore();

    const fields = {
      premium_tier:   'complimentary',
      premium_source: 'owner',
      slots,
      lifetime:   grant.lifetime ? 1 : 0,
      expires_at: grant.lifetime ? null : Date.now() + grant.ms
    };
    store.upsertUser(user.id, fields);

    const when = grant.lifetime ? '**forever** (lifetime)' : `until <t:${Math.floor(fields.expires_at / 1000)}:F> (<t:${Math.floor(fields.expires_at / 1000)}:R>)`;
    logger.warn(`Premium granted to ${user.tag} (${user.id}) by ${interaction.user.tag}: ${grant.lifetime ? 'lifetime' : fields.expires_at}, ${slots} slot(s).`);

    return interaction.reply({
      embeds: [embeds.success(
        `Granted **complimentary premium** to **${user.tag}**.\n` +
        `• Server slots: **${slots}**\n` +
        `• Active: ${when}\n\n` +
        `They can assign servers to their slots from the dashboard Premium page.`
      )],
      ephemeral: true
    });
  }
};
