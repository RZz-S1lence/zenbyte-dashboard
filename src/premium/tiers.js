// ── Tier definitions & Gumroad product mapping ──
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

// Maps a Gumroad product (by its permalink — the slug in gumroad.com/l/<permalink>)
// to what it grants. Permalinks come from env so store ids aren't hardcoded.
//   kind: 'subscription' → premium_tier + a rolling expiry (refreshed by the sweep).
//   kind: 'lifetime'     → lifetime = 1, never expires.
//   kind: 'extra_slot'   → one extra permanent slot (Lifetime accounts only).
// Monthly vs yearly is just the variant inside a product; the permalink alone
// identifies the tier, so both variants of "Pro" map here to pro.
const GUMROAD_PRODUCTS = [
  { permalink: process.env.GUMROAD_PERMALINK_PRO,        kind: 'subscription', tier: 'pro',      slots: 1 },
  { permalink: process.env.GUMROAD_PERMALINK_MAX,        kind: 'subscription', tier: 'max',      slots: 3 },
  { permalink: process.env.GUMROAD_PERMALINK_LIFETIME,   kind: 'lifetime',     tier: 'lifetime', slots: 1 },
  { permalink: process.env.GUMROAD_PERMALINK_EXTRA_SLOT, kind: 'extra_slot' }
].filter(p => p.permalink);

function productByPermalink(permalink) {
  return GUMROAD_PRODUCTS.find(p => p.permalink === permalink) || null;
}

module.exports = { TIER_SLOTS, PRICING, GUMROAD_PRODUCTS, productByPermalink };
