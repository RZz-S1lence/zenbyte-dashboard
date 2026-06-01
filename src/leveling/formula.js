// XP required to advance FROM `level` to `level + 1`.
function xpForLevel(level, formula) {
  const { curve, baseXp, factor } = formula;
  if (curve === 'linear')      return Math.floor(baseXp * (level + 1));
  if (curve === 'exponential') return Math.floor(baseXp * Math.pow(factor, level));
  return 5 * level * level + 50 * level + 100; // mee6-style default
}

// Total cumulative XP required to reach `level` from 0.
function totalXpForLevel(level, formula) {
  let total = 0;
  for (let i = 0; i < level; i++) total += xpForLevel(i, formula);
  return total;
}

// Resolve a total-XP value into a level (respecting an optional cap).
function levelFromXp(totalXp, formula, maxLevel = 0) {
  let level = 0;
  let needed = xpForLevel(0, formula);
  let acc = 0;
  while (totalXp >= acc + needed) {
    acc += needed;
    level++;
    if (maxLevel > 0 && level >= maxLevel) return maxLevel;
    needed = xpForLevel(level, formula);
  }
  return level;
}

// Progress within the current level: { current, required } toward next level.
function levelProgress(totalXp, formula, maxLevel = 0) {
  const level = levelFromXp(totalXp, formula, maxLevel);
  const base = totalXpForLevel(level, formula);
  const required = xpForLevel(level, formula);
  return { level, current: totalXp - base, required };
}

module.exports = { xpForLevel, totalXpForLevel, levelFromXp, levelProgress };
