const { PremiumStore } = require('./store');
const { LIMITS, limitFor } = require('./limits');

// Lazily-created shared store. The underlying SQLite connection is itself a
// singleton (getDb), so this just avoids re-preparing statements repeatedly.
let _store = null;
function getPremiumStore() {
  if (!_store) _store = new PremiumStore();
  return _store;
}

// Central premium check. Returns true when the guild has an active premium slot
// assigned to it (lifetime owner, or a subscription whose expiry is in the future).
// Async by contract (per the premium spec) even though the lookup is synchronous.
async function isPremium(guildId) {
  return getPremiumStore().isGuildPremium(guildId);
}

// Resolves a feature limit for a guild and tells the caller whether adding one
// more item (given `current` count) is allowed. `current` is optional — omit it
// when you only need the cap (e.g. clamping poll options).
async function checkLimit(guildId, feature, current = null) {
  const prem = await isPremium(guildId);
  const limit = limitFor(feature, prem);
  const meta = LIMITS[feature];
  return {
    isPremium: prem,
    limit,
    freeLimit: meta.free,
    premiumLimit: meta.premium,
    allowed: current === null ? true : current < limit
  };
}

module.exports = { isPremium, checkLimit, getPremiumStore, LIMITS, limitFor };
