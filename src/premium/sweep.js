const logger = require('../utils/logger');
const { getPremiumStore } = require('./index');
const { verifyById, purchaseState } = require('./gumroad');

// Re-verifies every stored license against Gumroad. Catches refunds, chargebacks
// and lapsed/cancelled subscriptions, and keeps active ones fresh. Network blips
// are ignored (the license is left as-is) so a flaky connection never wrongly
// strips someone's premium.
async function revalidate() {
  const store = getPremiumStore();
  const licenses = store.listLicenses();
  if (!licenses.length) return;

  const affected = new Set();
  for (const lic of licenses) {
    if (lic.status === 'revoked') continue;   // owner-revoked: never revive
    const productId = lic.variant_id;   // Gumroad product_id stored at activation (null for local keys)
    if (!productId) continue;

    let resp;
    try { resp = await verifyById(productId, lic.license_key); }
    catch { continue; }

    const s = purchaseState(resp);
    const dead = !s.found || s.dead;

    if (dead) {
      if (lic.status !== 'inactive') { store.setLicenseStatus(lic.license_key, 'inactive'); affected.add(lic.user_id); }
    } else {
      store.setLicenseStatus(lic.license_key, 'active');
      // Refresh subscriptions every pass (rolling window); revive anything that
      // had previously gone inactive.
      if (lic.kind === 'subscription' || lic.status !== 'active') affected.add(lic.user_id);
    }
  }

  for (const uid of affected) store.recomputeFromLicenses(uid);
  logger.info(`Premium license sweep: checked ${licenses.length}, updated ${affected.size} account(s).`);
}

module.exports = { revalidate };
