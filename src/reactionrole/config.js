// Reaction-role behaviour modes.
const MODES = [
  { value: 'normal',   label: 'Normal — gain the role on react, lose it on unreact' },
  { value: 'unique',   label: 'Unique — only one role from this panel at a time' },
  { value: 'verify',   label: 'Verify — react to gain the role; it is never removed' },
  { value: 'reversed', label: 'Reversed — react to remove the role, unreact to gain it' }
];
const MODE_VALUES = MODES.map(m => m.value);

const DEFAULT_COLOR = '#5865F2';

// Parses an emoji from user input. Accepts a unicode emoji ("👍") or a custom
// emoji mention ("<:name:123>" / "<a:name:123>"). Returns null if blank.
function parseEmoji(input) {
  if (!input || typeof input !== 'string') return null;
  const s = input.trim();
  if (!s) return null;
  const custom = s.match(/^<(a)?:([\w~]+):(\d{16,20})>$/);
  if (custom) {
    const animated = !!custom[1];
    const name = custom[2];
    const id = custom[3];
    return { emoji: `<${animated ? 'a' : ''}:${name}:${id}>`, id, name, animated };
  }
  // Treat anything else as a single unicode emoji / string.
  return { emoji: s, id: null, name: s, animated: false };
}

// What discord.js needs to call message.react() with.
function reactArg(mapping) {
  return mapping.id || mapping.name;
}

// Does a live reaction's emoji match a stored mapping?
function emojiMatches(mapping, emoji) {
  return mapping.id ? mapping.id === emoji.id : (!emoji.id && mapping.name === emoji.name);
}

function normalizeMapping(m = {}) {
  if (!m || !/^\d{16,20}$/.test(m.roleId || '')) return null;
  const id = /^\d{16,20}$/.test(m.id || '') ? m.id : null;
  const name = typeof m.name === 'string' && m.name ? m.name : (typeof m.emoji === 'string' ? m.emoji : null);
  if (!id && !name) return null;
  return {
    emoji:    typeof m.emoji === 'string' && m.emoji ? m.emoji : (id ? `<:e:${id}>` : name),
    id,
    name,
    animated: !!m.animated,
    roleId:   m.roleId
  };
}

module.exports = { MODES, MODE_VALUES, DEFAULT_COLOR, parseEmoji, reactArg, emojiMatches, normalizeMapping };
