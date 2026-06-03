const crypto = require('crypto');

const STATUSES = ['pending', 'accepted', 'denied', 'hold', 'info_requested'];
const QUESTION_TYPES = ['short', 'paragraph', 'multiple_choice', 'dropdown'];
const CHOICE_TYPES = ['multiple_choice', 'dropdown'];
// Decision states that can auto-assign a role. 'pending' is excluded — a role is
// only granted/changed once staff actually act on the application.
const ROLE_STATUSES = ['accepted', 'denied', 'hold', 'info_requested'];
const BUTTON_STYLES = ['Primary', 'Success', 'Danger', 'Secondary'];

const DEFAULT_PANEL = {
  title:       '📝 Applications',
  description: 'Click below to start an application. Your answers are sent privately to the staff team for review.',
  color:       null,            // null → fall back to the brand colour at render time
  buttonLabel: 'Apply',
  buttonEmoji: '📝',
  buttonStyle: 'Primary'
};

const idRe = /^\d{16,20}$/;
const id      = v => (typeof v === 'string' && idRe.test(v) ? v : null);
const idList  = v => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && idRe.test(x)))] : []);
const num     = (v, d, min, max) => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d; };
const str     = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Accepts an int (0–0xFFFFFF) or a "#rrggbb"/"rrggbb" string; returns int or null.
function color(v) {
  if (typeof v === 'number' && Number.isFinite(v)) return Math.max(0, Math.min(0xFFFFFF, Math.round(v)));
  if (typeof v === 'string') { const m = v.trim().match(/^#?([0-9a-fA-F]{6})$/); if (m) return parseInt(m[1], 16); }
  return null;
}

// status -> roleId map, only for the states that may grant a role.
function mergeStatusRoles(raw) {
  const src = raw && typeof raw === 'object' ? raw : {};
  const out = {};
  for (const st of ROLE_STATUSES) out[st] = id(src[st]);
  return out;
}

// The customisable applications panel (embed + apply button).
function mergePanel(raw) {
  const s = raw && typeof raw === 'object' ? raw : {};
  return {
    title:       str(s.title, 256) || DEFAULT_PANEL.title,
    description: str(s.description, 2000) || DEFAULT_PANEL.description,
    color:       s.color === undefined ? DEFAULT_PANEL.color : color(s.color),
    buttonLabel: str(s.buttonLabel, 80) || DEFAULT_PANEL.buttonLabel,
    buttonEmoji: s.buttonEmoji === undefined ? DEFAULT_PANEL.buttonEmoji : (str(s.buttonEmoji, 64) || null),
    buttonStyle: BUTTON_STYLES.includes(s.buttonStyle) ? s.buttonStyle : DEFAULT_PANEL.buttonStyle
  };
}

// ── Per-guild applications settings ───────────────
function defaultConfig() {
  return {
    reviewerRoleIds: [],     // roles that may review applications (Discord + dashboard buttons)
    managerRoleIds:  [],     // roles that may manage forms via Discord (admins always can)
    notifyRoleIds:   [],     // roles pinged in the review channel on a new submission
    reviewChannelId:   null, // where pending submissions are posted for staff
    logChannelId:      null, // where holds / info-requests / notes are logged
    acceptedChannelId: null, // accepted applications are moved here
    deniedChannelId:   null, // denied applications are moved here
    statusRoleIds:   mergeStatusRoles({}), // status -> role granted on that decision
    dmNotifications: true,   // DM the applicant on status changes
    cooldownMinutes: 0,      // per-form resubmit cooldown (0 = unlimited)
    panel:           { ...DEFAULT_PANEL }, // customisable panel embed + button
    panelChannelId:  null,   // where the live panel was last posted (managed by the bot)
    panelMessageId:  null    // the live panel message id (managed by the bot)
  };
}

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  return {
    reviewerRoleIds: idList(s.reviewerRoleIds),
    managerRoleIds:  idList(s.managerRoleIds),
    notifyRoleIds:   idList(s.notifyRoleIds),
    reviewChannelId:   id(s.reviewChannelId),
    logChannelId:      id(s.logChannelId),
    acceptedChannelId: id(s.acceptedChannelId),
    deniedChannelId:   id(s.deniedChannelId),
    statusRoleIds:   mergeStatusRoles(s.statusRoleIds),
    dmNotifications: s.dmNotifications !== false,
    cooldownMinutes: num(s.cooldownMinutes, d.cooldownMinutes, 0, 525600),
    panel:           mergePanel(s.panel),
    panelChannelId:  id(s.panelChannelId),
    panelMessageId:  (typeof s.panelMessageId === 'string' && idRe.test(s.panelMessageId)) ? s.panelMessageId : null
  };
}

// Validates and normalises a single question from untrusted (dashboard) input.
// Returns a clean question object or null if it cannot be salvaged.
function sanitizeQuestion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type  = QUESTION_TYPES.includes(raw.type) ? raw.type : 'short';
  const label = str(raw.label, 200);
  if (!label) return null; // a question with no prompt is meaningless

  const q = {
    id:          (typeof raw.id === 'string' && /^[a-z0-9]{4,12}$/.test(raw.id)) ? raw.id : crypto.randomBytes(4).toString('hex'),
    type,
    label,
    placeholder: str(raw.placeholder, 100) || null,
    required:    raw.required !== false,
    options:     []
  };

  if (CHOICE_TYPES.includes(type)) {
    const opts = Array.isArray(raw.options) ? raw.options : [];
    q.options = [...new Set(opts.map(o => str(o, 100)).filter(Boolean))].slice(0, 25);
    if (!q.options.length) return null; // choice questions need at least one option
  }
  return q;
}

// Normalises a full list of questions, dropping invalid ones and de-duping ids.
function sanitizeQuestions(raw) {
  const out = [];
  const seen = new Set();
  for (const item of Array.isArray(raw) ? raw : []) {
    const q = sanitizeQuestion(item);
    if (!q) continue;
    while (seen.has(q.id)) q.id = crypto.randomBytes(4).toString('hex');
    seen.add(q.id);
    out.push(q);
    if (out.length >= 25) break; // hard cap per form
  }
  return out;
}

const STATUS_META = {
  pending:        { label: 'Pending',           emoji: '🕓', color: 0x5865f2 },
  accepted:       { label: 'Accepted',          emoji: '✅', color: 0x57f287 },
  denied:         { label: 'Denied',            emoji: '❌', color: 0xed4245 },
  hold:           { label: 'On Hold',           emoji: '⏸️', color: 0xfee75c },
  info_requested: { label: 'Info Requested',    emoji: '✉️', color: 0xeb459e }
};

module.exports = {
  defaultConfig, mergeConfig, sanitizeQuestion, sanitizeQuestions,
  STATUSES, QUESTION_TYPES, CHOICE_TYPES, STATUS_META,
  ROLE_STATUSES, BUTTON_STYLES, DEFAULT_PANEL
};
