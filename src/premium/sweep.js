const logger = require('../utils/logger');
const { getPremiumStore } = require('./index');
const { validateLicense } = require('./lemonsqueezy');

// Re-validates every stored license against Lemon Squeezy. Catches lapsed
// subscriptions and refunded/disabled orders, and refreshes the rolling expiry
// window for active subscriptions. Network blips are ignored (the license is left
// as-is) so a flaky connection never wrongly strips someone's premium.
async function revalidate() {
  const store = getPremiumStore();
  const licenses = store.listLicenses();
  if (!licenses.length) return;

  const affected = new Set();
  for (const lic of licenses) {
    let v;
    try { v = await validateLicense(lic.license_key, lic.instance_id); }
    catch { continue; }

    const status = v?.license_key?.status;
    const dead = !v || v.valid === false || status === 'expired' || status === 'disabled';

    if (dead) {
      if (lic.status !== 'inactive') { store.setLicenseStatus(lic.license_key, 'inactive'); affected.add(lic.user_id); }
    } else if (status === 'active') {
      // Always refresh subscriptions (pushes their rolling window forward); flip
      // any key that had previously gone inactive back on.
      store.setLicenseStatus(lic.license_key, 'active');
      if (lic.kind === 'subscription' || lic.status !== 'active') affected.add(lic.user_id);
    }
  }

  for (const uid of affected) store.recomputeFromLicenses(uid);
  logger.info(`Premium license sweep: checked ${licenses.length}, updated ${affected.size} account(s).`);
}

module.exports = { revalidate };
