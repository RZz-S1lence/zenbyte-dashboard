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
      setExpiry:   q('UPDATE premium_users SET expires_at=@expires_at, premium_tier=@premium_tier, updated_at=@updated_at WHERE user_id=@user_id'),
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
                         LIMIT 1`)
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

  // Let a subscription lapse by setting its expiry (does not delete the row, so
  // re-subscribing keeps history and assigned servers).
  expireUser(userId, expiresAt = Date.now()) {
    const u = this.getUser(userId);
    if (!u) return null;
    this.s.setExpiry.run({ user_id: String(userId), expires_at: expiresAt, premium_tier: u.premium_tier, updated_at: Date.now() });
    return this.getUser(userId);
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
}

module.exports = { PremiumStore };
