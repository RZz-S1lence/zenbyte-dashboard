// ── Tier definitions & Lemon Squeezy product mapping ──
// Base server-slot count per tier. Lifetime adds any purchased extra_slots on top.
const TIER_SLOTS = {
  pro:           1,
  max:           3,
  lifetime:      1,
  complimentary: 1   // owner-granted; the actual slot count is chosen per grant
};

// Pricing, for reference and for upgrade messaging.
const PRICING = {
  pro:      { monthly: '€4.99', yearly: '€39.99', slots: 1 },
  max:      { monthly: '€9.99', yearly: '€79.99', slots: 3 },
  lifetime: { oneTime: '€89.99', slots: 1, extraSlot: '€24.99' }
};

// Maps a Lemon Squeezy variant id → what it grants. Fill these in from your
// Lemon Squeezy dashboard (Products → each variant has a numeric id). The
// placeholders below are read from env so you don't hardcode store ids here.
//   kind: 'subscription' sets premium_tier + expires_at from the webhook dates.
//   kind: 'lifetime'     sets lifetime = 1 (no expiry).
//   kind: 'extra_slot'   increments extra_slots by 1 per order.
const VARIANT_MAP = {
  [process.env.LS_VARIANT_PRO_MONTHLY  || '[LS_VARIANT_PRO_MONTHLY]']:  { kind: 'subscription', tier: 'pro',      slots: 1 },
  [process.env.LS_VARIANT_PRO_YEARLY   || '[LS_VARIANT_PRO_YEARLY]']:   { kind: 'subscription', tier: 'pro',      slots: 1 },
  [process.env.LS_VARIANT_MAX_MONTHLY  || '[LS_VARIANT_MAX_MONTHLY]']:  { kind: 'subscription', tier: 'max',      slots: 3 },
  [process.env.LS_VARIANT_MAX_YEARLY   || '[LS_VARIANT_MAX_YEARLY]']:   { kind: 'subscription', tier: 'max',      slots: 3 },
  [process.env.LS_VARIANT_LIFETIME     || '[LS_VARIANT_LIFETIME]']:     { kind: 'lifetime',     tier: 'lifetime', slots: 1 },
  [process.env.LS_VARIANT_EXTRA_SLOT   || '[LS_VARIANT_EXTRA_SLOT]']:   { kind: 'extra_slot' },
  // Optional throwaway test product (e.g. a €1 product). Behaves like Pro: 1 slot.
  // Leave LS_VARIANT_TEST unset in production so nothing maps to it.
  [process.env.LS_VARIANT_TEST         || '[LS_VARIANT_TEST]']:         { kind: 'subscription', tier: 'pro', slots: 1 }
};

function variantInfo(variantId) {
  return VARIANT_MAP[String(variantId)] || null;
}

module.exports = { TIER_SLOTS, PRICING, VARIANT_MAP, variantInfo };
