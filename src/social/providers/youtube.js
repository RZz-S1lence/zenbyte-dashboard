const { fetchText } = require('../http');
const { decodeEntities } = require('../util');

const CHANNEL_ID = /(UC[\w-]{22})/;

async function resolveChannelId(input) {
  const direct = input.match(CHANNEL_ID);
  if (direct) return direct[1];

  // Treat anything else as a handle or channel URL and read the ID off the page.
  let handle = input.trim();
  const urlPart = handle.match(/youtube\.com\/(@[\w.-]+|c\/[\w.-]+|user\/[\w.-]+)/i);
  if (urlPart) handle = urlPart[1];
  if (!handle.startsWith('@') && !handle.includes('/')) handle = '@' + handle;

  const res = await fetchText(`https://www.youtube.com/${handle}`);
  if (!res.ok) return null;
  return res.body.match(/"channelId":"(UC[\w-]{22})"/)?.[1]
      || res.body.match(/channel\/(UC[\w-]{22})/)?.[1]
      || null;
}

module.exports = {
  id: 'youtube',
  label: 'YouTube',
  kind: 'content',
  needsAuth: false,
  example: '@MrBeast, a channel URL, or a UC… channel ID',
  defaultTemplate: '📢 **{name}** just uploaded a new video!\n{url}',
  emoji: '▶️',
  isConfigured: () => true,

  async resolve(input) {
    const channelId = await resolveChannelId(input);
    if (!channelId) return { error: 'Could not find that YouTube channel. Try the channel URL or its UC… ID.' };
    const feed = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (!feed.ok) return { error: 'Found the channel but could not read its feed.' };
    const name = decodeEntities(feed.body.match(/<author>\s*<name>(.*?)<\/name>/)?.[1] || channelId);
    return { key: channelId, name };
  },

  async fetch(key) {
    const res = await fetchText(`https://www.youtube.com/feeds/videos.xml?channel_id=${key}`);
    if (!res.ok) return null;
    const entry = res.body.split('<entry>')[1];
    if (!entry) return { id: null };
    const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1];
    if (!videoId) return { id: null };
    return {
      id: videoId,
      title: decodeEntities(entry.match(/<title>(.*?)<\/title>/)?.[1] || 'New video'),
      url: `https://www.youtube.com/watch?v=${videoId}`,
      author: decodeEntities(res.body.match(/<author>\s*<name>(.*?)<\/name>/)?.[1] || ''),
      publishedAt: entry.match(/<published>(.*?)<\/published>/)?.[1] || null
    };
  }
};
