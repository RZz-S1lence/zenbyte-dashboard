// Heuristic "alt account" evaluation. Discord exposes no reliable cross-account
// identifier, so this flags accounts that look like throwaway alts: too young or
// without a custom avatar. Returns { flagged, reason }. Never a guarantee.
function evaluateAlt(user, config) {
  const checks = [];
  if (config.minAccountAgeDays > 0) {
    const ageDays = (Date.now() - user.createdTimestamp) / 86400000;
    if (ageDays < config.minAccountAgeDays)
      checks.push(`account is ${Math.floor(ageDays)}d old (minimum ${config.minAccountAgeDays}d)`);
  }
  if (config.requireAvatar && !user.avatar) checks.push('account has no profile picture');

  return { flagged: checks.length > 0, reason: checks.join('; ') };
}

module.exports = { evaluateAlt };
