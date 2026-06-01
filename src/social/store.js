const path = require('path');
const { mergeConfig } = require('./config');
const { readJson: load, writeJsonAtomic } = require('../utils/persistence');

const ROOT        = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'socialconfig.json');
const STATE_FILE  = path.join(ROOT, 'socialstate.json');
const FLUSH_MS = 10000;

class SocialStore {
  constructor() {
    this.configs = new Map(Object.entries(load(CONFIG_FILE)).map(([g, c]) => [g, mergeConfig(c)]));
    // state: shared across guilds. Key "<platform>:<creatorKey>" -> { lastId, live }
    this.state = load(STATE_FILE);
    this._dirty = false;
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

  getState(key) { return this.state[key] || null; }
  setState(key, value) { this.state[key] = value; this.markDirty(); }

  markDirty() {
    this._dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => this.flush(), FLUSH_MS);
    this._timer.unref?.();
  }

  flush() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    if (!this._dirty) return;
    writeJsonAtomic(STATE_FILE, this.state);
    this._dirty = false;
  }

  purgeGuild(guildId) {
    if (this.configs.delete(guildId))
      writeJsonAtomic(CONFIG_FILE, Object.fromEntries(this.configs));
  }
}

module.exports = { SocialStore };
