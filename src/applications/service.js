const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, PermissionFlagsBits
} = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const { STATUS_META } = require('./config');

// action -> resulting status. 'note' records a comment without changing status.
const ACTION_STATUS = {
  accept: 'accepted',
  deny:   'denied',
  hold:   'hold',
  info:   'info_requested',
  note:   null
};

// status -> config key naming the channel the review entry is moved to on that
// decision. Statuses not listed here keep the entry in the review channel.
const STATUS_DEST_CHANNEL = {
  accepted: 'acceptedChannelId',
  denied:   'deniedChannelId'
};

const BUTTON_STYLE = {
  Primary:   ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success:   ButtonStyle.Success,
  Danger:    ButtonStyle.Danger
};

const ACTION_VERB = {
  accept: 'accepted', deny: 'denied', hold: 'put on hold',
  info: 'requested more information for', note: 'commented on'
};

// ── Permissions ───────────────────────────────────
// A reviewer is an Administrator, a Manage-Server user, or a member holding a
// configured reviewer role. Used for the Discord review buttons.
function canReview(member, config) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  return (config.reviewerRoleIds || []).some(rid => member.roles.cache.has(rid));
}

function canManageForms(member, config) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.Administrator)) return true;
  return (config.managerRoleIds || []).some(rid => member.roles.cache.has(rid));
}

// ── Embeds & components ───────────────────────────
function answerFields(app) {
  return (app.answers || []).slice(0, 25).map(a => ({
    name: String(a.label || 'Question').slice(0, 256),
    value: (String(a.value || '').trim() || '*No answer*').slice(0, 1024),
    inline: false
  }));
}

function buildReviewEmbed(app) {
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  return embeds.custom({
    title: `${meta.emoji} Application · ${app.formName}`.slice(0, 256),
    description: `**Applicant:** <@${app.userId}> (\`${app.userTag}\`)\n**Status:** ${meta.emoji} ${meta.label}\n**ID:** \`${app.id}\``,
    color: meta.color,
    fields: answerFields(app),
    footer: { text: `Application ${app.id}` },
    timestamp: new Date(app.createdAt)
  });
}

function buildReviewComponents(appId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`app:rv:accept:${appId}`).setLabel('Accept').setStyle(ButtonStyle.Success).setEmoji('✅'),
      new ButtonBuilder().setCustomId(`app:rv:deny:${appId}`).setLabel('Deny').setStyle(ButtonStyle.Danger).setEmoji('❌'),
      new ButtonBuilder().setCustomId(`app:rv:hold:${appId}`).setLabel('Hold').setStyle(ButtonStyle.Secondary).setEmoji('⏸️')
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`app:rv:info:${appId}`).setLabel('Request Info').setStyle(ButtonStyle.Primary).setEmoji('✉️'),
      new ButtonBuilder().setCustomId(`app:rv:note:${appId}`).setLabel('Add Note').setStyle(ButtonStyle.Secondary).setEmoji('📝')
    )
  ];
}

// ── Panel (the public "apply" entry point) ────────
// Builds the picker shown to applicants. With one enabled form it's a button
// (label/emoji/style from the panel config); with several it's a select menu.
function buildPicker(forms, panel = {}) {
  const enabled = (forms || []).filter(f => f.enabled);
  if (!enabled.length) return null;

  if (enabled.length === 1) {
    const f = enabled[0];
    const btn = new ButtonBuilder()
      .setCustomId(`app:start:${f.id}`)
      .setLabel((panel.buttonLabel || `Apply: ${f.name}`).slice(0, 80))
      .setStyle(BUTTON_STYLE[panel.buttonStyle] || ButtonStyle.Primary);
    if (panel.buttonEmoji) { try { btn.setEmoji(panel.buttonEmoji); } catch { /* invalid emoji — skip */ } }
    return { components: [new ActionRowBuilder().addComponents(btn)] };
  }

  const select = new StringSelectMenuBuilder()
    .setCustomId('app:pick')
    .setPlaceholder((panel.buttonLabel ? `${panel.buttonLabel}…` : 'Select an application to fill out').slice(0, 150))
    .addOptions(enabled.slice(0, 25).map(f => ({
      label: f.name.slice(0, 100),
      value: f.id,
      description: (f.description || '').slice(0, 100) || undefined
    })));
  return { components: [new ActionRowBuilder().addComponents(select)] };
}

function buildPanelEmbed(panel = {}) {
  return embeds.custom({
    title: (panel.title || '📝 Applications').slice(0, 256),
    description: (panel.description || 'Click below to start an application.').slice(0, 4000),
    color: (panel.color ?? embeds.COLORS.brand)
  });
}

// Posts (or edits in place) the live applications panel. Used by the dashboard
// "Post panel" button and the /applicationpanel command. Returns {ok, ...}.
async function publishPanel(client, guildId, channelId) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { ok: false, error: 'This server is unavailable right now.' };

  const config  = client.applications.getConfig(guildId);
  const targetId = channelId || config.panelChannelId;
  const channel = targetId && guild.channels.cache.get(targetId);
  if (!channel || typeof channel.send !== 'function')
    return { ok: false, error: 'Choose a valid text channel for the panel.' };

  const forms  = client.applications.listForms(guildId);
  const picker = buildPicker(forms, config.panel);
  if (!picker) return { ok: false, error: 'Create and enable at least one application form first.' };

  const payload = { embeds: [buildPanelEmbed(config.panel)], components: picker.components };

  // Edit the existing panel if it still lives in the same channel.
  let message = null;
  if (config.panelMessageId && config.panelChannelId === channel.id) {
    const existing = await channel.messages.fetch(config.panelMessageId).catch(() => null);
    if (existing) message = await existing.edit(payload).catch(() => null);
  }
  if (!message) {
    // Remove a stale panel from its previous location so there's only ever one.
    if (config.panelMessageId && config.panelChannelId) {
      const oldCh = guild.channels.cache.get(config.panelChannelId);
      if (oldCh) { const om = await oldCh.messages.fetch(config.panelMessageId).catch(() => null); if (om) await om.delete().catch(() => {}); }
    }
    message = await channel.send(payload).catch(e => { logger.error('publishPanel send failed:', e.message); return null; });
    if (!message) return { ok: false, error: 'I could not post in that channel — check my permissions.' };
  }

  client.applications.setConfig(guildId, { panelChannelId: channel.id, panelMessageId: message.id });
  return { ok: true, channelId: channel.id, messageId: message.id };
}

// ── Posting a new submission for staff review ─────
async function postReviewEntry(client, guild, app) {
  const config = client.applications.getConfig(guild.id);
  if (!config.reviewChannelId) return;
  const channel = guild.channels.cache.get(config.reviewChannelId);
  if (!channel) return;

  const ping = (config.notifyRoleIds || []).map(r => `<@&${r}>`).join(' ');
  const msg = await channel.send({
    content: ping || undefined,
    embeds: [buildReviewEmbed(app)],
    components: buildReviewComponents(app.id),
    allowedMentions: { roles: config.notifyRoleIds || [] }
  }).catch(e => { logger.error('Failed to post application review entry:', e.message); return null; });

  if (msg) client.applications.setReviewMessage(guild.id, app.id, channel.id, msg.id);
}

// ── The shared decision engine (Discord buttons + dashboard both call this) ──
// reviewer = { id, tag }. Returns the updated application, or null if not found.
async function applyDecision(client, { guildId, appId, action, note, reviewer }) {
  if (!(action in ACTION_STATUS)) return null;
  let app = client.applications.getApplication(guildId, appId);
  if (!app) return null;

  const newStatus = ACTION_STATUS[action];
  if (newStatus) app = client.applications.setApplicationStatus(guildId, appId, newStatus) || app;
  client.applications.addAction(appId, guildId, {
    reviewerId: reviewer?.id, reviewerTag: reviewer?.tag, action, note
  });
  app = client.applications.getApplication(guildId, appId) || app;

  const guild = client.guilds.cache.get(guildId);
  if (guild) {
    const config = client.applications.getConfig(guildId);

    // 1) Auto-assign / switch the applicant's status role (if configured).
    if (newStatus) await applyStatusRole(client, guild, app, config).catch(e => logger.error('Application status role failed:', e.message));

    // 2) Move the review entry to a dedicated channel for this decision, or
    //    just update it in place. Accepted/denied have their own channels.
    const destKey = newStatus ? STATUS_DEST_CHANNEL[newStatus] : null;
    const destId  = destKey ? config[destKey] : null;
    if (destId && destId !== app.reviewChannelId) await relocateReviewMessage(client, guild, app, destId).catch(() => {});
    else await updateReviewMessage(client, guild, app).catch(() => {});

    // 3) Notify the applicant, and log to the log channel — but only for actions
    //    without a dedicated channel, so accepted/denied don't double-post.
    if (newStatus) await notifyApplicant(client, guild, app, note).catch(() => {});
    if (!destId) await logDecision(client, guild, app, action, reviewer, note).catch(() => {});
  }
  return app;
}

// Grants the role configured for the application's current status and removes any
// other configured status roles, so the member's role always reflects the latest
// decision. A status with no role configured assigns nothing. Silently no-ops on
// missing member, missing role, or insufficient hierarchy/permissions.
async function applyStatusRole(client, guild, app, config) {
  const map = config.statusRoleIds || {};
  const managed = new Set(Object.values(map).filter(Boolean)); // every configured status role
  const targetRoleId = map[app.status] || null;
  if (!managed.size) return;

  const member = await guild.members.fetch(app.userId).catch(() => null);
  if (!member) return;
  const me = guild.members.me;
  if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return;

  const assignable = rid => {
    const role = guild.roles.cache.get(rid);
    return role && !role.managed && role.position < me.roles.highest.position;
  };

  for (const rid of managed) {
    if (rid === targetRoleId) continue;
    if (member.roles.cache.has(rid) && assignable(rid))
      await member.roles.remove(rid, 'Application status change').catch(() => {});
  }
  if (targetRoleId && !member.roles.cache.has(targetRoleId) && assignable(targetRoleId))
    await member.roles.add(targetRoleId, `Application ${app.status}`).catch(() => {});
}

async function updateReviewMessage(client, guild, app) {
  if (!app.reviewChannelId || !app.reviewMessageId) return;
  const channel = guild.channels.cache.get(app.reviewChannelId);
  if (!channel) return;
  const msg = await channel.messages.fetch(app.reviewMessageId).catch(() => null);
  if (msg) await msg.edit({ embeds: [buildReviewEmbed(app)], components: buildReviewComponents(app.id) }).catch(() => {});
}

// Re-posts the review entry in `destChannelId` and deletes the old one, so an
// accepted/denied application physically moves to its dedicated channel.
async function relocateReviewMessage(client, guild, app, destChannelId) {
  const dest = guild.channels.cache.get(destChannelId);
  if (!dest || typeof dest.send !== 'function') return updateReviewMessage(client, guild, app);

  const msg = await dest.send({
    embeds: [buildReviewEmbed(app)], components: buildReviewComponents(app.id)
  }).catch(e => { logger.error('Application relocate failed:', e.message); return null; });
  if (!msg) return updateReviewMessage(client, guild, app);

  if (app.reviewChannelId && app.reviewMessageId) {
    const oldCh = guild.channels.cache.get(app.reviewChannelId);
    if (oldCh) { const om = await oldCh.messages.fetch(app.reviewMessageId).catch(() => null); if (om) await om.delete().catch(() => {}); }
  }
  client.applications.setReviewMessage(guild.id, app.id, dest.id, msg.id);
  app.reviewChannelId = dest.id; app.reviewMessageId = msg.id;
}

async function notifyApplicant(client, guild, app, note) {
  const config = client.applications.getConfig(guild.id);
  if (!config.dmNotifications) return;
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  const user = await client.users.fetch(app.userId).catch(() => null);
  if (!user) return;
  const lines = [`Your **${app.formName}** application in **${guild.name}** is now **${meta.label}**.`];
  if (note) lines.push(`\n**Message from the staff team:**\n${String(note).slice(0, 1500)}`);
  await user.send({
    embeds: [embeds.custom({ title: `${meta.emoji} Application ${meta.label}`, description: lines.join('\n'), color: meta.color })]
  }).catch(() => { /* applicant has DMs closed — nothing we can do */ });
}

async function logDecision(client, guild, app, action, reviewer, note) {
  const config = client.applications.getConfig(guild.id);
  if (!config.logChannelId) return;
  const channel = guild.channels.cache.get(config.logChannelId);
  if (!channel) return;
  const meta = STATUS_META[app.status] || STATUS_META.pending;
  const fields = [
    { name: 'Applicant', value: `<@${app.userId}> (\`${app.userTag}\`)`, inline: true },
    { name: 'Form', value: app.formName, inline: true },
    { name: 'Reviewer', value: reviewer?.tag ? `${reviewer.tag}` : 'Unknown', inline: true }
  ];
  if (note) fields.push({ name: 'Note', value: String(note).slice(0, 1024), inline: false });
  await channel.send({
    embeds: [embeds.custom({
      title: `${meta.emoji} Application ${ACTION_VERB[action] || action}`,
      description: `Application \`${app.id}\` — now **${meta.label}**.`,
      color: meta.color, fields, timestamp: new Date()
    })]
  }).catch(() => {});
}

module.exports = {
  ACTION_STATUS, ACTION_VERB, canReview, canManageForms,
  buildReviewEmbed, buildReviewComponents, postReviewEntry,
  buildPicker, buildPanelEmbed, publishPanel,
  applyDecision, notifyApplicant
};
