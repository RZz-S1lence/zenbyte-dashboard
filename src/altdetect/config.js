// Alt / suspicious-account detection config. Discord exposes no reliable
// cross-account identifier, so every signal here is a heuristic that contributes
// points toward a 0–100 risk score. The goal is to surface likely throwaway and
// raid accounts for moderator review while keeping false positives low.

// Each signal: { enabled, weight, ...params }. Weight is the maximum points the
// signal can add. Graduated signals (young account) scale below their weight.
const SIGNALS = [
  { key: 'youngAccount',  label: 'New Account',        desc: 'Account is younger than the configured age.' },
  { key: 'instantJoin',   label: 'Created & Joined',   desc: 'Account was created shortly before joining.' },
  { key: 'noAvatar',      label: 'Default Avatar',     desc: 'Account never set a profile picture.' },
  { key: 'suspiciousName',label: 'Suspicious Username', desc: 'Username matches common throwaway patterns.' },
  { key: 'joinBurst',     label: 'Join Burst',         desc: 'Joined during a spike of new members (raid).' },
  { key: 'priorWarnings', label: 'Prior Warnings',     desc: 'Account already has warnings in this server.' },
  { key: 'noProfile',     label: 'Empty Profile',      desc: 'No banner, badges or profile decoration (slower, extra fetch).' }
];

// One-click sensitivity presets. They set the thresholds and the young-account
// window; the per-signal weights stay editable underneath.
const SENSITIVITY_PRESETS = {
  lenient:  { thresholds: { flag: 65, high: 85 }, youngAccountDays: 3,  burst: { joins: 12, windowSec: 30 } },
  balanced: { thresholds: { flag: 50, high: 75 }, youngAccountDays: 7,  burst: { joins: 8,  windowSec: 30 } },
  strict:   { thresholds: { flag: 35, high: 60 }, youngAccountDays: 14, burst: { joins: 5,  windowSec: 30 } }
};

const ACTIONS = [
  { value: 'review',     label: 'Flag for review (no punishment)' },
  { value: 'quarantine', label: 'Add quarantine role' },
  { value: 'kick',       label: 'Kick' },
  { value: 'ban',        label: 'Ban' }
];

function defaultConfig() {
  return {
    enabled: false,
    sensitivity: 'balanced',
    thresholds: { flag: 50, high: 75 },
    actions: { onFlag: 'review', onHigh: 'review' },
    quarantineRoleId: null,
    reviewChannelId: null,
    exemptRoleIds: [],
    dmOnAction: true,
    signals: {
      youngAccount:   { enabled: true,  weight: 35, maxAgeDays: 7 },
      instantJoin:    { enabled: true,  weight: 20, withinHours: 24 },
      noAvatar:       { enabled: true,  weight: 20 },
      suspiciousName: { enabled: true,  weight: 15 },
      joinBurst:      { enabled: true,  weight: 30, joins: 8, windowSec: 30 },
      priorWarnings:  { enabled: true,  weight: 15 },
      noProfile:      { enabled: false, weight: 10 }
    }
  };
}

const num  = (v, d, min = 0, max = 1000000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const id   = v => (typeof v === 'string' && /^\d{16,20}$/.test(v) ? v : null);
const idList = v => Array.isArray(v) ? [...new Set(v.filter(x => /^\d{16,20}$/.test(x)))] : [];

function mergeSignal(stored, def, extra = {}) {
  const s = stored || {};
  const out = { enabled: bool(s.enabled, def.enabled), weight: num(s.weight, def.weight, 0, 100) };
  for (const [k, [d, min, max]] of Object.entries(extra)) out[k] = num(s[k], d, min, max);
  return out;
}

// Labels the config with the preset whose values it matches, else 'custom'.
function derivePreset(thresholds, signals) {
  for (const [name, p] of Object.entries(SENSITIVITY_PRESETS)) {
    if (thresholds.flag === p.thresholds.flag && thresholds.high === p.thresholds.high &&
        signals.youngAccount.maxAgeDays === p.youngAccountDays &&
        signals.joinBurst.joins === p.burst.joins && signals.joinBurst.windowSec === p.burst.windowSec)
      return name;
  }
  return 'custom';
}

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  const sig = s.signals || {};
  const action = v => ACTIONS.some(a => a.value === v) ? v : 'review';

  const flag = num(s.thresholds?.flag, d.thresholds.flag, 1, 100);
  const high = Math.max(flag, num(s.thresholds?.high, d.thresholds.high, 1, 100));

  const thresholds = { flag, high };
  const signals = {
    youngAccount:   mergeSignal(sig.youngAccount,   d.signals.youngAccount,   { maxAgeDays: [7, 1, 365] }),
    instantJoin:    mergeSignal(sig.instantJoin,    d.signals.instantJoin,    { withinHours: [24, 1, 720] }),
    noAvatar:       mergeSignal(sig.noAvatar,       d.signals.noAvatar),
    suspiciousName: mergeSignal(sig.suspiciousName, d.signals.suspiciousName),
    joinBurst:      mergeSignal(sig.joinBurst,      d.signals.joinBurst,      { joins: [8, 2, 100], windowSec: [30, 5, 600] }),
    priorWarnings:  mergeSignal(sig.priorWarnings,  d.signals.priorWarnings),
    noProfile:      mergeSignal(sig.noProfile,      d.signals.noProfile)
  };

  return {
    enabled: bool(s.enabled, d.enabled),
    sensitivity: derivePreset(thresholds, signals),
    thresholds,
    actions: { onFlag: action(s.actions?.onFlag), onHigh: action(s.actions?.onHigh) },
    quarantineRoleId: id(s.quarantineRoleId),
    reviewChannelId: id(s.reviewChannelId),
    exemptRoleIds: idList(s.exemptRoleIds),
    dmOnAction: bool(s.dmOnAction, d.dmOnAction),
    signals
  };
}

module.exports = { defaultConfig, mergeConfig, SIGNALS, SENSITIVITY_PRESETS, ACTIONS };
