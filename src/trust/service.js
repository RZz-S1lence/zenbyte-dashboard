const { levelFromXp } = require('../leveling/formula');
const activitySvc = require('../activity/service');

// Computes a 0–100 trust score for a member by fusing account age, server tenure,
// activity, level, verification status and warning history.
function computeTrust(client, guild, member) {
  const cfg = client.trust.getConfig(guild.id);
  const now = Date.now();
  const userId = member.id;

  const ageDays    = (now - member.user.createdTimestamp) / 86400000;
  const tenureDays = member.joinedTimestamp ? (now - member.joinedTimestamp) / 86400000 : 0;
  const warnings   = client.store.warnings.get(guild.id)?.get(userId)?.length || 0;
  const activity   = activitySvc.activityOf(client, guild, userId).score;

  const lvlUser = client.levels.getUser(guild.id, userId);
  const lvlCfg  = client.levels.getConfig(guild.id);
  const level   = levelFromXp(lvlUser.xp, lvlCfg.formula, lvlCfg.maxLevel);

  const vcfg = client.store.getVerificationConfig(guild.id);
  const verified = vcfg.verifiedRoleId ? (member.roles.cache.has(vcfg.verifiedRoleId) ? 1 : 0) : 0;

  const norm = {
    accountAge: Math.min(1, ageDays / 365),
    tenure:     Math.min(1, tenureDays / 180),
    activity:   Math.min(1, activity / (cfg.caps.activity || 1)),
    level:      Math.min(1, level / (cfg.caps.level || 1)),
    verified
  };
  const w = cfg.weights;
  const positive    = w.accountAge * norm.accountAge + w.tenure * norm.tenure +
                      w.activity * norm.activity + w.level * norm.level + w.verified * norm.verified;
  const positiveMax = w.accountAge + w.tenure + w.activity + w.level + w.verified;

  let score = positiveMax > 0 ? (positive / positiveMax) * 100 : 0;
  score -= warnings * cfg.warningPenalty;
  score = Math.max(0, Math.min(100, Math.round(score)));

  const tier = [...cfg.tiers].sort((a, b) => b.min - a.min).find(t => score >= t.min) || cfg.tiers[0] || { name: 'Unrated' };

  return {
    score,
    tier: tier.name,
    breakdown: {
      accountAgeDays: Math.floor(ageDays),
      tenureDays:     Math.floor(tenureDays),
      activity,
      level,
      verified: !!verified,
      warnings
    }
  };
}

// Builds a trust leaderboard from members the bot has cached (those with data).
function leaderboard(client, guild) {
  const ids = new Set([
    ...(client.activity.guildUsers(guild.id)?.keys() || []),
    ...(client.levels.guildUsers(guild.id)?.keys() || []),
    ...(client.store.warnings.get(guild.id)?.keys() || [])
  ]);
  const out = [];
  for (const id of ids) {
    const member = guild.members.cache.get(id);
    if (!member || member.user.bot) continue;
    out.push({ userId: id, ...computeTrust(client, guild, member) });
  }
  return out.sort((a, b) => b.score - a.score);
}

module.exports = { computeTrust, leaderboard };
