const path = require('path');
const crypto = require('crypto');
const { mergeConfig } = require('./config');
const { readJson: load, writeJsonAtomic } = require('../utils/persistence');

const ROOT        = path.join(__dirname, '..', '..');
const CONFIG_FILE = path.join(ROOT, 'pollconfig.json');
const POLLS_FILE  = path.join(ROOT, 'polls.json');
const FLUSH_MS = 10000;

class PollStore {
  constructor() {
    this.configs = new Map(Object.entries(load(CONFIG_FILE)).map(([g, c]) => [g, mergeConfig(c)]));

    // polls: Map<guildId, Map<pollId, poll>>
    this.polls = new Map();
    for (const [gid, polls] of Object.entries(load(POLLS_FILE))) {
      this.polls.set(gid, new Map(Object.entries(polls)));
    }

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

  newId(guildId) {
    const g = this.polls.get(guildId);
    let pid;
    do { pid = crypto.randomBytes(4).toString('hex').slice(0, 6); } while (g?.has(pid));
    return pid;
  }

  addPoll(poll) {
    if (!this.polls.has(poll.guildId)) this.polls.set(poll.guildId, new Map());
    this.polls.get(poll.guildId).set(poll.id, poll);
    this.save();
    return poll;
  }

  getPoll(guildId, pollId) {
    return this.polls.get(guildId)?.get(pollId) || null;
  }

  listPolls(guildId, status) {
    const g = this.polls.get(guildId);
    if (!g) return [];
    const out = [...g.values()];
    const filtered = status ? out.filter(p => p.status === status) : out;
    return filtered.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  }

  // All polls across guilds in a given status, used by the sweep.
  allByStatus(status) {
    const out = [];
    for (const g of this.polls.values())
      for (const p of g.values()) if (p.status === status) out.push(p);
    return out;
  }

  removePoll(guildId, pollId) {
    this.polls.get(guildId)?.delete(pollId);
    this.markDirty();
  }

  markDirty() {
    this._dirty = true;
    if (this._timer) return;
    this._timer = setTimeout(() => this.save(), FLUSH_MS);
    this._timer.unref?.();
  }

  save() {
    if (this._timer) { clearTimeout(this._timer); this._timer = null; }
    const data = {};
    for (const [gid, polls] of this.polls) data[gid] = Object.fromEntries(polls);
    writeJsonAtomic(POLLS_FILE, data);
    this._dirty = false;
  }

  flush() { if (this._dirty) this.save(); }

  purgeGuild(guildId) {
    const had = this.configs.delete(guildId) | this.polls.delete(guildId);
    if (had) {
      writeJsonAtomic(CONFIG_FILE, Object.fromEntries(this.configs));
      this._dirty = true;
      this.save();
    }
  }
}

module.exports = { PollStore };
