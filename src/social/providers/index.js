const youtube = require('./youtube');
const twitch  = require('./twitch');
const kick    = require('./kick');
const reddit  = require('./reddit');

// Order here is the order shown on the dashboard.
const PROVIDERS = [youtube, twitch, kick, reddit];
const BY_ID = Object.fromEntries(PROVIDERS.map(p => [p.id, p]));

// Lightweight metadata for the dashboard / API (no functions).
function providerMeta() {
  return PROVIDERS.map(p => ({
    id: p.id, label: p.label, kind: p.kind, emoji: p.emoji,
    needsAuth: p.needsAuth, configured: p.isConfigured(),
    example: p.example, defaultTemplate: p.defaultTemplate
  }));
}

module.exports = { PROVIDERS, BY_ID, providerMeta };
