const fs   = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');
const { normalizeTicketConfig } = require('../utils/tickets');
const { normalizeGreetings } = require('../greetings/config');
const { mergeConfig } = require('../security/protections');
const { prefix: DEFAULT_PREFIX } = require('../config');

const ROOT = path.join(__dirname, '..', '..');
const FILES = {
  warnings:    path.join(ROOT, 'warnings.json'),
  moderators:  path.join(ROOT, 'moderators.json'),
  logChannels: path.join(ROOT, 'logchannels.json'),
  tickets:      path.join(ROOT, 'tickets.json'),
  security:     path.join(ROOT, 'security.json'),
  verification: path.join(ROOT, 'verification.json'),
  commandToggles: path.join(ROOT, 'commandtoggles.json'),
  channelRules:   path.join(ROOT, 'channelrules.json'),
  muteRoles:    path.join(ROOT, 'muteroles.json'),
  prefixes:     path.join(ROOT, 'prefixes.json'),
  greetings:    path.join(ROOT, 'greetings.json')
};

const { readJson: loadJson, writeJsonAtomic: saveJson } = require('../utils/persistence');

class Store {
  constructor() {
    // warnings: Collection<guildId, Map<userId, warning[]>>
    this.warnings = new Collection();
    const warningsData = loadJson(FILES.warnings);
    for (const [gid, gdata] of Object.entries(warningsData)) {
      this.warnings.set(gid, new Map(Object.entries(gdata)));
    }

    // moderators: Map<guildId, { users: string[], roles: string[] }>
    this.moderators = new Map(Object.entries(loadJson(FILES.moderators)));

    // logChannels: Map<guildId, { [logType]: channelId }>
    this.logChannels = new Map(Object.entries(loadJson(FILES.logChannels)));

    // tickets: Map<guildId, config>, migrated to multi-role on load
    this.tickets = new Map();
    for (const [gid, cfg] of Object.entries(loadJson(FILES.tickets))) {
      this.tickets.set(gid, normalizeTicketConfig(cfg));
    }

    // openTickets: runtime only, Map<guildId, Map<channelId, data>>
    this.openTickets = new Map();

    // security: Map<guildId, antinuke config>, merged onto defaults on load
    this.security = new Map();
    for (const [gid, cfg] of Object.entries(loadJson(FILES.security))) {
      this.security.set(gid, mergeConfig(cfg));
    }

    // verification: Map<guildId, { enabled, channelId, verifiedRoleId, panelTitle, panelDescription }>
    this.verification = new Map(Object.entries(loadJson(FILES.verification)));

    // commandToggles: Map<guildId, string[]>, names of disabled commands
    this.commandToggles = new Map(Object.entries(loadJson(FILES.commandToggles)));

    // channelRules: Map<guildId, { [commandName]: { mode: 'blacklist'|'whitelist', channels: string[] } }>
    // Restricts which channels a command may be used in, per guild.
    this.channelRules = new Map(Object.entries(loadJson(FILES.channelRules)));

    // muteRoles: Map<guildId, roleId>, the role used to mute members in that guild
    this.muteRoles = new Map(Object.entries(loadJson(FILES.muteRoles)));

    // prefixes: Map<guildId, string>, custom command prefix per guild
    this.prefixes = new Map(Object.entries(loadJson(FILES.prefixes)));

    // greetings: Map<guildId, { welcome, leave }>, welcome/leave message config
    this.greetings = new Map();
    for (const [gid, cfg] of Object.entries(loadJson(FILES.greetings))) {
      this.greetings.set(gid, normalizeGreetings(cfg));
    }

    logger.info(`Store loaded: ${this.warnings.size} guild(s) with warnings, ${this.tickets.size} ticket config(s).`);
  }

  saveWarnings() {
    const data = {};
    for (const [gid, gmap] of this.warnings) data[gid] = Object.fromEntries(gmap);
    saveJson(FILES.warnings, data);
  }

  saveModerators() {
    saveJson(FILES.moderators, Object.fromEntries(this.moderators));
  }

  saveLogChannels() {
    saveJson(FILES.logChannels, Object.fromEntries(this.logChannels));
  }

  saveTickets() {
    saveJson(FILES.tickets, Object.fromEntries(this.tickets));
  }

  getSecurityConfig(guildId) {
    if (!this.security.has(guildId)) this.security.set(guildId, mergeConfig({}));
    return this.security.get(guildId);
  }

  saveSecurity() {
    saveJson(FILES.security, Object.fromEntries(this.security));
  }

  getVerificationConfig(guildId) {
    const stored = this.verification.get(guildId) || {};
    return {
      enabled:          !!stored.enabled,
      channelId:        stored.channelId || null,
      verifiedRoleId:   stored.verifiedRoleId || null,
      panelTitle:       stored.panelTitle || null,
      panelDescription: stored.panelDescription || null,
      minAccountAgeDays: Number.isFinite(stored.minAccountAgeDays) ? stored.minAccountAgeDays : 0,
      requireAvatar:    !!stored.requireAvatar,
      altAction:        ['kick', 'ban', 'block'].includes(stored.altAction) ? stored.altAction : 'kick'
    };
  }

  saveVerification() {
    saveJson(FILES.verification, Object.fromEntries(this.verification));
  }

  getMuteRoleId(guildId) {
    return this.muteRoles.get(guildId) || null;
  }

  setMuteRoleId(guildId, roleId) {
    if (roleId) this.muteRoles.set(guildId, roleId);
    else this.muteRoles.delete(guildId);
    saveJson(FILES.muteRoles, Object.fromEntries(this.muteRoles));
    return this.getMuteRoleId(guildId);
  }

  getPrefix(guildId) {
    return this.prefixes.get(guildId) || DEFAULT_PREFIX;
  }

  setPrefix(guildId, prefix) {
    if (prefix && prefix !== DEFAULT_PREFIX) this.prefixes.set(guildId, prefix);
    else this.prefixes.delete(guildId);
    saveJson(FILES.prefixes, Object.fromEntries(this.prefixes));
    return this.getPrefix(guildId);
  }

  getGreetingsConfig(guildId) {
    return this.greetings.get(guildId) || normalizeGreetings({});
  }

  setGreetingsConfig(guildId, cfg) {
    const clean = normalizeGreetings(cfg);
    this.greetings.set(guildId, clean);
    this.saveGreetings();
    return clean;
  }

  saveGreetings() {
    saveJson(FILES.greetings, Object.fromEntries(this.greetings));
  }

  getDisabledCommands(guildId) {
    return this.commandToggles.get(guildId) || [];
  }

  isCommandDisabled(guildId, name) {
    return this.getDisabledCommands(guildId).includes(name);
  }

  setCommandEnabled(guildId, name, enabled) {
    return this.setCommandsEnabled(guildId, [name], enabled);
  }

  // Enable/disable several commands at once with a single save.
  setCommandsEnabled(guildId, names, enabled) {
    const set = new Set(this.getDisabledCommands(guildId));
    for (const name of names) { if (enabled) set.delete(name); else set.add(name); }
    if (set.size) this.commandToggles.set(guildId, [...set]);
    else this.commandToggles.delete(guildId);
    saveJson(FILES.commandToggles, Object.fromEntries(this.commandToggles));
    return [...set];
  }

  // ── Per-command channel rules ─────────────────
  // All rules for a guild, as { [commandName]: { mode, channels } }.
  getChannelRules(guildId) {
    return this.channelRules.get(guildId) || {};
  }

  // The rule for one command, or null when unrestricted.
  getChannelRule(guildId, name) {
    const rule = this.getChannelRules(guildId)[name];
    if (!rule || !Array.isArray(rule.channels) || !rule.channels.length) return null;
    return rule;
  }

  // Sets (or clears) the rule for a command. Pass mode 'off' / no channels to clear.
  setChannelRule(guildId, name, mode, channels) {
    const all = { ...this.getChannelRules(guildId) };
    const clean = Array.isArray(channels)
      ? [...new Set(channels.filter(id => /^\d{16,20}$/.test(id)))]
      : [];
    if ((mode === 'blacklist' || mode === 'whitelist') && clean.length)
      all[name] = { mode, channels: clean };
    else
      delete all[name];

    if (Object.keys(all).length) this.channelRules.set(guildId, all);
    else this.channelRules.delete(guildId);
    saveJson(FILES.channelRules, Object.fromEntries(this.channelRules));
    return all[name] || null;
  }

  // Decides whether a command may run in a channel. `channelIds` is the channel and,
  // for threads, its parent — a match on either counts. Returns { ok } when allowed,
  // or { ok:false, mode, channels } so callers can build a helpful message.
  checkChannelRule(guildId, name, channelIds) {
    const rule = this.getChannelRule(guildId, name);
    if (!rule) return { ok: true };
    const ids = (Array.isArray(channelIds) ? channelIds : [channelIds]).filter(Boolean);
    const hit = rule.channels.some(c => ids.includes(c));
    if (rule.mode === 'blacklist') return hit ? { ok: false, ...rule } : { ok: true };
    // whitelist: allowed only inside a listed channel
    return hit ? { ok: true } : { ok: false, ...rule };
  }

  isTicketChannel(guildId, channelId) {
    return !!this.openTickets.get(guildId)?.has(channelId);
  }

  isModerator(guildId, member) {
    const mods = this.moderators.get(guildId);
    if (!mods) return false;
    if (mods.users?.includes(member.id)) return true;
    if (mods.roles?.some(rid => member.roles.cache.has(rid))) return true;
    return false;
  }

  // Removes everything stored for a guild. Called when the bot is removed from it.
  purgeGuild(guildId) {
    if (this.warnings.delete(guildId))       this.saveWarnings();
    if (this.moderators.delete(guildId))     this.saveModerators();
    if (this.logChannels.delete(guildId))    this.saveLogChannels();
    if (this.tickets.delete(guildId))        this.saveTickets();
    if (this.security.delete(guildId))       this.saveSecurity();
    if (this.verification.delete(guildId))   this.saveVerification();
    if (this.commandToggles.delete(guildId)) saveJson(FILES.commandToggles, Object.fromEntries(this.commandToggles));
    if (this.channelRules.delete(guildId))   saveJson(FILES.channelRules, Object.fromEntries(this.channelRules));
    if (this.muteRoles.delete(guildId))      saveJson(FILES.muteRoles, Object.fromEntries(this.muteRoles));
    if (this.prefixes.delete(guildId))       saveJson(FILES.prefixes, Object.fromEntries(this.prefixes));
    if (this.greetings.delete(guildId))      this.saveGreetings();
    this.openTickets.delete(guildId);
  }
}

module.exports = Store;
