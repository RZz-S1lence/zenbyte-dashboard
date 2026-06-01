const path = require('path');
const { mergeConfig } = require('./config');
const { readJson: load, writeJsonAtomic } = require('../utils/persistence');

const ROOT       = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'altconfig.json');
const FLAGS_FILE  = path.join(ROOT, 'altflags.json');
const MAX_FLAGS_PER_GUILD = 250;
const FLUSH_MS = 15000;

class AltStore {
  constructor() {
    this.configs = new Map(Object.entries(load(CONFIG_FILE)).map(([g, c]) => [g, mergeConfig(c)]));

    // flags: Map<guildId, Map<userId, flag>>
    this.flags = new Map();
    for (const [gid, users] of Object.entries(load(FLAGS_FILE))) {
      this.flags.set(gid, new Map(Object.entries(users)));
    }

    this._flagsDirty = false;
    this._timer = null;
  }

  getConfig(guildId) {
    if (!this.configs.has(guildId)) this.configs.set(guildId, mergeConfig({}));
    return this.configs.get(guildId);
  }

  setConfig(guildId, config) {
    this.configs.set(guildId, mergeConfig(config));
    writeJsonAtomic(CONFIG_FILE, Object.fromEntries(this.configs));
    return this.configs.get(guildId);
  }

  getFlag(guildId, userId) {
    return this.flags.get(guildId)?.get(userId) || null;
  }

  listFlags(guildId, status) {
    const g = this.flags.get(guildId);
    if (!g) return [];
    const out = [...g.values()];
    const filtered = status ? out.filter(f => f.status === status) : out;
    return filtered.sort((a, b) => (b.flaggedAt || 0) - (a.flaggedAt || 0));
  }

  pendingCount(guildId) {
    return this.listFlags(guildId, 'pending').length;
  }

  addFlag(guildId, flag) {
    if (!this.flags.has(guildId)) this.flags.set(guildId, new Map());
    const g = this.flags.get(guildId);
    g.set(flag.userId, { status: 'pending', ...g.get(flag.userId), ...flag });

    // Bound the file size by dropping the oldest reviewed flags first.
    if (g.size > MAX_FLAGS_PER_GUILD) {
      const drop = [...g.values()]
        .filter(f => f.status !== 'pending')
        .sort((a, b) => (a.flaggedAt || 0) - (b.flaggedAt || 0));
      for (const f of drop) {
        if (g.size <= MAX_FLAGS_PER_GUILD) break;
        g.delete(f.userId);
      }
    }
    this._markDirty();
    return g.get(flag.userId);
  }

  setFlagStatus(guildId, userId, status, reviewedBy) {
    const flag = this.getFlag(guildId, userId);
    if (!flag) return null;
    flag.status = status;
    flag.reviewedBy = reviewedBy || null;
    flag.reviewedAt = Date.now();
    this._markDirty();
    return flag;
  }

  _markDirty() {
    this._flagsDirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => this.flush(), FLUSH_MS);
    this._timer.unref?.();
  }

  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (!this._flagsDirty) return;
    const data = {};
    for (const [gid, users] of this.flags) data[gid] = Object.fromEntries(users);
    writeJsonAtomic(FLAGS_FILE, data);
    this._flagsDirty = false;
  }

  purgeGuild(guildId) {
    const had = this.configs.delete(guildId) | this.flags.delete(guildId);
    if (had) {
      writeJsonAtomic(CONFIG_FILE, Object.fromEntries(this.configs));
      this._flagsDirty = true;
      this.flush();
    }
  }
}

module.exports = { AltStore };
