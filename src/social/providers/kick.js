const { fetchJson } = require('../http');

const slugOf = input => input.trim()
  .replace(/^https?:\/\/(www\.)?kick\.com\//i, '')
  .split(/[/?]/)[0]
  .toLowerCase();

async function channel(slug) {
  return fetchJson(`https://kick.com/api/v2/channels/${slug}`);
}

module.exports = {
  id: 'kick',
  label: 'Kick',
  kind: 'live',
  needsAuth: false,
  example: 'a Kick username or channel URL',
  defaultTemplate: '🔴 **{name}** is now live on Kick!\n{title}\n{url}',
  emoji: '🟢',
  isConfigured: () => true,

  async resolve(input) {
    const slug = slugOf(input);
    if (!slug) return { error: 'Provide a Kick username or channel URL.' };
    const res = await channel(slug);
    if (!res.ok || !res.body?.slug) return { error: 'Could not find that Kick channel (or Kick blocked the request).' };
    return { key: res.body.slug, name: res.body.user?.username || slug };
  },

  async fetch(key) {
    const res = await channel(key);
    if (!res.ok) return null;
    const ls = res.body?.livestream;
    if (!ls || ls.is_live === false) return { live: false };
    return {
      live: true,
      id: String(ls.id),
      title: ls.session_title || 'Live now',
      url: `https://kick.com/${key}`,
      viewers: ls.viewer_count,
      startedAt: ls.created_at || null
    };
  }
};
