// ── Live member counter types ─────────────────────
// Each counter renames a Discord channel to show a live count. Types that need the
// member list ('humans', 'bots', 'role') require the GuildMembers intent (enabled).
// 'online' is intentionally absent — it needs the GuildPresences privileged intent,
// which this bot does not request.
const COUNTER_TYPES = [
  { key: 'all',      label: 'All Members',  defaultTemplate: '👥 Members: {count}',  needsMembers: false, needsRole: false },
  { key: 'humans',   label: 'Humans',       defaultTemplate: '🧑 Humans: {count}',   needsMembers: true,  needsRole: false },
  { key: 'bots',     label: 'Bots',         defaultTemplate: '🤖 Bots: {count}',     needsMembers: true,  needsRole: false },
  { key: 'boosters', label: 'Boosters',     defaultTemplate: '🚀 Boosters: {count}', needsMembers: false, needsRole: false },
  { key: 'role',     label: 'Role Members', defaultTemplate: '📛 {role}: {count}',   needsMembers: true,  needsRole: true  },
  { key: 'channels', label: 'Channels',     defaultTemplate: '📚 Channels: {count}', needsMembers: false, needsRole: false },
  { key: 'roles',    label: 'Roles',        defaultTemplate: '🎭 Roles: {count}',    needsMembers: false, needsRole: false }
];

const TYPE_KEYS = COUNTER_TYPES.map(t => t.key);
const TYPE_META = Object.fromEntries(COUNTER_TYPES.map(t => [t.key, t]));

const idRe = /^\d{16,20}$/;
const id   = v => (typeof v === 'string' && idRe.test(v) ? v : null);
const str  = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Validates/normalises a counter from untrusted (dashboard) input. Returns a clean
// object (without ids/timestamps, which the store assigns) or null if unusable.
function sanitizeCounter(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const type = TYPE_KEYS.includes(raw.type) ? raw.type : null;
  if (!type) return null;
  const channelId = id(raw.channelId);
  if (!channelId) return null;

  const meta = TYPE_META[type];
  const roleId = meta.needsRole ? id(raw.roleId) : null;
  if (meta.needsRole && !roleId) return null; // a role counter without a role is meaningless

  return {
    type,
    channelId,
    roleId,
    template: str(raw.template, 100) || meta.defaultTemplate,
    enabled:  raw.enabled !== false
  };
}

module.exports = { COUNTER_TYPES, TYPE_KEYS, TYPE_META, sanitizeCounter };
