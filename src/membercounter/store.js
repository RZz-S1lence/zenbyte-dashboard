const crypto = require('crypto');
const { getDb } = require('../database/db');
const { sanitizeCounter } = require('./config');

const newId = () => crypto.randomBytes(6).toString('hex');

// SQLite-backed store for live member counters. Synchronous, like the rest of the bot.
class MemberCounterStore {
  constructor() {
    this.db = getDb();
    const q = sql => this.db.prepare(sql);
    this.s = {
      list:        q('SELECT * FROM member_counters WHERE guild_id = ? ORDER BY position ASC, created_at ASC'),
      get:         q('SELECT * FROM member_counters WHERE guild_id = ? AND id = ?'),
      maxPos:      q('SELECT COALESCE(MAX(position), -1) AS m FROM member_counters WHERE guild_id = ?'),
      guildIds:    q('SELECT DISTINCT guild_id FROM member_counters WHERE enabled = 1'),
      insert:      q(`INSERT INTO member_counters (id, guild_id, channel_id, type, template, role_id, enabled, position, created_at, updated_at)
                      VALUES (@id, @guild_id, @channel_id, @type, @template, @role_id, @enabled, @position, @created_at, @updated_at)`),
      update:      q(`UPDATE member_counters SET channel_id=@channel_id, type=@type, template=@template,
                      role_id=@role_id, enabled=@enabled, updated_at=@updated_at WHERE guild_id=@guild_id AND id=@id`),
      setPos:      q('UPDATE member_counters SET position=@position, updated_at=@updated_at WHERE guild_id=@guild_id AND id=@id'),
      recordEdit:  q('UPDATE member_counters SET last_value=@v, last_edit=@t WHERE id=@id'),
      delete:      q('DELETE FROM member_counters WHERE guild_id = ? AND id = ?'),
      purge:       q('DELETE FROM member_counters WHERE guild_id = ?')
    };
  }

  list(guildId) { return this.s.list.all(guildId).map(map); }
  get(guildId, id) { const r = this.s.get.get(guildId, id); return r ? map(r) : null; }

  // Guild ids that currently have at least one enabled counter (for the sweep).
  activeGuildIds() { return this.s.guildIds.all().map(r => r.guild_id); }

  create(guildId, data = {}) {
    const clean = sanitizeCounter(data);
    if (!clean) return null;
    const now = Date.now();
    const row = {
      id: newId(), guild_id: guildId,
      channel_id: clean.channelId, type: clean.type, template: clean.template,
      role_id: clean.roleId, enabled: clean.enabled ? 1 : 0,
      position: this.s.maxPos.get(guildId).m + 1, created_at: now, updated_at: now
    };
    this.s.insert.run(row);
    return this.get(guildId, row.id);
  }

  update(guildId, id, data = {}) {
    const existing = this.get(guildId, id);
    if (!existing) return null;
    // Merge over the existing row so partial updates (e.g. just toggling enabled) work.
    const clean = sanitizeCounter({ ...existing, ...data });
    if (!clean) return null;
    this.s.update.run({
      id, guild_id: guildId,
      channel_id: clean.channelId, type: clean.type, template: clean.template,
      role_id: clean.roleId, enabled: clean.enabled ? 1 : 0, updated_at: Date.now()
    });
    return this.get(guildId, id);
  }

  setEnabled(guildId, id, enabled) { return this.update(guildId, id, { enabled: !!enabled }); }

  reorder(guildId, orderedIds) {
    if (!Array.isArray(orderedIds)) return this.list(guildId);
    const now = Date.now();
    const tx = this.db.transaction(ids =>
      ids.forEach((cid, i) => this.s.setPos.run({ guild_id: guildId, id: cid, position: i, updated_at: now })));
    tx(orderedIds);
    return this.list(guildId);
  }

  recordEdit(id, value, ts) { this.s.recordEdit.run({ id, v: value, t: ts }); }

  delete(guildId, id) { return this.s.delete.run(guildId, id).changes > 0; }

  purgeGuild(guildId) { this.s.purge.run(guildId); }
}

function map(row) {
  return {
    id: row.id, guildId: row.guild_id, channelId: row.channel_id,
    type: row.type, template: row.template, roleId: row.role_id,
    enabled: !!row.enabled, position: row.position,
    lastValue: row.last_value, lastEdit: row.last_edit,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

module.exports = { MemberCounterStore };
