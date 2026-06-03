const express = require('express');
const crypto  = require('crypto');
const logger  = require('../../utils/logger');
const { getPremiumStore } = require('../../premium');
const { variantInfo } = require('../../premium/tiers');

// Lemon Squeezy signing secret (Settings → Webhooks → Signing secret).
const SIGNING_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || '[LEMONSQUEEZY_WEBHOOK_SECRET]';

// Timing-safe compare of the X-Signature header against an HMAC-SHA256 of the
// raw request body. `raw` must be the unparsed Buffer (see registration below).
function verifySignature(raw, signature) {
  if (!signature) return false;
  const digest = crypto.createHmac('sha256', SIGNING_SECRET).update(raw).digest('hex');
  const a = Buffer.from(digest, 'utf8');
  const b = Buffer.from(String(signature), 'utf8');
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const toMs = iso => { const t = Date.parse(iso); return Number.isFinite(t) ? t : null; };

// Pulls the Discord user id from checkout custom data. At checkout you must pass
// checkout[custom][discord_user_id], which arrives here as meta.custom_data.
function discordUserId(payload) {
  const c = payload?.meta?.custom_data || {};
  const id = c.discord_user_id || c.discordUserId || c.discord_id;
  return /^\d{16,20}$/.test(String(id || '')) ? String(id) : null;
}

function handle(payload) {
  const store = getPremiumStore();
  const event = payload?.meta?.event_name;
  const attr  = payload?.data?.attributes || {};
  const userId = discordUserId(payload);
  const subscriptionId = payload?.data?.id ? String(payload.data.id) : null;

  // For cancel/expire events, LS may not echo custom_data — fall back to the
  // subscription id we stored when the subscription was created.
  const resolveUser = () => userId || store.getUserBySubscription(subscriptionId)?.user_id || null;

  switch (event) {
    case 'subscription_created':
    case 'subscription_updated': {
      const uid = resolveUser();
      if (!uid) { logger.warn(`LS ${event}: no Discord user id, skipping.`); return; }
      const info = variantInfo(attr.variant_id);
      const status = attr.status; // active, cancelled, expired, past_due, unpaid, on_trial
      const lapsed = ['expired', 'unpaid'].includes(status);
      // ends_at is set once cancelled (access until period end); else renews_at.
      const expires = toMs(attr.ends_at) || toMs(attr.renews_at);
      store.upsertUser(uid, {
        premium_tier:    info?.tier || 'pro',
        premium_source:  'lemonsqueezy',
        subscription_id: subscriptionId,
        customer_id:     attr.customer_id ? String(attr.customer_id) : undefined,
        slots:           info?.slots ?? 1,
        lifetime:        0,
        expires_at:      lapsed ? Date.now() : (expires || Date.now())
      });
      logger.info(`LS ${event}: user=${uid} tier=${info?.tier || 'pro'} status=${status}`);
      return;
    }

    case 'subscription_cancelled':
    case 'subscription_expired':
    case 'subscription_payment_failed': {
      const uid = resolveUser();
      if (!uid) { logger.warn(`LS ${event}: could not resolve user, skipping.`); return; }
      // Let access run to the period end if known, else lapse now.
      const until = toMs(attr.ends_at) || (event === 'subscription_cancelled' ? toMs(attr.renews_at) : null) || Date.now();
      store.expireUser(uid, until);
      logger.info(`LS ${event}: user=${uid} lapses at ${new Date(until).toISOString()}`);
      return;
    }

    case 'order_created': {
      const uid = resolveUser();
      if (!uid) { logger.warn('LS order_created: no Discord user id, skipping.'); return; }
      const item = attr.first_order_item || {};
      const info = variantInfo(item.variant_id);
      if (info?.kind === 'lifetime') {
        store.upsertUser(uid, {
          premium_tier: 'lifetime', premium_source: 'lemonsqueezy',
          customer_id: attr.customer_id ? String(attr.customer_id) : undefined,
          slots: info.slots ?? 1, lifetime: 1, expires_at: null
        });
        logger.info(`LS order_created: lifetime granted to user=${uid}`);
      } else if (info?.kind === 'extra_slot') {
        store.addExtraSlot(uid, 1);
        logger.info(`LS order_created: +1 extra slot for user=${uid}`);
      } else {
        logger.warn(`LS order_created: unmapped variant ${item.variant_id}, ignoring.`);
      }
      return;
    }

    default:
      logger.debug(`LS webhook: unhandled event ${event}`);
  }
}

// Registers the webhook route. MUST be called before app.use(express.json()) so
// the raw body is available for signature verification.
function registerLemonSqueezyWebhook(app) {
  app.post('/webhooks/lemonsqueezy', express.raw({ type: '*/*' }), (req, res) => {
    if (!verifySignature(req.body, req.get('X-Signature'))) {
      logger.warn('LS webhook: invalid signature, rejected.');
      return res.status(401).json({ error: 'Invalid signature' });
    }
    let payload;
    try { payload = JSON.parse(req.body.toString('utf8')); }
    catch { return res.status(400).json({ error: 'Invalid JSON' }); }

    try { handle(payload); }
    catch (e) { logger.error('LS webhook handler error:', e); /* still 200 so LS does not spam retries */ }

    res.json({ received: true });
  });
  logger.info('Lemon Squeezy webhook ready at POST /webhooks/lemonsqueezy');
}

module.exports = { registerLemonSqueezyWebhook };
