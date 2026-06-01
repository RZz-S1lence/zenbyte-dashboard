const path = require('path');
const crypto = require('crypto');
const logger = require('../utils/logger');
const { readJson, writeJsonAtomic } = require('../utils/persistence');
const { MODE_VALUES, DEFAULT_COLOR, normalizeMapping } = require('./config');

const ROOT = path.join(__dirname, '..', '..');
const FILE = path.join(ROOT, 'reactionroles.json');

const idOrNull = v => (/^\d{16,20}$/.test(v || '') ? v : null);
const genId = () => crypto.randomBytes(4).toString('hex');

// A menu (panel) is a single message with one or more emoji→role mappings.
function normalizeMenu(stored = {}) {
  const s = stored || {};
  const color = /^#[0-9a-fA-F]{6}$/.test(s.color) ? s.color : DEFAULT_COLOR;
  return {
    id:          /^[0-9a-f]{8}$/.test(s.id || '') ? s.id : genId(),
    channelId:   idOrNull(s.channelId),
    messageId:   idOrNull(s.messageId),
    mode:        MODE_VALUES.includes(s.mode) ? s.mode : 'normal',
    managed:     s.managed !== false,            // bot owns/edits the message
    embed:       s.embed !== false,              // managed panels: embed vs plain text
    title:       typeof s.title === 'string' && s.title.trim() ? s.title.slice(0, 256) : null,
    description: typeof s.description === 'string' && s.description.trim() ? s.description.slice(0, 2000) : null,
    color,
    mappings:    (Array.isArray(s.mappings) ? s.mappings : []).map(normalizeMapping).filter(Boolean).slice(0, 20)
  };
}

class ReactionRoleStore {
  constructor() {
    // Map<guildId, menu[]>
    this.menus = new Map();
    for (const [gid, list] of Object.entries(readJson(FILE))) {
      this.menus.set(gid, (Array.isArray(list) ? list : []).map(normalizeMenu));
    }
    const total = [...this.menus.values()].reduce((n, l) => n + l.length, 0);
    logger.info(`Reaction roles loaded: ${total} panel(s) across ${this.menus.size} guild(s).`);
  }

  listMenus(guildId) {
    if (!this.menus.has(guildId)) this.menus.set(guildId, []);
    return this.menus.get(guildId);
  }

  getMenu(guildId, menuId) {
    return this.listMenus(guildId).find(m => m.id === menuId) || null;
  }

  findByMessage(guildId, messageId) {
    return this.listMenus(guildId).find(m => m.messageId === messageId) || null;
  }

  // Insert a new menu (returns the normalized stored copy).
  createMenu(guildId, data) {
    const menu = normalizeMenu({ ...data, id: genId() });
    this.listMenus(guildId).push(menu);
    this.save();
    return menu;
  }

  // Replace an existing menu by id. Returns the stored copy or null.
  updateMenu(guildId, menuId, data) {
    const list = this.listMenus(guildId);
    const idx = list.findIndex(m => m.id === menuId);
    if (idx === -1) return null;
    list[idx] = normalizeMenu({ ...list[idx], ...data, id: menuId });
    this.save();
    return list[idx];
  }

  deleteMenu(guildId, menuId) {
    const list = this.listMenus(guildId);
    const idx = list.findIndex(m => m.id === menuId);
    if (idx === -1) return null;
    const [removed] = list.splice(idx, 1);
    this.save();
    return removed;
  }

  save() {
    const out = {};
    for (const [gid, list] of this.menus) if (list.length) out[gid] = list;
    writeJsonAtomic(FILE, out);
  }

  purgeGuild(guildId) { if (this.menus.delete(guildId)) this.save(); }
}

module.exports = { ReactionRoleStore, normalizeMenu };
