const path = require('path');
const logger = require('../utils/logger');
const { readJson, writeJsonAtomic } = require('../utils/persistence');
const { normalizeRule, genId } = require('./config');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'autoresponses.json');

// JSON-backed store of auto-response rules, Map<guildId, rule[]>. Mirrors the
// reaction-role store: kept in memory, written atomically on change.
class AutoResponseStore {
  constructor() {
    this.rules = new Map();
    for (const [gid, list] of Object.entries(readJson(FILE))) {
      this.rules.set(gid, (Array.isArray(list) ? list : []).map(normalizeRule));
    }
    const total = [...this.rules.values()].reduce((n, l) => n + l.length, 0);
    logger.info(`Auto responses loaded: ${total} rule(s) across ${this.rules.size} guild(s).`);
  }

  list(guildId) {
    if (!this.rules.has(guildId)) this.rules.set(guildId, []);
    return this.rules.get(guildId);
  }

  // Only the enabled rules, used by the runtime matcher.
  enabled(guildId) {
    return this.list(guildId).filter(r => r.enabled);
  }

  get(guildId, ruleId) {
    return this.list(guildId).find(r => r.id === ruleId) || null;
  }

  create(guildId, data) {
    const rule = normalizeRule({ ...data, id: genId(), createdAt: Date.now() });
    this.list(guildId).push(rule);
    this.save();
    return rule;
  }

  update(guildId, ruleId, data) {
    const list = this.list(guildId);
    const idx = list.findIndex(r => r.id === ruleId);
    if (idx === -1) return null;
    // Preserve id and creation time across edits.
    list[idx] = normalizeRule({ ...list[idx], ...data, id: ruleId, createdAt: list[idx].createdAt });
    this.save();
    return list[idx];
  }

  delete(guildId, ruleId) {
    const list = this.list(guildId);
    const idx = list.findIndex(r => r.id === ruleId);
    if (idx === -1) return false;
    list.splice(idx, 1);
    this.save();
    return true;
  }

  save() {
    const out = {};
    for (const [gid, list] of this.rules) if (list.length) out[gid] = list;
    writeJsonAtomic(FILE, out);
  }

  purgeGuild(guildId) { if (this.rules.delete(guildId)) this.save(); }
}

module.exports = { AutoResponseStore };
