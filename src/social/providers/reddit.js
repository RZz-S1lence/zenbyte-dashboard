const { fetchText } = require('../http');
const { decodeEntities } = require('../util');

// Reddit's JSON API rejects datacenter IPs, but the Atom RSS feeds are open.
// key format: "r/<sub>" for a subreddit, "u/<user>" for a user's submissions.
function parseTarget(input) {
  const s = input.trim().replace(/^https?:\/\/(www\.|old\.)?reddit\.com\//i, '').replace(/^\//, '');
  let m;
  if ((m = s.match(/^u(?:ser)?\/([\w-]+)/i))) return { type: 'u', name: m[1] };
  if ((m = s.match(/^r\/([\w-]+)/i))) return { type: 'r', name: m[1] };
  return { type: 'r', name: s.split('/')[0] };
}

const feedUrl = key => {
  const [type, name] = key.split('/');
  return type === 'u'
    ? `https://www.reddit.com/user/${name}/submitted/.rss`
    : `https://www.reddit.com/r/${name}/new/.rss`;
};

module.exports = {
  id: 'reddit',
  label: 'Reddit',
  kind: 'content',
  needsAuth: false,
  example: 'r/aww, u/spez, or a reddit URL',
  defaultTemplate: '📰 New post in **{name}**:\n{title}\n{url}',
  emoji: '🟠',
  isConfigured: () => true,

  async resolve(input) {
    const t = parseTarget(input);
    if (!t.name) return { error: 'Provide a subreddit (r/name) or user (u/name).' };
    const key = `${t.type}/${t.name}`;
    const res = await fetchText(feedUrl(key));
    if (!res.ok || !/<feed/i.test(res.body)) return { error: `Could not find ${key} on Reddit.` };
    return { key, name: key };
  },

  async fetch(key) {
    const res = await fetchText(feedUrl(key));
    if (!res.ok) return null;
    const entry = res.body.split('<entry>')[1];
    if (!entry) return { id: null };
    const id = entry.match(/<id>(.*?)<\/id>/)?.[1];
    if (!id) return { id: null };
    return {
      id,
      title: decodeEntities(entry.match(/<title>(.*?)<\/title>/)?.[1] || 'New post'),
      url: (entry.match(/<link[^>]*href="(.*?)"/)?.[1] || '').replace(/&amp;/g, '&'),
      author: decodeEntities(entry.match(/<author>\s*<name>(.*?)<\/name>/)?.[1] || ''),
      publishedAt: entry.match(/<published>(.*?)<\/published>/)?.[1] || null
    };
  }
};
