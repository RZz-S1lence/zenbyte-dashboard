const path = require('path');
const logger = require('../utils/logger');
const { readJson, writeJsonAtomic } = require('../utils/persistence');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'autoroles.json');

const idList = v => (Array.isArray(v)
  ? [...new Set(v.filter(x => typeof x === 'string' && /^\d{16,20}$/.test(x)))]
  : []);

// { enabled, roleIds: string[] (humans), botRoleIds: string[] (bots) }
function normalize(stored = {}) {
  const s = stored || {};
  return {
    enabled:    typeof s.enabled === 'boolean' ? s.enabled : false,
    roleIds:    idList(s.roleIds),
    botRoleIds: idList(s.botRoleIds)
  };
}

class AutoRoleStore {
  constructor() {
    this.configs = new Map(Object.entries(readJson(FILE)).map(([g, c]) => [g, normalize(c)]));
    logger.info(`Autorole loaded: ${this.configs.size} config(s).`);
  }

  getConfig(guildId) {
    if (!this.configs.has(guildId)) this.configs.set(guildId, normalize({}));
    return this.configs.get(guildId);
  }

  setConfig(guildId, config) {
    this.configs.set(guildId, normalize(config));
    this.save();
    return this.configs.get(guildId);
  }

  save() { writeJsonAtomic(FILE, Object.fromEntries(this.configs)); }

  purgeGuild(guildId) { if (this.configs.delete(guildId)) this.save(); }
}

module.exports = { AutoRoleStore, normalizeAutoRole: normalize };
