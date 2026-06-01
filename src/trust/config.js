function defaultConfig() {
  return {
    enabled: true,
    weights: { accountAge: 1, tenure: 1, activity: 2, level: 1, verified: 1 },
    caps: { activity: 5000, level: 30 },
    warningPenalty: 10,
    tiers: [
      { name: 'Untrusted', min: 0 },
      { name: 'Newcomer',  min: 25 },
      { name: 'Member',    min: 50 },
      { name: 'Trusted',   min: 75 },
      { name: 'Veteran',   min: 90 }
    ]
  };
}

const num = (v, d, min = 0, max = 1000000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  let tiers = Array.isArray(s.tiers)
    ? s.tiers.filter(t => t && typeof t.name === 'string' && t.name.trim())
        .map(t => ({ name: t.name.trim().slice(0, 32), min: num(t.min, 0, 0, 100) }))
        .sort((a, b) => a.min - b.min)
    : d.tiers;
  if (!tiers.length) tiers = d.tiers;

  return {
    enabled: bool(s.enabled, d.enabled),
    weights: {
      accountAge: num(s.weights?.accountAge, d.weights.accountAge, 0, 100),
      tenure:     num(s.weights?.tenure, d.weights.tenure, 0, 100),
      activity:   num(s.weights?.activity, d.weights.activity, 0, 100),
      level:      num(s.weights?.level, d.weights.level, 0, 100),
      verified:   num(s.weights?.verified, d.weights.verified, 0, 100)
    },
    caps: {
      activity: num(s.caps?.activity, d.caps.activity, 1),
      level:    num(s.caps?.level, d.caps.level, 1)
    },
    warningPenalty: num(s.warningPenalty, d.warningPenalty, 0, 100),
    tiers
  };
}

module.exports = { defaultConfig, mergeConfig };
