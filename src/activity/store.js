const fs   = require('fs');
const path = require('path');
const logger = require('../utils/logger');
const { mergeConfig } = require('./config');
const { weekKey, monthKey } = require('../leveling/store');

const ROOT = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'activityconfig.json');
const DATA_FILE   = path.join(ROOT, 'activity.json');

const { readJson: loadJson, writeJsonAtomic: saveJson } = require('../utils/persistence');

function freshBucket(key) { return { messages: 0, voiceMinutes: 0, reactions: 0, key }; }
function freshUser() {
  return { messages: 0, voiceMinutes: 0, reactions: 0, lastSeen: 0,
           weekly: freshBucket(weekKey()), monthly: freshBucket(monthKey()) };
}

class ActivityStore {
  constructor() {
    this.configs = new Map(Object.entries(loadJson(CONFIG_FILE)).map(([g, c]) => [g, mergeConfig(c)]));
    this.data = new Map();
    for (const [gid, users] of Object.entries(loadJson(DATA_FILE)))
      this.data.set(gid, new Map(Object.entries(users)));

    this._dirty = false;
    this._timer = setInterval(() => this.flush(), 15000);
    this._timer.unref?.();
    logger.info(`Activity loaded: ${this.configs.size} config(s), ${this.data.size} guild(s) tracked.`);
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
    const wk = weekKey(), mk = monthKey();
    if (u.weekly.key !== wk) u.weekly = freshBucket(wk);
    if (u.monthly.key !== mk) u.monthly = freshBucket(mk);
    return u;
  }

  hasUser(guildId, userId) { return this.data.get(guildId)?.has(userId); }
  deleteUser(guildId, userId) { this.data.get(guildId)?.delete(userId); this.markDirty(); }
  resetGuild(guildId) { this.data.set(guildId, new Map()); this.markDirty(); }

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

module.exports = { ActivityStore };
