// AutoMod configuration: filter metadata, presets, built-in word lists and
// validation. Pure module (no Discord or storage access) so the bot runtime and
// the dashboard API share exactly the same rules.

const ID_RE = /^\d{16,20}$/;
const idList = v => Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && ID_RE.test(x)))].slice(0, 100) : [];
const int = (v, min, max, def) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : def;
};

// What happens when a filter triggers. Every action also deletes the message.
const ACTIONS = ['delete', 'warn', 'timeout', 'kick', 'ban'];

// Filter catalogue. `params` drive both validation and the dashboard inputs.
const FILTERS = [
  { key: 'spam',       label: 'Spam',              params: [{ key: 'maxMessages', min: 2, max: 30, def: 5 }, { key: 'perSeconds', min: 1, max: 60, def: 3 }] },
  { key: 'duplicates', label: 'Duplicate Messages', params: [{ key: 'maxDuplicates', min: 2, max: 20, def: 3 }] },
  { key: 'invites',    label: 'Discord Invites',   params: [] },
  { key: 'links',      label: 'Links',             params: [] },
  { key: 'words',      label: 'Blocked Words',     params: [] },
  { key: 'caps',       label: 'Caps Spam',         params: [{ key: 'percent', min: 30, max: 100, def: 70 }, { key: 'minLength', min: 3, max: 200, def: 10 }] },
  { key: 'mentions',   label: 'Mass Mentions',     params: [{ key: 'maxMentions', min: 2, max: 50, def: 5 }] },
  { key: 'emojis',     label: 'Emoji Spam',        params: [{ key: 'maxEmojis', min: 2, max: 100, def: 10 }] },
  { key: 'chars',      label: 'Character Spam',    params: [{ key: 'maxRepeat', min: 4, max: 100, def: 15 }, { key: 'maxLines', min: 3, max: 100, def: 15 }] }
];
const FILTER_KEYS = FILTERS.map(f => f.key);

// Built-in insult lists. Always matched as whole words (after leetspeak
// normalisation) so harmless words that merely contain them are never hit.
const WORD_LISTS = {
  de: [
    'arschloch', 'arschlöcher', 'hurensohn', 'hurensöhne', 'huso', 'wichser', 'wixer', 'fotze', 'missgeburt',
    'spast', 'spasti', 'schlampe', 'nutte', 'hure', 'bastard', 'pisser', 'vollidiot', 'drecksau',
    'schwuchtel', 'kanake', 'mongo', 'fick dich', 'leck mich', 'du opfer', 'hurenkind', 'scheißkerl', 'scheisskerl'
  ],
  en: [
    'fuck you', 'motherfucker', 'asshole', 'bitch', 'cunt', 'dickhead', 'whore', 'slut', 'retard',
    'faggot', 'fag', 'nigger', 'nigga', 'kys', 'kill yourself', 'twat', 'wanker', 'son of a bitch', 'piece of shit'
  ]
};

// Word-cap per plan lives in premium/limits.js (automodWords); these are hard
// sanity limits for the premium-only extras.
const MAX_REGEX = 50;
const MAX_REGEX_LEN = 200;
const MAX_WORD_LEN = 60;
const MAX_DOMAINS = 100;

function filterBase(key, enabled, action, extra = {}) {
  const meta = FILTERS.find(f => f.key === key);
  const params = Object.fromEntries(meta.params.map(p => [p.key, p.def]));
  return { enabled, action, timeoutMinutes: 10, exemptRoleIds: [], exemptChannelIds: [], ...params, ...extra };
}

function defaultConfig() {
  return {
    enabled: false,
    preset: 'balanced',
    logChannelId: null,
    notify: true,            // short self-deleting notice in the channel
    ignoreMods: true,        // members in the Moderators tab are never filtered
    exemptRoleIds: [],
    exemptChannelIds: [],
    roleOverrides: [],       // premium: [{ roleId, action, timeoutMinutes }]
    filters: {
      spam:       filterBase('spam', true, 'timeout', { timeoutMinutes: 5 }),
      duplicates: filterBase('duplicates', true, 'delete'),
      invites:    filterBase('invites', true, 'warn', { allowOwnServer: true }),
      links:      filterBase('links', false, 'delete', { allowedDomains: ['youtube.com', 'youtu.be', 'tenor.com', 'giphy.com'] }),
      words:      filterBase('words', true, 'delete', { words: [], wholeWord: true, listDe: true, listEn: true, regex: [] }),
      caps:       filterBase('caps', true, 'delete'),
      mentions:   filterBase('mentions', true, 'timeout', { blockEveryone: true }),
      emojis:     filterBase('emojis', true, 'delete', { maxEmojis: 12 }),
      chars:      filterBase('chars', true, 'delete')
    }
  };
}

// Presets only touch the filter switches, thresholds and actions; channel/role
// settings and the admin's own word lists are always kept.
const PRESETS = {
  lenient: {
    spam:       { enabled: true,  action: 'delete',  maxMessages: 7, perSeconds: 3 },
    duplicates: { enabled: true,  action: 'delete',  maxDuplicates: 4 },
    invites:    { enabled: true,  action: 'delete' },
    links:      { enabled: false, action: 'delete' },
    words:      { enabled: true,  action: 'delete',  listDe: false, listEn: false },
    caps:       { enabled: false, action: 'delete',  percent: 80, minLength: 15 },
    mentions:   { enabled: true,  action: 'delete',  maxMentions: 8 },
    emojis:     { enabled: false, action: 'delete',  maxEmojis: 20 },
    chars:      { enabled: false, action: 'delete',  maxRepeat: 25, maxLines: 25 }
  },
  balanced: {
    spam:       { enabled: true,  action: 'timeout', timeoutMinutes: 5, maxMessages: 5, perSeconds: 3 },
    duplicates: { enabled: true,  action: 'delete',  maxDuplicates: 3 },
    invites:    { enabled: true,  action: 'warn' },
    links:      { enabled: false, action: 'delete' },
    words:      { enabled: true,  action: 'delete',  listDe: true, listEn: true },
    caps:       { enabled: true,  action: 'delete',  percent: 70, minLength: 10 },
    mentions:   { enabled: true,  action: 'timeout', timeoutMinutes: 10, maxMentions: 5 },
    emojis:     { enabled: true,  action: 'delete',  maxEmojis: 12 },
    chars:      { enabled: true,  action: 'delete',  maxRepeat: 15, maxLines: 15 }
  },
  strict: {
    spam:       { enabled: true,  action: 'timeout', timeoutMinutes: 15, maxMessages: 4, perSeconds: 3 },
    duplicates: { enabled: true,  action: 'warn',    maxDuplicates: 2 },
    invites:    { enabled: true,  action: 'warn' },
    links:      { enabled: true,  action: 'delete' },
    words:      { enabled: true,  action: 'warn',    listDe: true, listEn: true },
    caps:       { enabled: true,  action: 'delete',  percent: 60, minLength: 8 },
    mentions:   { enabled: true,  action: 'timeout', timeoutMinutes: 30, maxMentions: 4 },
    emojis:     { enabled: true,  action: 'delete',  maxEmojis: 8 },
    chars:      { enabled: true,  action: 'delete',  maxRepeat: 10, maxLines: 12 }
  }
};

const cleanDomain = d => String(d || '').trim().toLowerCase()
  .replace(/^https?:\/\//, '').replace(/^www\./, '').split(/[/?#]/)[0].slice(0, 100);

// Normalises any (partial / untrusted) config into the full shape.
// `opts.isPremium` decides whether premium-only fields are kept.
// `opts.wordCap` trims the custom word list to the plan limit.
function mergeConfig(raw = {}, opts = {}) {
  const base = defaultConfig();
  const r = raw && typeof raw === 'object' ? raw : {};
  const isPrem = !!opts.isPremium;

  const out = {
    enabled: !!r.enabled,
    preset: ['lenient', 'balanced', 'strict', 'custom'].includes(r.preset) ? r.preset : base.preset,
    logChannelId: ID_RE.test(r.logChannelId) ? r.logChannelId : null,
    notify: r.notify === undefined ? base.notify : !!r.notify,
    ignoreMods: r.ignoreMods === undefined ? base.ignoreMods : !!r.ignoreMods,
    exemptRoleIds: idList(r.exemptRoleIds),
    exemptChannelIds: idList(r.exemptChannelIds),
    roleOverrides: isPrem && Array.isArray(r.roleOverrides)
      ? r.roleOverrides
          .filter(o => o && ID_RE.test(o.roleId) && ACTIONS.includes(o.action))
          .slice(0, 20)
          .map(o => ({ roleId: o.roleId, action: o.action, timeoutMinutes: int(o.timeoutMinutes, 1, 40320, 10) }))
      : [],
    filters: {}
  };

  const rf = r.filters && typeof r.filters === 'object' ? r.filters : {};
  for (const meta of FILTERS) {
    const b = base.filters[meta.key];
    const f = rf[meta.key] && typeof rf[meta.key] === 'object' ? rf[meta.key] : {};
    const nf = {
      enabled: f.enabled === undefined ? b.enabled : !!f.enabled,
      action: ACTIONS.includes(f.action) ? f.action : b.action,
      timeoutMinutes: int(f.timeoutMinutes, 1, 40320, b.timeoutMinutes),
      exemptRoleIds: isPrem ? idList(f.exemptRoleIds) : [],
      exemptChannelIds: isPrem ? idList(f.exemptChannelIds) : []
    };
    for (const p of meta.params) nf[p.key] = int(f[p.key], p.min, p.max, b[p.key]);

    if (meta.key === 'invites') nf.allowOwnServer = f.allowOwnServer === undefined ? b.allowOwnServer : !!f.allowOwnServer;
    if (meta.key === 'mentions') nf.blockEveryone = f.blockEveryone === undefined ? b.blockEveryone : !!f.blockEveryone;
    if (meta.key === 'links') {
      const list = Array.isArray(f.allowedDomains) ? f.allowedDomains : b.allowedDomains;
      nf.allowedDomains = [...new Set(list.map(cleanDomain).filter(Boolean))].slice(0, MAX_DOMAINS);
    }
    if (meta.key === 'words') {
      const words = Array.isArray(f.words) ? f.words : [];
      nf.words = [...new Set(words.map(w => String(w || '').trim().toLowerCase().slice(0, MAX_WORD_LEN)).filter(Boolean))];
      if (Number.isFinite(opts.wordCap)) nf.words = nf.words.slice(0, opts.wordCap);
      nf.wholeWord = f.wholeWord === undefined ? b.wholeWord : !!f.wholeWord;
      nf.listDe = f.listDe === undefined ? b.listDe : !!f.listDe;
      nf.listEn = f.listEn === undefined ? b.listEn : !!f.listEn;
      nf.regex = isPrem && Array.isArray(f.regex)
        ? f.regex.map(x => String(x || '').trim().slice(0, MAX_REGEX_LEN)).filter(x => x && isValidRegex(x)).slice(0, MAX_REGEX)
        : [];
    }
    out.filters[meta.key] = nf;
  }
  return out;
}

function isValidRegex(src) {
  try { new RegExp(src, 'iu'); return true; } catch { return false; }
}

module.exports = {
  ACTIONS, FILTERS, FILTER_KEYS, PRESETS, WORD_LISTS,
  MAX_REGEX, MAX_REGEX_LEN, defaultConfig, mergeConfig, isValidRegex
};
