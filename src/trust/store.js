const path = require('path');
const { mergeConfig } = require('./config');
const { readJson, writeJsonAtomic } = require('../utils/persistence');

const FILE = path.join(__dirname, '..', '..', 'trustconfig.json');

function load() { return readJson(FILE); }

class TrustStore {
  constructor() {
    this.configs = new Map(Object.entries(load()).map(([g, c]) => [g, mergeConfig(c)]));
  }
  getConfig(guildId) {
    if (!this.configs.has(guildId)) this.configs.set(guildId, mergeConfig({}));
    return this.configs.get(guildId);
  }
  setConfig(guildId, config) {
    this.configs.set(guildId, mergeConfig(config));
    writeJsonAtomic(FILE, Object.fromEntries(this.configs));
    return this.configs.get(guildId);
  }

  purgeGuild(guildId) {
    if (this.configs.delete(guildId)) writeJsonAtomic(FILE, Object.fromEntries(this.configs));
  }
}

module.exports = { TrustStore };
