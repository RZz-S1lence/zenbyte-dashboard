const { getDb } = require('../database/db');
const { TIER_SLOTS } = require('./tiers');

// SQLite-backed premium store. Synchronous (better-sqlite3), like the rest of
// the bot. Holds premium accounts (premium_users) and the guilds each account
// has activated with its slots (premium_servers).
class PremiumStore {
  constructor() {
    this.db = getDb();
    const q = sql => this.db.prepare(sql);
    this.s = {
      getUser:     q('SELECT * FROM premium_users WHERE user_id = ?'),
      getBySub:    q('SELECT * FROM premium_users WHERE subscription_id = ?'),
      upsert:      q(`INSERT INTO premium_users
                        (user_id, premium_tier, premium_source, subscription_id, customer_id, expires_at, lifetime, extra_slots, slots, updated_at)
                      VALUES (@user_id, @premium_tier, @premium_source, @subscription_id, @customer_id, @expires_at, @lifetime, @extra_slots, @slots, @updated_at)
                      ON CONFLICT(user_id) DO UPDATE SET
                        premium_tier=@premium_tier, premium_source=@premium_source, subscription_id=@subscription_id,
                        customer_id=@customer_id, expires_at=@expires_at, lifetime=@lifetime,
                        extra_slots=@extra_slots, slots=@slots, updated_at=@updated_at`),
      setExpiry:   q('UPDATE premium_users SET expires_at=@expires_at, premium_tier=@premium_tier, lifetime=0, updated_at=@updated_at WHERE user_id=@user_id'),
      deleteUser:  q('DELETE FROM premium_users WHERE user_id = ?'),

      listServers: q('SELECT guild_id, assigned_at FROM premium_servers WHERE user_id = ? ORDER BY assigned_at ASC'),
      countServers:q('SELECT COUNT(*) AS n FROM premium_servers WHERE user_id = ?'),
      getServer:   q('SELECT * FROM premium_servers WHERE guild_id = ?'),
      assign:      q('INSERT INTO premium_servers (user_id, guild_id, assigned_at) VALUES (?, ?, ?)'),
      unassign:    q('DELETE FROM premium_servers WHERE user_id = ? AND guild_id = ?'),
      // Active premium covering a guild: lifetime, or an unexpired subscription.
      activeForGuild: q(`SELECT u.* FROM premium_servers ps
                         JOIN premium_users u ON u.user_id = ps.user_id
                         WHERE ps.guild_id = ? AND (u.lifetime = 1 OR (u.expires_at IS NOT NULL AND u.expires_at > ?))
                         LIMIT 1`),

      // ── License keys (Lemon Squeezy) ──
      getLicense:   q('SELECT * FROM premium_licenses WHERE license_key = ?'),
      licByUser:    q('SELECT * FROM premium_licenses WHERE user_id = ? ORDER BY activated_at ASC'),
      allLicenses:  q('SELECT * FROM premium_licenses'),
      upsertLicense:q(`INSERT INTO premium_licenses
                         (license_key, user_id, instance_id, variant_id, kind, tier, status, activated_at, last_check)
                       VALUES (@license_key, @user_id, @instance_id, @variant_id, @kind, @tier, @status, @activated_at, @last_check)
                       ON CONFLICT(license_key) DO UPDATE SET
                         user_id=@user_id, instance_id=@instance_id, variant_id=@variant_id, kind=@kind,
                         tier=@tier, status=@status, last_check=@last_check`),
      setLicStatus: q('UPDATE premium_licenses SET status=@status, last_check=@last_check WHERE license_key=@license_key'),
      deleteLicense:q('DELETE FROM premium_licenses WHERE license_key = ?'),

      // ── Owner-minted local keys ──
      getIssued:    q('SELECT * FROM issued_keys WHERE license_key = ?'),
      createIssued: q('INSERT INTO issued_keys (license_key, kind, tier, created_at, created_by) VALUES (@license_key, @kind, @tier, @created_at, @created_by)'),
      redeemIssued: q('UPDATE issued_keys SET redeemed_by=@redeemed_by, redeemed_at=@redeemed_at WHERE license_key=@license_key')
    };
  }

  getUser(userId) { return this.s.getUser.get(String(userId)) || null; }
  getUserBySubscription(subId) { return subId ? (this.s.getBySub.get(String(subId)) || null) : null; }

  // True when the user's premium is currently active (lifetime or not yet expired).
  isUserActive(user) {
    if (!user) return false;
    if (user.lifetime) return true;
    return !!(user.expires_at && user.expires_at > Date.now());
  }

  // How many guilds this user may activate in total.
  slotCapacity(user) {
    if (!user) return 0;
    const base = Number.isFinite(user.slots) ? user.slots : (TIER_SLOTS[user.premium_tier] || 0);
    return Math.max(0, base + (user.extra_slots || 0));
  }

  listServers(userId) { return this.s.listServers.all(String(userId)); }
  serverCount(userId) { return this.s.countServers.get(String(userId)).n; }
  guildOwner(guildId) { return this.s.getServer.get(String(guildId)) || null; }

  // Core helper used by isPremium(): is this guild covered by an active slot?
  isGuildPremium(guildId) {
    if (!guildId) return false;
    return !!this.s.activeForGuild.get(String(guildId), Date.now());
  }

  // Create/replace a premium account from a webhook event or owner grant.
  upsertUser(userId, fields = {}) {
    const existing = this.getUser(userId) || {};
    const row = {
      user_id:         String(userId),
      premium_tier:    fields.premium_tier    ?? existing.premium_tier    ?? null,
      premium_source:  fields.premium_source  ?? existing.premium_source  ?? null,
      subscription_id: fields.subscription_id ?? existing.subscription_id ?? null,
      customer_id:     fields.customer_id     ?? existing.customer_id     ?? null,
      expires_at:      fields.expires_at !== undefined ? fields.expires_at : (existing.expires_at ?? null),
      lifetime:        (fields.lifetime !== undefined ? fields.lifetime : existing.lifetime) ? 1 : 0,
      extra_slots:     fields.extra_slots !== undefined ? fields.extra_slots : (existing.extra_slots || 0),
      slots:           fields.slots !== undefined ? fields.slots : (existing.slots ?? 1),
      updated_at:      Date.now()
    };
    this.s.upsert.run(row);
    return this.getUser(userId);
  }

  // Add one extra permanent slot (lifetime extra-slot purchase).
  addExtraSlot(userId, n = 1) {
    const u = this.getUser(userId);
    return this.upsertUser(userId, { extra_slots: (u?.extra_slots || 0) + n });
  }

  // Deactivate an account by expiring it now and clearing the lifetime flag, so
  // both subscriptions and lifetime grants become inactive. Keeps the row (and any
  // assigned servers) so a later re-subscribe/re-grant restores history.
  expireUser(userId, expiresAt = Date.now()) {
    const u = this.getUser(userId);
    if (!u) return null;
    this.s.setExpiry.run({ user_id: String(userId), expires_at: expiresAt, premium_tier: u.premium_tier, updated_at: Date.now() });
    return this.getUser(userId);
  }

  // Owner override: fully revoke a user's premium regardless of source. Marks all
  // their licenses 'revoked' (so the sweep can't revive them and they can't be
  // re-activated) and deactivates the account, including lifetime.
  revokeUser(userId) {
    for (const l of this.getLicensesByUser(userId)) this.setLicenseStatus(l.license_key, 'revoked');
    return this.expireUser(userId, Date.now());
  }

  removeUser(userId) { this.s.deleteUser.run(String(userId)); }

  // Assign a guild to one of the user's slots. Returns { ok } or { error }.
  assignServer(userId, guildId) {
    const u = this.getUser(userId);
    if (!this.isUserActive(u)) return { error: 'no-active-premium' };
    const owner = this.guildOwner(guildId);
    if (owner) return owner.user_id === String(userId) ? { ok: true, already: true } : { error: 'guild-taken' };
    if (this.serverCount(userId) >= this.slotCapacity(u)) return { error: 'no-slots-free' };
    this.s.assign.run(String(userId), String(guildId), Date.now());
    return { ok: true };
  }

  unassignServer(userId, guildId) {
    return this.s.unassign.run(String(userId), String(guildId)).changes > 0;
  }

  // ── License keys ──
  getLicense(key) { return key ? (this.s.getLicense.get(String(key)) || null) : null; }
  getLicensesByUser(userId) { return this.s.licByUser.all(String(userId)); }
  listLicenses() { return this.s.allLicenses.all(); }

  upsertLicense(fields) {
    this.s.upsertLicense.run({
      license_key:  String(fields.license_key),
      user_id:      String(fields.user_id),
      instance_id:  fields.instance_id ?? null,
      variant_id:   fields.variant_id != null ? String(fields.variant_id) : null,
      kind:         fields.kind ?? null,
      tier:         fields.tier ?? null,
      status:       fields.status ?? 'active',
      activated_at: fields.activated_at ?? Date.now(),
      last_check:   fields.last_check ?? Date.now()
    });
    return this.getLicense(fields.license_key);
  }

  setLicenseStatus(key, status, lastCheck = Date.now()) {
    this.s.setLicStatus.run({ license_key: String(key), status, last_check: lastCheck });
  }

  removeLicense(key) { this.s.deleteLicense.run(String(key)); }

  // ── Owner-minted local keys ──
  getIssuedKey(key) { return key ? (this.s.getIssued.get(String(key)) || null) : null; }
  createIssuedKey({ license_key, kind, tier, created_by }) {
    this.s.createIssued.run({
      license_key: String(license_key), kind, tier: tier ?? null,
      created_at: Date.now(), created_by: created_by ? String(created_by) : null
    });
    return this.getIssuedKey(license_key);
  }
  redeemIssuedKey(key, userId) {
    this.s.redeemIssued.run({ license_key: String(key), redeemed_by: String(userId), redeemed_at: Date.now() });
  }

  // Rebuild a user's premium_users row from their currently-active licenses. Owner
  // grants (premium_source 'owner') are left untouched — only LS-derived premium is
  // recomputed here. A lifetime license wins; otherwise the best active subscription
  // sets the tier; extra-slot licenses add permanent slots on top.
  recomputeFromLicenses(userId) {
    const SUB_WINDOW = 35 * 24 * 60 * 60 * 1000; // rolling safety net, refreshed each sweep
    const active = this.getLicensesByUser(userId).filter(l => l.status === 'active');
    const existing = this.getUser(userId);

    const extraSlots = active.filter(l => l.kind === 'extra_slot').length;
    const lifetime   = active.find(l => l.kind === 'lifetime');
    const subs       = active.filter(l => l.kind === 'subscription');

    if (lifetime) {
      return this.upsertUser(userId, {
        premium_tier: 'lifetime', premium_source: 'gumroad',
        slots: TIER_SLOTS.lifetime, lifetime: 1, expires_at: null, extra_slots: extraSlots
      });
    }
    if (subs.length) {
      const best = subs.find(l => l.tier === 'max') || subs[0];
      // Extra slots are a Lifetime-only add-on, so subscriptions never gain them.
      return this.upsertUser(userId, {
        premium_tier: best.tier, premium_source: 'gumroad',
        slots: TIER_SLOTS[best.tier] || 1, lifetime: 0,
        expires_at: Date.now() + SUB_WINDOW, extra_slots: 0
      });
    }

    // No active base license. If the user's premium came from LS, lapse it now.
    // Extra-slot-only holders keep their (currently unusable) slots recorded.
    if (existing && existing.premium_source === 'gumroad') {
      this.upsertUser(userId, { extra_slots: extraSlots });
      return this.expireUser(userId, Date.now());
    }
    return existing;
  }
}

module.exports = { PremiumStore };
