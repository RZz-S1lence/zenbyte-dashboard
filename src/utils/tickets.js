const fs   = require('fs');
const path = require('path');

const TRANSCRIPT_DIR = path.join(__dirname, '..', '..', 'transcripts');
const PRIORITY_COLORS = { Low: 0x57f287, Medium: 0xfee75c, High: 0xed4245 };

// Returns the moderator role IDs for a ticket config, supporting both the new
// `modRoleIds` array and the legacy single `modRoleId` field.
function getModRoleIds(config = {}) {
  if (Array.isArray(config.modRoleIds)) return config.modRoleIds.filter(Boolean);
  if (config.modRoleId) return [config.modRoleId];
  return [];
}

// Keeps `modRoleIds` (canonical) and `modRoleId` (legacy mirror) consistent,
// and validates the optional priority→category routing config.
function normalizeTicketConfig(config = {}) {
  const ids = getModRoleIds(config);
  config.modRoleIds = ids;
  config.modRoleId  = ids[0] || null;

  const pc = config.priorityCategories || {};
  const validCat = v => (typeof v === 'string' && /^\d{16,20}$/.test(v)) ? v : null;
  config.priorityCategories = {
    enabled: !!pc.enabled,
    Low:     validCat(pc.Low),
    Medium:  validCat(pc.Medium),
    High:    validCat(pc.High)
  };

  const idArr = v => Array.isArray(v) ? [...new Set(v.filter(x => /^\d{16,20}$/.test(x)))] : [];
  config.openPingRoles = idArr(config.openPingRoles);
  const ppr = config.priorityPingRoles || {};
  config.priorityPingRoles = { Low: idArr(ppr.Low), Medium: idArr(ppr.Medium), High: idArr(ppr.High) };

  // Priority feature master switch (default on for backward compatibility).
  config.priorityEnabled = config.priorityEnabled !== false;

  // TicketsV2-style behavior options.
  config.maxTickets = Math.min(50, Math.max(1, parseInt(config.maxTickets, 10) || 1));
  config.nameScheme = (typeof config.nameScheme === 'string' && config.nameScheme.trim())
    ? config.nameScheme.trim().slice(0, 50) : 'ticket-{number}';
  config.welcomeMessage = (typeof config.welcomeMessage === 'string' && config.welcomeMessage.trim())
    ? config.welcomeMessage.slice(0, 1000) : null;
  const ac = config.autoClose || {};
  config.autoClose = {
    enabled:         !!ac.enabled,
    inactivityHours: Math.min(720, Math.max(0, parseInt(ac.inactivityHours, 10) || 0)),
    closeOnLeave:    !!ac.closeOnLeave
  };

  // Open form (modal questions asked when a ticket is created).
  const form = config.form || {};
  const styles = ['short', 'paragraph'];
  config.form = {
    enabled: !!form.enabled,
    fields: Array.isArray(form.fields)
      ? form.fields
          .filter(f => f && typeof f.label === 'string' && f.label.trim())
          .slice(0, 5)
          .map(f => ({
            label:       f.label.trim().slice(0, 45),
            placeholder: typeof f.placeholder === 'string' ? f.placeholder.slice(0, 100) : '',
            style:       styles.includes(f.style) ? f.style : 'short',
            required:    f.required !== false
          }))
      : []
  };

  return config;
}

// Fetches every message in a channel, oldest → newest (past the 100 limit).
async function fetchAllMessages(channel) {
  const all = [];
  let before = null;
  while (true) {
    const opts = { limit: 100 };
    if (before) opts.before = before;
    const batch = await channel.messages.fetch(opts);
    if (!batch.size) break;
    all.push(...batch.values());
    if (batch.size < 100) break;
    before = [...batch.values()].at(-1).id;
  }
  return all.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
}

function serializeMessages(messages) {
  return messages.map(m => ({
    id:           m.id,
    authorTag:    m.author.tag,
    authorId:     m.author.id,
    authorAvatar: m.author.displayAvatarURL({ size: 64 }),
    authorBot:    m.author.bot,
    content:      m.content || '',
    attachments:  [...m.attachments.values()].map(a => ({
      url: a.url, proxyUrl: a.proxyURL, name: a.name, size: a.size,
      contentType: a.contentType || null, width: a.width || null, height: a.height || null
    })),
    embeds: m.embeds.map(e => ({
      title: e.title || null, description: e.description || null, color: e.color || null,
      fields: e.fields?.map(f => ({ name: f.name, value: f.value, inline: f.inline })) || [],
      footer: e.footer?.text || null, image: e.image?.url || null, thumbnail: e.thumbnail?.url || null
    })),
    timestamp: m.createdTimestamp
  }));
}

// Saves a full JSON transcript (for the dashboard) and returns the path + serialized messages.
function saveJsonTranscript({ guild, channel, data, closer, messages }) {
  if (!fs.existsSync(TRANSCRIPT_DIR)) fs.mkdirSync(TRANSCRIPT_DIR, { recursive: true });
  const safeName = (data?.number || channel.name).replace(/[^a-z0-9-]/gi, '_');
  const id       = `${guild.id}-${safeName}`;
  const file     = path.join(TRANSCRIPT_DIR, `${id}.json`);

  const serialized = serializeMessages(messages);
  const transcript = {
    id, guildId: guild.id, guildName: guild.name, channelName: channel.name,
    number: data?.number || null, type: data?.type || 'Unknown', priority: data?.priority || 'Unknown',
    userId: data?.userId || null, claimedBy: data?.claimedBy || null,
    openedAt: data?.createdAt || null, closedAt: Date.now(),
    closedBy: { tag: closer.tag, id: closer.id },
    messages: serialized
  };
  fs.writeFileSync(file, JSON.stringify(transcript));
  return { file, serialized };
}

function buildTextTranscript({ channel, data, closer, messages }) {
  const lines = messages.map(m =>
    `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content || (m.attachments.size ? '[attachment]' : '[embed]')}`
  ).join('\n');
  return `Ticket: ${channel.name}\n` +
    `#${data?.number || '???'} | Type: ${data?.type || 'Unknown'} | Priority: ${data?.priority || 'Unknown'}\n` +
    `Closed by: ${closer.tag}\n${'─'.repeat(60)}\n\n${lines}`;
}

module.exports = {
  TRANSCRIPT_DIR,
  PRIORITY_COLORS,
  getModRoleIds,
  normalizeTicketConfig,
  fetchAllMessages,
  saveJsonTranscript,
  buildTextTranscript
};
