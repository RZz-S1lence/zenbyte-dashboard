const CURVES = ['mee6', 'linear', 'exponential'];
const ANNOUNCE_MODES = ['channel', 'current', 'dm', 'off'];

function defaultConfig() {
  return {
    enabled: false,
    message:  { enabled: true,  min: 15, max: 25, cooldown: 60 },
    voice:    { enabled: true,  xpPerMinute: 10, minUsers: 2, ignoreAfk: true, ignoreMuted: true, ignoreDeafened: true },
    reaction: { enabled: false, xp: 5, cooldown: 60 },
    formula:  { curve: 'mee6', baseXp: 100, factor: 1.2 },
    maxLevel: 0,
    multiplier: 1,
    announce: { mode: 'channel', channelId: null, message: 'GG {user}, you just reached **level {level}**! 🎉', card: false },
    roleRewards: [],
    stackRewards: true,
    removeRewardsOnReset: true,
    noXpChannels: [],
    noXpRoles: [],
    channelBoosts: [],
    roleBoosts: [],
    leaderboard: { weeklyEnabled: true, monthlyEnabled: true },
    rankCard: { accent: '#7c6cf5' }
  };
}

const num = (v, d, min = -Infinity, max = Infinity) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const bool = (v, d) => (typeof v === 'boolean' ? v : d);
const idList = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && /^\d{16,20}$/.test(x)) : []);
const boostList = v => (Array.isArray(v) ? v
  .filter(b => b && /^\d{16,20}$/.test(b.id))
  .map(b => ({ id: b.id, multiplier: num(b.multiplier, 1, 0, 100) })) : []);
const rewardList = v => (Array.isArray(v) ? v
  .filter(r => r && /^\d{16,20}$/.test(r.roleId) && Number.isFinite(Number(r.level)))
  .map(r => ({ level: Math.max(1, parseInt(r.level, 10)), roleId: r.roleId })) : []);

function mergeConfig(stored = {}) {
  const d = defaultConfig();
  const s = stored || {};
  return {
    enabled: bool(s.enabled, d.enabled),
    message: {
      enabled:  bool(s.message?.enabled, d.message.enabled),
      min:      num(s.message?.min, d.message.min, 0, 100000),
      max:      num(s.message?.max, d.message.max, 0, 100000),
      cooldown: num(s.message?.cooldown, d.message.cooldown, 0, 86400)
    },
    voice: {
      enabled:        bool(s.voice?.enabled, d.voice.enabled),
      xpPerMinute:    num(s.voice?.xpPerMinute, d.voice.xpPerMinute, 0, 100000),
      minUsers:       num(s.voice?.minUsers, d.voice.minUsers, 1, 99),
      ignoreAfk:      bool(s.voice?.ignoreAfk, d.voice.ignoreAfk),
      ignoreMuted:    bool(s.voice?.ignoreMuted, d.voice.ignoreMuted),
      ignoreDeafened: bool(s.voice?.ignoreDeafened, d.voice.ignoreDeafened)
    },
    reaction: {
      enabled:  bool(s.reaction?.enabled, d.reaction.enabled),
      xp:       num(s.reaction?.xp, d.reaction.xp, 0, 100000),
      cooldown: num(s.reaction?.cooldown, d.reaction.cooldown, 0, 86400)
    },
    formula: {
      curve:  CURVES.includes(s.formula?.curve) ? s.formula.curve : d.formula.curve,
      baseXp: num(s.formula?.baseXp, d.formula.baseXp, 1, 1000000),
      factor: num(s.formula?.factor, d.formula.factor, 1.01, 10)
    },
    maxLevel:   num(s.maxLevel, d.maxLevel, 0, 100000),
    multiplier: num(s.multiplier, d.multiplier, 0, 100),
    announce: {
      mode:      ANNOUNCE_MODES.includes(s.announce?.mode) ? s.announce.mode : d.announce.mode,
      channelId: /^\d{16,20}$/.test(s.announce?.channelId) ? s.announce.channelId : null,
      message:   typeof s.announce?.message === 'string' && s.announce.message.trim() ? s.announce.message.slice(0, 1000) : d.announce.message,
      card:      bool(s.announce?.card, d.announce.card)
    },
    roleRewards:          rewardList(s.roleRewards),
    stackRewards:         bool(s.stackRewards, d.stackRewards),
    removeRewardsOnReset: bool(s.removeRewardsOnReset, d.removeRewardsOnReset),
    noXpChannels:         idList(s.noXpChannels),
    noXpRoles:            idList(s.noXpRoles),
    channelBoosts:        boostList(s.channelBoosts),
    roleBoosts:           boostList(s.roleBoosts),
    leaderboard: {
      weeklyEnabled:  bool(s.leaderboard?.weeklyEnabled, d.leaderboard.weeklyEnabled),
      monthlyEnabled: bool(s.leaderboard?.monthlyEnabled, d.leaderboard.monthlyEnabled)
    },
    rankCard: {
      accent: typeof s.rankCard?.accent === 'string' && /^#[0-9a-fA-F]{6}$/.test(s.rankCard.accent) ? s.rankCard.accent : d.rankCard.accent
    }
  };
}

module.exports = { defaultConfig, mergeConfig, CURVES, ANNOUNCE_MODES };
