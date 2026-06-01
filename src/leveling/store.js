const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { mergeConfig } = require('./config');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'levelconfig.json');
const DATA_FILE   = path.join(ROOT, 'levels.json');

const { readJson: loadJson, writeJsonAtomic: saveJson } = require('../utils/persistence');

function weekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}
function monthKey(d = new Date()) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function freshUser() {
  return { xp: 0, messages: 0, voiceMinutes: 0, reactions: 0, lastMsg: 0, lastReact: 0,
           weeklyXp: 0, weeklyKey: weekKey(), monthlyXp: 0, monthlyKey: monthKey() };
}

class LevelStore {
  constructor() {
    this.configs = new Map(Object.entries(loadJson(CONFIG_FILE)).map(([g, c]) => [g, mergeConfig(c)]));
    this.data    = new Map();
    for (const [gid, users] of Object.entries(loadJson(DATA_FILE)))
      this.data.set(gid, new Map(Object.entries(users)));

    this._dirty = false;
    this._flushTimer = setInterval(() => this.flush(), 15000);
    this._flushTimer.unref?.();
    logger.info(`Leveling loaded: ${this.configs.size} config(s), ${this.data.size} guild(s) with XP data.`);
  }

  getConfig(guildId) {
    if (!this.configs.has(guildId)) this.configs.set(guildId, mergeConfig({}));
    return this.configs.get(guildId);
  }
  setConfig(guildId, config) {
    this.configs.set(guildId, mergeConfig(config));
    saveJson(CONFIG_FILE, Object.fromEntries(this.configs));
    return this.configs.get(guildId);
  }

  guildUsers(guildId) {
    if (!this.data.has(guildId)) this.data.set(guildId, new Map());
    return this.data.get(guildId);
  }

  getUser(guildId, userId) {
    const users = this.guildUsers(guildId);
    if (!users.has(userId)) users.set(userId, freshUser());
    const u = users.get(userId);
    // Lazy-reset weekly/monthly buckets when the period rolls over.
    const wk = weekKey(), mk = monthKey();
    if (u.weeklyKey !== wk) { u.weeklyXp = 0; u.weeklyKey = wk; }
    if (u.monthlyKey !== mk) { u.monthlyXp = 0; u.monthlyKey = mk; }
    return u;
  }

  hasUser(guildId, userId) {
    return this.data.get(guildId)?.has(userId);
  }

  deleteUser(guildId, userId) {
    this.data.get(guildId)?.delete(userId);
    this.markDirty();
  }

  resetGuild(guildId) {
    this.data.set(guildId, new Map());
    this.markDirty();
  }

  markDirty() { this._dirty = true; }

  flush() {
    if (!this._dirty) return;
    const out = {};
    for (const [gid, users] of this.data) out[gid] = Object.fromEntries(users);
    saveJson(DATA_FILE, out);
    this._dirty = false;
  }

  purgeGuild(guildId) {
    if (this.configs.delete(guildId)) saveJson(CONFIG_FILE, Object.fromEntries(this.configs));
    if (this.data.delete(guildId)) { this._dirty = true; this.flush(); }
  }
}

module.exports = { LevelStore, weekKey, monthKey };
