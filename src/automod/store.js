const path = require('path');
const logger = require('../utils/logger');
const { readJson, writeJsonAtomic } = require('../utils/persistence');
const { mergeConfig } = require('./config');

const FILE = path.join(__dirname, '..', '..', 'automod.json');

// JSON-backed AutoMod config per guild. Stored configs keep premium-only fields
// (they were validated when saved); the runtime decides whether to honour them.
class AutoModStore {
  constructor() {
    this.configs = new Map(
      Object.entries(readJson(FILE)).map(([g, c]) => [g, mergeConfig(c, { isPremium: true })])
    );
    const active = [...this.configs.values()].filter(c => c.enabled).length;
    logger.info(`AutoMod loaded: ${this.configs.size} config(s), ${active} enabled.`);
  }

  get(guildId) {
    if (!this.configs.has(guildId)) this.configs.set(guildId, mergeConfig({}, { isPremium: true }));
    return this.configs.get(guildId);
  }

  // `config` must already be normalised for the guild's plan (see mergeConfig).
  set(guildId, config) {
    this.configs.set(guildId, config);
    this.save();
    return config;
  }

  save() {
    writeJsonAtomic(FILE, Object.fromEntries(this.configs));
  }

  purgeGuild(guildId) {
    if (this.configs.delete(guildId)) this.save();
  }
}

module.exports = { AutoModStore };
