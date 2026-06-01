const { PROVIDERS, BY_ID } = require('./providers');
const logger = require('../utils/logger');

const CONCURRENCY = 4;
const stateKey = (pid, key) => `${pid}:${key}`;

function renderTemplate(template, vars) {
  return template.replace(/\{(name|title|url|platform)\}/g, (_, k) => vars[k] ?? '');
}

// Builds the set of unique (platform, creator) feeds to poll, each with the list
// of guilds subscribed to it, so a creator followed in 100 servers is fetched once.
function buildSubscriptions(client) {
  const subs = new Map();
  for (const [guildId, config] of client.social.configs) {
    for (const provider of PROVIDERS) {
      const pc = config.platforms[provider.id];
      if (!pc?.enabled || !pc.channelId || !pc.creators.length) continue;
      if (provider.needsAuth && !provider.isConfigured()) continue;
      for (const creator of pc.creators) {
        const id = stateKey(provider.id, creator.key);
        if (!subs.has(id)) subs.set(id, { provider, key: creator.key, targets: [] });
        subs.get(id).targets.push({ guildId, platformCfg: pc, name: creator.name });
      }
    }
  }
  return subs;
}

async function deliver(client, provider, target, event) {
  const channel = await client.channels.fetch(target.platformCfg.channelId).catch(() => null);
  if (!channel?.isTextBased?.()) return;
  const text = renderTemplate(target.platformCfg.template, {
    name: target.name, title: event.title || '', url: event.url || '', platform: provider.label
  });
  const mention = target.platformCfg.mentionRoleId ? `<@&${target.platformCfg.mentionRoleId}> ` : '';
  await channel.send({
    content: (mention + text).slice(0, 1900),
    allowedMentions: { parse: ['roles', 'everyone'] }
  }).catch(() => {});
}

async function processFeed(client, entry) {
  const { provider, key, targets } = entry;
  const sk = stateKey(provider.id, key);
  const prev = client.social.getState(sk) || {};

  const result = await provider.fetch(key);
  if (!result) return; // network error, leave state untouched, try again next sweep

  if (provider.kind === 'content') {
    if (!result.id) return;
    if (!prev.lastId) { client.social.setState(sk, { lastId: result.id }); return; } // baseline, no backlog spam
    if (result.id === prev.lastId) return;
    client.social.setState(sk, { lastId: result.id });
    for (const t of targets) await deliver(client, provider, t, result);
    logger.debug(`Social: ${provider.id} ${key} → new post to ${targets.length} guild(s).`);
  } else {
    const wasLive = !!prev.live;
    const nowLive = !!result.live;
    if (nowLive && (!wasLive || prev.id !== result.id)) {
      client.social.setState(sk, { live: true, id: result.id });
      for (const t of targets) await deliver(client, provider, t, result);
      logger.debug(`Social: ${provider.id} ${key} went live → ${targets.length} guild(s).`);
    } else if (!nowLive && wasLive) {
      client.social.setState(sk, { live: false });
    } else if (prev.live === undefined) {
      client.social.setState(sk, { live: nowLive, id: result.id });
    }
  }
}

async function pool(items, size, fn) {
  const queue = [...items];
  const run = async () => { while (queue.length) { try { await fn(queue.shift()); } catch (e) { logger.debug('Social feed error:', e.message); } } };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
}

async function sweep(client) {
  const subs = buildSubscriptions(client);
  if (!subs.size) return;
  await pool([...subs.values()], CONCURRENCY, entry => processFeed(client, entry));
  client.social.flush();
}

// Adds a creator to a guild's platform config, recording a baseline so the
// current latest item / live state is not announced retroactively.
async function addCreator(client, guildId, platformId, account) {
  const provider = BY_ID[platformId];
  if (!provider) return { error: 'Unknown platform.' };

  const resolved = await provider.resolve(account);
  if (resolved.error) return { error: resolved.error };

  const config = client.social.getConfig(guildId);
  const pc = config.platforms[platformId];
  if (pc.creators.some(c => c.key === resolved.key))
    return { error: `**${resolved.name}** is already on the list.` };
  if (pc.creators.length >= 25) return { error: 'You can follow at most 25 accounts per platform.' };

  pc.creators.push({ key: resolved.key, name: resolved.name });
  client.social.setConfig(guildId, config);

  // Baseline the feed state (best effort) so the next sweep only sees new items.
  const sk = stateKey(platformId, resolved.key);
  if (!client.social.getState(sk)) {
    const result = await provider.fetch(resolved.key).catch(() => null);
    if (result) client.social.setState(sk, provider.kind === 'content' ? { lastId: result.id } : { live: !!result.live, id: result.id });
  }
  return { name: resolved.name, key: resolved.key };
}

function removeCreator(client, guildId, platformId, key) {
  const config = client.social.getConfig(guildId);
  const pc = config.platforms[platformId];
  if (!pc) return false;
  const before = pc.creators.length;
  pc.creators = pc.creators.filter(c => c.key !== key && c.name !== key);
  if (pc.creators.length === before) return false;
  client.social.setConfig(guildId, config);
  return true;
}

async function sendTest(client, guild, platformId) {
  const provider = BY_ID[platformId];
  if (!provider) return { error: 'Unknown platform.' };
  const pc = client.social.getConfig(guild.id).platforms[platformId];
  if (!pc.channelId) return { error: 'Set a notification channel for this platform first.' };
  await deliver(client, provider, { platformCfg: pc, name: 'Example Creator' }, {
    title: `This is a test ${provider.kind === 'live' ? 'live' : 'post'} notification.`,
    url: 'https://example.com'
  });
  return { ok: true };
}

module.exports = {
  sweep, addCreator, removeCreator, sendTest, renderTemplate, buildSubscriptions
};
