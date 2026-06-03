const { COLORS } = require('../config');
const { LIMITS } = require('./limits');

// Where free users are sent to upgrade. Filled from env when available, else the
// placeholder the project uses until the Lemon Squeezy store URL is wired in.
const UPGRADE_URL = process.env.PREMIUM_URL || '[UPGRADE_URL]';

// Friendly "this is a premium feature" embed shown when a free guild hits a cap.
// Names the free limit, the premium limit and links to the upgrade page.
function upgradeEmbed(feature) {
  const l = LIMITS[feature];
  return {
    color: COLORS.warn,
    title: '✨ Premium feature',
    description:
      `You've reached the free limit of **${l.free} ${l.unit}** for ${l.label}.\n\n` +
      `**ZenByte Premium** raises this to **${l.premium} ${l.unit}**, plus higher limits across polls, ` +
      `reaction roles, leveling rewards, member counters and more.\n\n` +
      `[**Upgrade to Premium →**](${UPGRADE_URL})`,
    timestamp: new Date()
  };
}

// Convenience for command handlers: an ephemeral reply payload.
function upgradeReply(feature) {
  return { embeds: [upgradeEmbed(feature)], ephemeral: true };
}

// Convenience for dashboard routes: a 403 JSON body the frontend can show.
function upgradeError(feature) {
  const l = LIMITS[feature];
  return {
    error: `This is a premium feature. Free servers can have up to ${l.free} ${l.unit} for ${l.label}; ` +
           `Premium allows ${l.premium}.`,
    premium: true,
    feature,
    freeLimit: l.free,
    premiumLimit: l.premium,
    upgradeUrl: UPGRADE_URL
  };
}

module.exports = { UPGRADE_URL, upgradeEmbed, upgradeReply, upgradeError };
