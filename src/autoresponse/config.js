// Auto Response configuration: shape, validation and matching helpers.
//
// A rule reacts to a message whose content matches `trigger` under one of the
// supported match modes, and replies with either plain text or a rich embed.
// Everything here is pure (no Discord or storage access) so it can be reused by
// the bot runtime, the dashboard API and tests alike.

const MATCH_MODES = [
  { value: 'exact',    label: 'Exact match',  hint: 'The whole message equals the trigger.' },
  { value: 'contains', label: 'Contains',     hint: 'The message contains the trigger anywhere.' },
  { value: 'starts',   label: 'Starts with',  hint: 'The message begins with the trigger.' },
  { value: 'ends',     label: 'Ends with',    hint: 'The message ends with the trigger.' }
];
const MATCH_VALUES = MATCH_MODES.map(m => m.value);
const RESPONSE_TYPES = ['text', 'embed'];

const DEFAULT_COLOR = '#5865F2';
const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE = /^\d{16,20}$/;

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const trimStr = (v, max) => str(v, max).trim();
const idList = v => Array.isArray(v) ? [...new Set(v.filter(x => ID_RE.test(x)))] : [];
const url = v => {
  const s = trimStr(v, 1024);
  return /^https?:\/\//i.test(s) ? s : '';
};

// Normalizes a single embed object to the fields Discord accepts. Returns a clean
// object even from partial input; empty sections are dropped at build time.
function normalizeEmbed(raw = {}) {
  const e = raw || {};
  const author = e.author || {};
  const footer = e.footer || {};
  return {
    author: {
      name:    trimStr(author.name, 256),
      iconUrl: url(author.iconUrl),
      url:     url(author.url)
    },
    title:       trimStr(e.title, 256),
    url:         url(e.url),
    description: str(e.description, 4000),
    color:       HEX_RE.test(e.color) ? e.color : DEFAULT_COLOR,
    fields: (Array.isArray(e.fields) ? e.fields : [])
      .filter(f => f && (trimStr(f.name, 256) || trimStr(f.value, 1024)))
      .slice(0, 25)
      .map(f => ({
        name:   trimStr(f.name, 256) || '​',
        value:  str(f.value, 1024) || '​',
        inline: !!f.inline
      })),
    image:     { url: url((e.image || {}).url) },
    thumbnail: { url: url((e.thumbnail || {}).url) },
    footer:    { text: trimStr(footer.text, 2048), iconUrl: url(footer.iconUrl) },
    timestamp: !!e.timestamp
  };
}

// True when an embed has at least one piece of visible content, so we never post
// an empty embed (which Discord rejects).
function embedHasContent(e) {
  if (!e) return false;
  return !!(e.title || e.description || e.author?.name || e.footer?.text ||
    e.image?.url || e.thumbnail?.url || (e.fields && e.fields.length));
}

function genId() { return require('crypto').randomBytes(4).toString('hex'); }

// Normalizes a full rule. Always returns a complete, safe object.
function normalizeRule(raw = {}) {
  const r = raw || {};
  const responseType = RESPONSE_TYPES.includes(r.responseType) ? r.responseType : 'text';
  return {
    id:            /^[0-9a-f]{8}$/.test(r.id || '') ? r.id : genId(),
    enabled:       r.enabled !== false,
    name:          trimStr(r.name, 80),
    trigger:       trimStr(r.trigger, 200),
    match:         MATCH_VALUES.includes(r.match) ? r.match : 'contains',
    caseSensitive: !!r.caseSensitive,
    responseType,
    text:          str(r.text, 2000),
    embed:         normalizeEmbed(r.embed),
    reply:         r.reply !== false,        // reply to the trigger message by default
    deleteTrigger: !!r.deleteTrigger,        // remove the user's message after responding
    cooldownSec:   Math.min(3600, Math.max(0, parseInt(r.cooldownSec, 10) || 0)),
    channelIds:    idList(r.channelIds),     // empty = every channel
    ignoreRoleIds: idList(r.ignoreRoleIds),  // members with any of these are skipped
    createdAt:     Number.isFinite(r.createdAt) ? r.createdAt : Date.now()
  };
}

// Returns true when `content` matches the rule's trigger under its mode/casing.
function ruleMatches(rule, content) {
  if (!rule.trigger) return false;
  let hay = content;
  let needle = rule.trigger;
  if (!rule.caseSensitive) { hay = hay.toLowerCase(); needle = needle.toLowerCase(); }
  hay = hay.trim();
  switch (rule.match) {
    case 'exact':    return hay === needle.trim();
    case 'starts':   return hay.startsWith(needle);
    case 'ends':     return hay.endsWith(needle);
    case 'contains':
    default:         return hay.includes(needle);
  }
}

// Validates a rule for saving. Returns { ok } or { ok:false, error }.
function validateRule(rule) {
  if (!rule.trigger) return { ok: false, error: 'A trigger phrase is required.' };
  if (rule.responseType === 'text') {
    if (!rule.text.trim()) return { ok: false, error: 'Add the text this response should send.' };
  } else if (!embedHasContent(rule.embed)) {
    return { ok: false, error: 'The embed needs at least a title, description or one field.' };
  }
  return { ok: true };
}

module.exports = {
  MATCH_MODES, MATCH_VALUES, RESPONSE_TYPES, DEFAULT_COLOR,
  normalizeEmbed, embedHasContent, normalizeRule, ruleMatches, validateRule, genId
};
