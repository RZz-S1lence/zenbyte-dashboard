const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder, ChannelType,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const { isPremium } = require('../premium');
const {
  PRIORITY_COLORS, getModRoleIds, fetchAllMessages, saveJsonTranscript, buildTextTranscript
} = require('../utils/tickets');

// Pending form submissions: "guildId:userId" -> { type, panelId, ts }
const pendingForms = new Map();
const formKey = i => `${i.guildId}:${i.user.id}`;

function getConfig(client, guildId) {
  return client.store.tickets.get(guildId) || {};
}

// Resolves the panel (if any) and its ticket types when opening. A panel id selects
// a configured panel; with no panel id we fall back to the legacy single-config
// types so original /ticketsetup panels keep working. Types are always returned as
// { name, formId } objects (legacy string types are coerced).
function resolveContext(config, panelId) {
  if (panelId) {
    const panel = (config.panels || []).find(p => p.id === panelId);
    if (panel) return { panel, types: panel.types || [] };
  }
  const legacyTypes = (config.types || []).map(t =>
    typeof t === 'string' ? { name: t, formId: null } : t);
  return { panel: null, types: legacyTypes };
}

// Resolves the open-form fields to show for the selected type. A type's own form
// wins; otherwise we fall back to the panel's default form (or the legacy
// single-config form when there is no panel). Empty array = open immediately.
function fieldsForContext(config, ctx, typeName) {
  if (ctx.panel) {
    const t = (ctx.types || []).find(x => x.name === typeName);
    const formId = (t && t.formId) || ctx.panel.formId || null;
    const form = (config.forms || []).find(f => f.id === formId);
    return form ? (form.fields || []) : [];
  }
  return config.form?.enabled ? (config.form.fields || []) : [];
}

function buildFormModal(fields, panelId) {
  const modal = new ModalBuilder()
    .setCustomId(panelId ? `ticket:form:${panelId}` : 'ticket:form')
    .setTitle('Open a Ticket');
  fields.slice(0, 5).forEach((f, i) => {
    const input = new TextInputBuilder()
      .setCustomId(`f${i}`)
      .setLabel(f.label.slice(0, 45))
      .setStyle(f.style === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(!!f.required);
    if (f.placeholder) input.setPlaceholder(f.placeholder.slice(0, 100));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  });
  return modal;
}

function isTicketMod(config, member) {
  const roleIds = getModRoleIds(config);
  if (roleIds.some(id => member.roles.cache.has(id))) return true;
  return member.permissions.has('ManageMessages');
}

async function createPrompt(interaction, client, panelId = null) {
  const config = getConfig(client, interaction.guildId);
  const open = interaction.guild.channels.cache.filter(c => c.topic?.includes(`tkt-uid-${interaction.user.id}`));
  const max = config.maxTickets || 1;
  if (open.size >= max)
    return interaction.reply({ embeds: [embeds.error(max === 1
      ? `You already have an open ticket: ${open.first()}`
      : `You've reached the maximum of **${max}** open tickets.`)], ephemeral: true });

  const ctx = resolveContext(config, panelId);

  if (ctx.types.length) {
    const select = new StringSelectMenuBuilder()
      .setCustomId(panelId ? `ticket:type:${panelId}` : 'ticket:type')
      .setPlaceholder('What do you need help with?')
      .addOptions(ctx.types.slice(0, 25).map(t => ({ label: t.name.slice(0, 100), value: t.name.slice(0, 100) })));
    return interaction.reply({
      content: 'Please select a ticket type:',
      components: [new ActionRowBuilder().addComponents(select)],
      ephemeral: true
    });
  }

  const formFields = fieldsForContext(config, ctx, null);
  if (formFields.length) {
    pendingForms.set(formKey(interaction), { type: null, panelId: panelId || null, ts: Date.now() });
    return interaction.showModal(buildFormModal(formFields, panelId));
  }

  await createChannel(interaction, null, client);
}

async function typeSelect(interaction, client, panelId = null) {
  const config = getConfig(client, interaction.guildId);
  const type = interaction.values[0];
  const ctx = resolveContext(config, panelId);
  const formFields = fieldsForContext(config, ctx, type);
  if (formFields.length) {
    pendingForms.set(formKey(interaction), { type, panelId: panelId || null, ts: Date.now() });
    return interaction.showModal(buildFormModal(formFields, panelId));
  }
  await createChannel(interaction, type, client);
}

async function formSubmit(interaction, client, panelId = null) {
  const key = formKey(interaction);
  const pending = pendingForms.get(key);
  pendingForms.delete(key);

  const config = getConfig(client, interaction.guildId);
  const ctx = resolveContext(config, pending?.panelId ?? panelId);
  const formFields = fieldsForContext(config, ctx, pending?.type ?? null);
  const answers = formFields.slice(0, 5).map((f, i) => ({
    label: f.label,
    value: (interaction.fields.getTextInputValue(`f${i}`) || '').trim() || '*No answer*'
  }));
  await createChannel(interaction, pending?.type ?? null, client, answers);
}

// Posts (or refreshes) a panel's message in its channel with an open button that
// carries the panel id, so opening from it uses that panel's assigned form.
async function publishPanel(client, guildId, panel) {
  const guild = client.guilds.cache.get(guildId);
  if (!guild) return { error: 'Server not found.' };
  const channel = guild.channels.cache.get(panel.channelId);
  if (!channel || typeof channel.send !== 'function')
    return { error: 'Pick a valid text channel for this panel first.' };

  const config = getConfig(client, guildId);
  const color = panel.color ? parseInt(panel.color.replace('#', ''), 16)
    : (config.panelColor ? parseInt(config.panelColor.replace('#', ''), 16) : embeds.COLORS.brand);

  const embed = {
    title: panel.title || 'Support Tickets',
    description: panel.description || 'Need help? Use the button below to open a ticket.',
    color
  };

  // Custom branding (logo, banner, author, footer) is a premium perk. We check at
  // publish time so a downgraded guild's panels quietly drop back to the plain embed.
  if (await isPremium(guildId)) {
    if (panel.authorName)   embed.author    = { name: panel.authorName.slice(0, 256) };
    if (panel.thumbnailUrl) embed.thumbnail = { url: panel.thumbnailUrl };
    if (panel.imageUrl)     embed.image     = { url: panel.imageUrl };
    if (panel.footerText)   embed.footer    = { text: panel.footerText.slice(0, 2048) };
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`ticket:create:${panel.id}`)
      .setLabel((panel.buttonLabel || 'Create Ticket').slice(0, 60)).setStyle(ButtonStyle.Primary)
  );

  let message = null;
  if (panel.messageId) message = await channel.messages.fetch(panel.messageId).catch(() => null);
  if (message) await message.edit({ embeds: [embed], components: [row] }).catch(() => { message = null; });
  if (!message) message = await channel.send({ embeds: [embed], components: [row] }).catch(() => null);
  if (!message) return { error: 'I could not post the panel. Check that I can send messages in that channel.' };

  return { ok: true, messageId: message.id, channelId: channel.id };
}

// Dispatches every ticket component by action, parsing an optional panel id from
// the customId ("ticket:<action>[:<panelId>]").
async function route(interaction, client) {
  const [, action, arg] = interaction.customId.split(':');
  switch (action) {
    case 'create':          return createPrompt(interaction, client, arg || null);
    case 'type':            return typeSelect(interaction, client, arg || null);
    case 'form':            return formSubmit(interaction, client, arg || null);
    case 'claim':           return claim(interaction, client);
    case 'priority':        return openPriority(interaction, client);
    case 'priority_select': return prioritySelect(interaction, client);
    case 'close':           return closePrompt(interaction, client);
    case 'confirm_close':   return confirmClose(interaction, client);
    case 'cancel_close':    return cancelClose(interaction, client);
    default:                return;
  }
}

async function createChannel(interaction, type, client, answers = []) {
  const { guild, user } = interaction;
  const config = getConfig(client, guild.id);

  config.counter = (config.counter || 0) + 1;
  client.store.tickets.set(guild.id, config);
  client.store.saveTickets();

  const num  = String(config.counter).padStart(4, '0');
  const cleanName = s => String(s).toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  const channelName = (cleanName((config.nameScheme || 'ticket-{number}')
    .replace(/{number}/g, num)
    .replace(/{username}/g, user.username)
    .replace(/{type}/g, type || 'general')) || `ticket-${num}`).slice(0, 100);
  const modRoleIds = getModRoleIds(config);

  const permissionOverwrites = [
    { id: guild.id, deny: ['ViewChannel'] },
    { id: user.id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory', 'AttachFiles'] },
    { id: client.user.id, allow: ['ViewChannel', 'SendMessages', 'ManageChannels', 'ManageMessages'] },
    ...modRoleIds.map(id => ({ id, allow: ['ViewChannel', 'SendMessages', 'ReadMessageHistory'] }))
  ];

  const channel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: config.categoryId || null,
    topic: `tkt-uid-${user.id} | Type: ${type || 'General'} | #${num}`,
    permissionOverwrites
  });

  const color   = config.panelColor ? parseInt(config.panelColor.replace('#', ''), 16) : embeds.COLORS.brand;
  // Roles to ping on open: the configured open-ping roles, falling back to mod roles.
  const pingIds = config.openPingRoles?.length ? config.openPingRoles : modRoleIds;
  const modPing = pingIds.map(id => `<@&${id}>`).join(' ');

  const priorityOn = config.priorityEnabled !== false;
  const buttons = [
    new ButtonBuilder().setCustomId('ticket:close').setLabel('Close Ticket').setStyle(ButtonStyle.Danger).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket:claim').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('🙋')
  ];
  if (priorityOn)
    buttons.push(new ButtonBuilder().setCustomId('ticket:priority').setLabel('Set Priority').setStyle(ButtonStyle.Secondary).setEmoji('🚦'));
  const row = new ActionRowBuilder().addComponents(buttons);

  const welcome = (config.welcomeMessage || 'Hello {user}! Support will be with you shortly.')
    .replace(/{user}/g, `${user}`)
    .replace(/{username}/g, user.username)
    .replace(/{type}/g, type || 'General')
    .replace(/{number}/g, num);
  const descLines = [welcome, '', `**Type:** ${type || 'General'}`];
  if (priorityOn) descLines.push('**Priority:** 🟡 Medium');
  descLines.push('**Status:** 🟡 Open');

  const fields = [
    { name: 'Opened By', value: `${user} (\`${user.id}\`)`, inline: true },
    { name: 'Ticket Number', value: `\`#${num}\``, inline: true }
  ];
  for (const a of answers)
    fields.push({ name: a.label.slice(0, 256), value: a.value.slice(0, 1024), inline: false });

  const panel = await channel.send({
    content: `${user}${modPing ? ` ${modPing}` : ''}`,
    embeds: [{
      title: `🎫 Ticket #${num}${type ? ` · ${type}` : ''}`,
      description: descLines.join('\n'),
      color,
      fields,
      footer: { text: 'Use the buttons below to manage this ticket.' },
      timestamp: new Date()
    }],
    components: [row]
  });

  const guildTickets = client.store.openTickets.get(guild.id) || new Map();
  guildTickets.set(channel.id, { userId: user.id, type: type || 'General', priority: 'Medium', claimedBy: null, createdAt: Date.now(), lastActivity: Date.now(), number: num, messageId: panel.id });
  client.store.openTickets.set(guild.id, guildTickets);

  logger.info(`Ticket #${num} opened by ${user.tag} in ${guild.name}.`);

  const reply = { embeds: [embeds.success(`Ticket created: ${channel}`)], components: [] };
  if (interaction.isStringSelectMenu()) await interaction.update(reply);
  else await interaction.reply({ ...reply, ephemeral: true });
}

async function claim(interaction, client) {
  const config = getConfig(client, interaction.guildId);
  if (!isTicketMod(config, interaction.member))
    return interaction.reply({ embeds: [embeds.error('Only moderators can claim tickets.')], ephemeral: true });

  const data = client.store.openTickets.get(interaction.guildId)?.get(interaction.channel.id);
  if (data?.claimedBy === interaction.user.id)
    return interaction.reply({ embeds: [embeds.error('You already claimed this ticket.')], ephemeral: true });
  if (data) data.claimedBy = interaction.user.id;

  await interaction.channel.send({ embeds: [embeds.custom({ title: '🙋 Ticket Claimed', description: `Claimed by ${interaction.user}.`, color: embeds.COLORS.success })] });
  await interaction.reply({ embeds: [embeds.success('You claimed this ticket.')], ephemeral: true });
}

async function openPriority(interaction, client) {
  const config = getConfig(client, interaction.guildId);
  if (config.priorityEnabled === false)
    return interaction.reply({ embeds: [embeds.error('The priority system is disabled on this server.')], ephemeral: true });
  if (!isTicketMod(config, interaction.member))
    return interaction.reply({ embeds: [embeds.error('Only moderators can change priority.')], ephemeral: true });

  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket:priority_select')
    .setPlaceholder('Select priority level')
    .addOptions(
      { label: '🟢 Low', value: 'Low', description: 'No rush' },
      { label: '🟡 Medium', value: 'Medium', description: 'Normal priority' },
      { label: '🔴 High', value: 'High', description: 'Urgent' }
    );
  await interaction.reply({ content: '🚦 Select a priority level:', components: [new ActionRowBuilder().addComponents(select)], ephemeral: true });
}

const PRIORITY_EMOJI = { Low: '🟢', Medium: '🟡', High: '🔴' };

async function prioritySelect(interaction, client) {
  const priority = interaction.values[0];
  const config = getConfig(client, interaction.guildId);
  const data = client.store.openTickets.get(interaction.guildId)?.get(interaction.channel.id);
  if (data) data.priority = priority;

  const color = PRIORITY_COLORS[priority] ?? embeds.COLORS.brand;
  const label = `${PRIORITY_EMOJI[priority] || ''} ${priority}`.trim();

  // Optionally move the ticket into the category configured for this priority.
  const targetCat = config.priorityCategories?.enabled ? config.priorityCategories[priority] : null;
  if (targetCat && interaction.channel.parentId !== targetCat) {
    try { await interaction.channel.setParent(targetCat, { lockPermissions: false }); }
    catch (e) { logger.error('Failed to move ticket to priority category:', e.message); }
  }

  // Optionally ping configured roles when this priority is set.
  const pingRoles = config.priorityPingRoles?.[priority] || [];
  if (pingRoles.length) {
    await interaction.channel.send({
      content: `🔔 ${pingRoles.map(id => `<@&${id}>`).join(' ')}, priority set to **${label}**.`,
      allowedMentions: { roles: pingRoles }
    }).catch(() => {});
  }

  // Locate the original ticket panel (by stored id, else by scanning recent messages).
  let panel = null;
  try {
    if (data?.messageId) panel = await interaction.channel.messages.fetch(data.messageId).catch(() => null);
    if (!panel) {
      const recent = await interaction.channel.messages.fetch({ limit: 25 }).catch(() => null);
      panel = recent?.find(m => m.author.id === client.user.id && m.embeds[0]?.title?.startsWith('🎫 Ticket')) || null;
    }
    if (panel?.embeds[0]) {
      const json = panel.embeds[0].toJSON();
      json.color = color;
      if (json.description && /\*\*Priority:\*\*/.test(json.description))
        json.description = json.description.replace(/\*\*Priority:\*\*.*/, `**Priority:** ${label}`);
      await panel.edit({ embeds: [json] });
    }
  } catch (e) {
    logger.error('Failed to update ticket priority embed:', e.message);
  }

  await interaction.update({ embeds: [embeds.success(`Priority set to **${label}**.`)], content: null, components: [] });
}

async function closePrompt(interaction) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket:confirm_close').setLabel('Confirm Close').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('ticket:cancel_close').setLabel('Cancel').setStyle(ButtonStyle.Secondary)
  );
  await interaction.reply({ embeds: [embeds.warn('Are you sure you want to close this ticket?')], components: [row], ephemeral: true });
}

async function cancelClose(interaction) {
  await interaction.update({ embeds: [embeds.error('Cancelled.')], components: [] });
}

async function confirmClose(interaction, client) {
  await interaction.reply({ embeds: [embeds.info('🔒 Saving transcript and closing in 5 seconds...')], ephemeral: true });
  const channel = interaction.channel;
  setTimeout(() => closeTicket(client, channel, interaction.user, 'Closed via button').catch(() => {}), 5000);
}

// Shared close routine, used by the close button, auto-close and close-on-leave.
async function closeTicket(client, channel, closer, reason = 'Closed') {
  const guild = channel.guild;
  const config = getConfig(client, guild.id);
  const guildTickets = client.store.openTickets.get(guild.id);
  const data = guildTickets?.get(channel.id);
  if (guildTickets?.has(channel.id)) guildTickets.delete(channel.id);

  const messages = await fetchAllMessages(channel);
  saveJsonTranscript({ guild, channel, data, closer, messages });

  if (config.logChannelId) {
    const logCh = guild.channels.cache.get(config.logChannelId);
    if (logCh) {
      const fs = require('fs');
      const path = require('path');
      const { TRANSCRIPT_DIR } = require('../utils/tickets');
      const fp = path.join(TRANSCRIPT_DIR, `${channel.name}.txt`);
      fs.writeFileSync(fp, buildTextTranscript({ channel, data, closer, messages }));
      await logCh.send({
        embeds: [embeds.custom({
          title: `🔒 Ticket Closed · #${data?.number || channel.name}`,
          color: embeds.COLORS.error,
          fields: [
            { name: 'Closed By', value: closer?.tag || 'System', inline: true },
            { name: 'Reason', value: reason, inline: true },
            { name: 'Type', value: data?.type || 'Unknown', inline: true },
            { name: 'Priority', value: data?.priority || 'Unknown', inline: true },
            { name: 'Claimed By', value: data?.claimedBy ? `<@${data.claimedBy}>` : 'Unclaimed', inline: true },
            { name: 'Messages', value: String(messages.length), inline: true }
          ],
          footer: { text: 'Full transcript attached. View in the dashboard for images.' }
        })],
        files: [fp]
      });
      fs.unlinkSync(fp);
    }
  }

  logger.info(`Ticket #${data?.number || channel.name} closed (${reason}) by ${closer?.tag || 'system'}.`);
  await channel.delete().catch(() => {});
}

// Periodic sweep that closes tickets with no activity for the configured window.
async function autoCloseSweep(client) {
  for (const [guildId, tickets] of client.store.openTickets) {
    const config = getConfig(client, guildId);
    if (!config.autoClose?.enabled || !config.autoClose.inactivityHours) continue;
    const cutoff = config.autoClose.inactivityHours * 3600000;
    for (const [channelId, data] of [...tickets]) {
      const last = data.lastActivity || data.createdAt || 0;
      if (Date.now() - last < cutoff) continue;
      const channel = client.channels.cache.get(channelId);
      if (channel) await closeTicket(client, channel, null, `Auto-closed after ${config.autoClose.inactivityHours}h of inactivity`).catch(() => {});
      else tickets.delete(channelId);
    }
  }
}

// Closes a member's open tickets when they leave (if enabled).
async function handleMemberLeave(client, member) {
  const config = getConfig(client, member.guild.id);
  if (!config.autoClose?.closeOnLeave) return;
  const tickets = client.store.openTickets.get(member.guild.id);
  if (!tickets) return;
  for (const [channelId, data] of [...tickets]) {
    if (data.userId !== member.id) continue;
    const channel = member.guild.channels.cache.get(channelId);
    if (channel) await closeTicket(client, channel, null, 'Ticket opener left the server').catch(() => {});
    else tickets.delete(channelId);
  }
}

module.exports = {
  createPrompt, typeSelect, formSubmit, claim, openPriority, prioritySelect,
  closePrompt, cancelClose, confirmClose, closeTicket, autoCloseSweep, handleMemberLeave,
  publishPanel, route
};
