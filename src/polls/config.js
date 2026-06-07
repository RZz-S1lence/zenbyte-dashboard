// Per-guild poll settings. Controls who may create polls and a few defaults.
function defaultConfig() {
  return {
    creatorRoleIds: [],   // roles allowed to create polls (besides ManageMessages / moderators)
    defaultDurationMin: 0, // 0 = polls stay open until ended manually
    // Admin-chosen soft cap on options per poll. Defaults to the highest premium
    // ceiling so it never silently restricts a premium server below its tier; the
    // effective cap is always min(maxOptions, tier limit) (see premium/limits.js).
    maxOptions: 25,
    resultsChannelId: null // optional channel where a summary is posted when a poll ends
  };
}

const num = (v, d, min = 0, max = 1000000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
const id = v => (typeof v === 'string' && /^\d{16,20}$/.test(v) ? v : null);
const idList = v => Array.isArray(v) ? [...new Set(v.filter(x => /^\d{16,20}$/.test(x)))] : [];

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  return {
    creatorRoleIds: idList(s.creatorRoleIds),
    defaultDurationMin: num(s.defaultDurationMin, d.defaultDurationMin, 0, 525600),
    maxOptions: num(s.maxOptions, d.maxOptions, 2, 25),
    resultsChannelId: id(s.resultsChannelId)
  };
}

module.exports = { defaultConfig, mergeConfig };
