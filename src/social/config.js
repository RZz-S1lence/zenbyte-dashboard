const { PROVIDERS } = require('./providers');

const MAX_CREATORS = 25;
const id = v => (typeof v === 'string' && /^\d{16,20}$/.test(v) ? v : null);

function defaultPlatform(provider) {
  return { enabled: false, channelId: null, mentionRoleId: null, template: provider.defaultTemplate, creators: [] };
}

function defaultConfig() {
  const platforms = {};
  for (const p of PROVIDERS) platforms[p.id] = defaultPlatform(p);
  return { platforms };
}

function mergeConfig(stored = {}) {
  const platforms = {};
  for (const p of PROVIDERS) {
    const s = stored?.platforms?.[p.id] || {};
    platforms[p.id] = {
      enabled: !!s.enabled,
      channelId: id(s.channelId),
      mentionRoleId: id(s.mentionRoleId),
      template: (typeof s.template === 'string' && s.template.trim()) ? s.template.slice(0, 500) : p.defaultTemplate,
      creators: Array.isArray(s.creators)
        ? s.creators
            .filter(c => c && typeof c.key === 'string' && c.key.trim())
            .slice(0, MAX_CREATORS)
            .map(c => ({ key: String(c.key).slice(0, 120), name: String(c.name || c.key).slice(0, 120) }))
        : []
    };
  }
  return { platforms };
}

module.exports = { defaultConfig, mergeConfig, MAX_CREATORS };
