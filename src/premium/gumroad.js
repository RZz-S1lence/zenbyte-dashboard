// ── Gumroad License API client ──
// Gumroad's /v2/licenses/verify authenticates with the product + key themselves,
// so no access token is needed. Newer products REQUIRE the internal product_id
// (the legacy product_permalink is rejected) — but Gumroad helpfully returns the
// required product_id in the error message, so we discover it on the fly and retry.
const VERIFY_URL = 'https://api.gumroad.com/v2/licenses/verify';

async function rawVerify(params) {
  if (typeof fetch !== 'function') throw new Error('global fetch unavailable (Node 18+ required)');
  const body = new URLSearchParams({ increment_uses_count: 'false', ...params });
  const res = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON */ }
  return json || { success: false };
}

// Verify a key when we don't yet know its product_id. Sends a permalink first
// (works for older products); if Gumroad demands a product_id, extract it from
// the message and retry. Returns { resp, productId }.
async function verifyByKey(key, seedPermalink) {
  let resp = await rawVerify({ product_permalink: seedPermalink, license_key: key });
  let productId = resp?.purchase?.product_id || null;
  if (!resp.success) {
    const m = /product_id'?\s*to\s*'([^']+)'/i.exec(resp.message || '');
    if (m && m[1]) {
      productId = m[1];
      resp = await rawVerify({ product_id: productId, license_key: key });
      productId = resp?.purchase?.product_id || productId;
    }
  }
  return { resp, productId };
}

// Re-verify when the product_id is already known (used by the sweep).
function verifyById(productId, key) {
  return rawVerify({ product_id: productId, license_key: key });
}

// The short permalink (e.g. "ldefc") for a purchase, used to map it to a tier.
function permalinkOf(purchase) {
  if (!purchase) return null;
  if (purchase.permalink) return purchase.permalink;
  const m = /\/l\/([^/?#]+)/.exec(purchase.product_permalink || '');
  return m ? m[1] : null;
}

// Interprets a verify response. Returns:
//   { found:false }                            → key doesn't exist
//   { found:true, dead:true|false, purchase }  → dead = refunded/charged-back/ended/failed
function purchaseState(resp) {
  if (!resp || resp.success !== true || !resp.purchase) return { found: false };
  const p = resp.purchase;
  const bool = v => v === true || v === 'true';
  const refunded = bool(p.refunded);
  const disputed = (bool(p.disputed) || bool(p.chargebacked)) && !bool(p.dispute_won);
  const subEnded = p.subscription_ended_at && Date.parse(p.subscription_ended_at) <= Date.now();
  const subFailed = !!p.subscription_failed_at;
  return { found: true, dead: refunded || disputed || subEnded || subFailed, purchase: p };
}

module.exports = { verifyByKey, verifyById, permalinkOf, purchaseState };
