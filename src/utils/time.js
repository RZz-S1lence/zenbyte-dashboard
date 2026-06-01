const UNITS = { s: 1000, m: 60000, h: 3600000, d: 86400000, w: 604800000 };

// Parses "10m", "2h", "1d12h", "30" (bare = minutes) → milliseconds, or null.
function parseDuration(input) {
  if (input == null) return null;
  const str = String(input).trim().toLowerCase();
  if (/^\d+$/.test(str)) return parseInt(str, 10) * 60000;
  const re = /(\d+)\s*(s|m|h|d|w)/g;
  let ms = 0, match, found = false;
  while ((match = re.exec(str))) { ms += parseInt(match[1], 10) * UNITS[match[2]]; found = true; }
  return found ? ms : null;
}

function formatDuration(ms) {
  if (ms <= 0) return '0s';
  const parts = [];
  for (const [unit, val] of [['d', 86400000], ['h', 3600000], ['m', 60000], ['s', 1000]]) {
    const n = Math.floor(ms / val);
    if (n) { parts.push(`${n}${unit}`); ms -= n * val; }
  }
  return parts.join(' ');
}

module.exports = { parseDuration, formatDuration };
