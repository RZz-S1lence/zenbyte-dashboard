const fs   = require('fs');
const path = require('path');
const crypto = require('crypto');

const TRANSCRIPT_DIR = path.join(__dirname, '..', '..', 'transcripts');
const PRIORITY_COLORS = { Low: 0x57f287, Medium: 0xfee75c, High: 0xed4245 };

const genTicketId = () => crypto.randomBytes(4).toString('hex');
const ID_RE = /^\d{16,20}$/;

// Normalizes a set of open-form modal fields (max 5, per Discord's modal limit).
function normalizeFormFields(fields) {
  const styles = ['short', 'paragraph'];
  return Array.isArray(fields)
    ? fields
        .filter(f => f && typeof f.label === 'string' && f.label.trim())
        .slice(0, 5)
        .map(f => ({
          label:       f.label.trim().slice(0, 45),
          placeholder: typeof f.placeholder === 'string' ? f.placeholder.slice(0, 100) : '',
          style:       styles.includes(f.style) ? f.style : 'short',
          required:    f.required !== false
        }))
    : [];
}

// A named, reusable open form (a set of modal questions) that a panel can point to.
function normalizeTicketForm(form = {}) {
  const f = form || {};
  return {
    id:     /^[0-9a-f]{8}$/.test(f.id || '') ? f.id : genTicketId(),
    name:   (typeof f.name === 'string' && f.name.trim()) ? f.name.trim().slice(0, 80) : 'Untitled form',
    fields: normalizeFormFields(f.fields)
  };
}

// Ticket types for a panel. Each type is { name, formId }, where formId picks the
// form shown when that type is chosen (null/empty = fall back to the panel's
// default form). Legacy data stored types as plain strings; those are coerced to
// objects with no per-type form so old panels keep working.
function normalizeTicketTypes(types) {
  if (!Array.isArray(types)) return [];
  return types
    .map(t => {
      if (typeof t === 'string') return { name: t.trim(), formId: null };
      if (t && typeof t === 'object' && typeof t.name === 'string')
        return { name: t.name.trim(), formId: (typeof t.formId === 'string' && t.formId) ? t.formId : null };
      return null;
    })
    .filter(t => t && t.name)
    .map(t => ({ name: t.name.slice(0, 100), formId: t.formId }))
    .slice(0, 25);
}

// Accepts only http(s) URLs (for embed image/thumbnail/icon fields), else null.
function safeUrl(v, max = 500) {
  return (typeof v === 'string' && /^https?:\/\//i.test(v.trim())) ? v.trim().slice(0, max) : null;
}

// A ticket panel: one published message with an "open" button. A panel has a
// default form (by id) plus a set of ticket types; each type may point to its own
// form, so opening "Support" can show a different form than "Bug". The branding
// fields (thumbnail/image/author/footer) are premium-only and only applied when
// the guild has active premium at publish time.
function normalizeTicketPanel(panel = {}) {
  const p = panel || {};
  return {
    id:          /^[0-9a-f]{8}$/.test(p.id || '') ? p.id : genTicketId(),
    name:        (typeof p.name === 'string' && p.name.trim()) ? p.name.trim().slice(0, 80) : 'Ticket panel',
    channelId:   ID_RE.test(p.channelId || '') ? p.channelId : null,
    messageId:   ID_RE.test(p.messageId || '') ? p.messageId : null,
    title:       (typeof p.title === 'string' && p.title.trim()) ? p.title.slice(0, 256) : null,
    description: (typeof p.description === 'string' && p.description.trim()) ? p.description.slice(0, 2000) : null,
    color:       /^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : null,
    buttonLabel: (typeof p.buttonLabel === 'string' && p.buttonLabel.trim()) ? p.buttonLabel.trim().slice(0, 60) : 'Create Ticket',
    formId:      (typeof p.formId === 'string' && p.formId) ? p.formId : null,  // null = no form (open immediately)
    thumbnailUrl: safeUrl(p.thumbnailUrl),
    imageUrl:     safeUrl(p.imageUrl),
    authorName:   (typeof p.authorName === 'string' && p.authorName.trim()) ? p.authorName.trim().slice(0, 256) : null,
    footerText:   (typeof p.footerText === 'string' && p.footerText.trim()) ? p.footerText.trim().slice(0, 2048) : null,
    types:       normalizeTicketTypes(p.types)
  };
}

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

  // Legacy single open form (modal questions asked when a ticket is created).
  // Kept for backward compatibility with the original /ticketsetup panel.
  const form = config.form || {};
  config.form = {
    enabled: !!form.enabled,
    fields:  normalizeFormFields(form.fields)
  };

  // Multi-panel model: named forms and panels that each select a form by id.
  config.forms  = Array.isArray(config.forms)  ? config.forms.map(normalizeTicketForm)   : [];
  config.panels = Array.isArray(config.panels) ? config.panels.map(normalizeTicketPanel) : [];

  // Drop dangling form references so a panel never points at a deleted form.
  const formIds = new Set(config.forms.map(f => f.id));
  for (const panel of config.panels)
    if (panel.formId && !formIds.has(panel.formId)) panel.formId = null;

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
  normalizeTicketForm,
  normalizeTicketPanel,
  normalizeFormFields,
  genTicketId,
  fetchAllMessages,
  saveJsonTranscript,
  buildTextTranscript
};
