function defaultConfig() {
  return {
    enabled: true,
    weights: { message: 1, voicePerMinute: 2, reaction: 1 },
    countBots: false,
    ignoredChannels: [],
    ignoredRoles: [],
    leaderboard: { weeklyEnabled: true, monthlyEnabled: true }
  };
}

const num = (v, d, min = 0, max = 100000) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const idList = v => (Array.isArray(v) ? [...new Set(v.filter(x => typeof x === 'string' && /^\d{16,20}$/.test(x)))] : []);

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  return {
    enabled: bool(s.enabled, d.enabled),
    weights: {
      message:        num(s.weights?.message, d.weights.message),
      voicePerMinute: num(s.weights?.voicePerMinute, d.weights.voicePerMinute),
      reaction:       num(s.weights?.reaction, d.weights.reaction)
    },
    countBots: bool(s.countBots, d.countBots),
    ignoredChannels: idList(s.ignoredChannels),
    ignoredRoles: idList(s.ignoredRoles),
    leaderboard: {
      weeklyEnabled:  bool(s.leaderboard?.weeklyEnabled, d.leaderboard.weeklyEnabled),
      monthlyEnabled: bool(s.leaderboard?.monthlyEnabled, d.leaderboard.monthlyEnabled)
    }
  };
}

module.exports = { defaultConfig, mergeConfig };
