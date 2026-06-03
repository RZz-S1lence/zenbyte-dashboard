const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder,
  ModalBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const embeds  = require('../utils/embeds');
const logger  = require('../utils/logger');
const service = require('../applications/service');
const { CHOICE_TYPES } = require('../applications/config');

// In-memory submission sessions: "guildId:userId" -> session. Cleared on submit,
// pruned on a TTL so an abandoned form never lingers.
const sessions = new Map();
const SESSION_TTL = 15 * 60 * 1000;
const key = i => `${i.guildId}:${i.user.id}`;

function getSession(i) {
  const s = sessions.get(key(i));
  if (!s) return null;
  if (Date.now() - s.ts > SESSION_TTL) { sessions.delete(key(i)); return null; }
  return s;
}

// Group questions into "pages": consecutive text questions share a modal (max 5
// inputs each); every choice/dropdown question is its own select-menu page.
function buildPages(questions) {
  const pages = [];
  let textChunk = [];
  const flush = () => { if (textChunk.length) { pages.push({ kind: 'modal', questions: textChunk }); textChunk = []; } };
  for (const q of questions) {
    if (CHOICE_TYPES.includes(q.type)) { flush(); pages.push({ kind: 'select', questions: [q] }); }
    else { textChunk.push(q); if (textChunk.length === 5) flush(); }
  }
  flush();
  return pages;
}

// The picker (apply button / select menu) lives in the service so the dashboard
// and Discord build it identically. Re-exported below for the commands.
const { buildPicker } = service;

// ── Page rendering ────────────────────────────────
function buildModalPage(session, index) {
  const page = session.pages[index];
  const modal = new ModalBuilder().setCustomId(`app:modal:${index}`).setTitle(session.formName.slice(0, 45));
  for (const q of page.questions) {
    const input = new TextInputBuilder()
      .setCustomId(`q_${q.id}`)
      .setLabel(q.label.slice(0, 45))
      .setStyle(q.type === 'paragraph' ? TextInputStyle.Paragraph : TextInputStyle.Short)
      .setRequired(!!q.required)
      .setPlaceholder((q.placeholder || q.label).slice(0, 100));
    modal.addComponents(new ActionRowBuilder().addComponents(input));
  }
  return modal;
}

function buildSelectPage(session, index) {
  const q = session.pages[index].questions[0];
  const options = q.options.slice(0, 24).map((opt, i) => ({ label: opt.slice(0, 100), value: String(i) }));
  if (!q.required) options.push({ label: 'Skip (no answer)', value: 'skip' });
  const select = new StringSelectMenuBuilder()
    .setCustomId(`app:sel:${index}`)
    .setPlaceholder('Choose an option')
    .addOptions(options);
  return {
    embeds: [embeds.info(`**${q.label}**${q.required ? '' : '\n*(optional)*'}`)],
    components: [new ActionRowBuilder().addComponents(select)]
  };
}

// Replies to a fresh interaction (slash / modal submit) or replaces a component's
// message (button / select), so the same payload works from any entry point.
function respond(interaction, payload) {
  if (interaction.isChatInputCommand?.() || interaction.isModalSubmit?.())
    return interaction.reply({ ...payload, ephemeral: true });
  return interaction.update(payload);
}

// Shows the page at `index`. Modals must be the initial response, so this can only
// be called from a slash/button/select interaction (never a modal submit).
async function presentPage(interaction, session, index) {
  session.cursor = index;
  session.ts = Date.now();
  if (session.pages[index].kind === 'modal') return interaction.showModal(buildModalPage(session, index));
  return respond(interaction, buildSelectPage(session, index));
}

// Advances after page `index` was collected. Handles the one case where we can't
// chain modals (a modal submit followed by another modal) via a "Continue" button.
async function advance(interaction, session, index) {
  const next = index + 1;
  if (next >= session.pages.length) return finalize(interaction, session);

  session.cursor = next;
  session.ts = Date.now();
  const nextPage = session.pages[next];

  if (nextPage.kind === 'select') return respond(interaction, buildSelectPage(session, next));

  // next is a modal
  if (interaction.isModalSubmit()) {
    return interaction.reply({
      embeds: [embeds.success('Saved. Click **Continue** for the next questions.')],
      components: [new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`app:continue:${next}`).setLabel('Continue').setStyle(ButtonStyle.Primary)
      )],
      ephemeral: true
    });
  }
  return interaction.showModal(buildModalPage(session, next)); // from a select submit — allowed
}

async function finalize(interaction, session) {
  const client = interaction.client;
  const form = client.applications.getForm(interaction.guildId, session.formId);
  if (!form) {
    sessions.delete(key(interaction));
    return respond(interaction, { embeds: [embeds.error('This form no longer exists.')], components: [] });
  }

  const answers = form.questions.map(q => ({
    id: q.id, label: q.label, type: q.type,
    value: session.answers.get(q.id) || ''
  }));

  const app = client.applications.createApplication({
    guildId: interaction.guildId, form,
    userId: interaction.user.id, userTag: interaction.user.tag, answers
  });
  sessions.delete(key(interaction));

  const guild = client.guilds.cache.get(interaction.guildId);
  if (guild) await service.postReviewEntry(client, guild, app).catch(e => logger.error('postReviewEntry failed:', e.message));
  logger.info(`Application ${app.id} (${form.name}) submitted by ${interaction.user.tag} in ${guild?.name || interaction.guildId}.`);

  return respond(interaction, {
    embeds: [embeds.success(`Your **${form.name}** application has been submitted! The staff team will review it soon.`)],
    components: []
  });
}

// ── Entry: start a form ───────────────────────────
async function startFlow(interaction, formId) {
  const client = interaction.client;
  const form = client.applications.getForm(interaction.guildId, formId);
  if (!form || !form.enabled)
    return respond(interaction, { embeds: [embeds.error('That application form is not available.')], components: [] });

  const config = client.applications.getConfig(interaction.guildId);
  if (config.cooldownMinutes > 0) {
    const last = client.applications.lastSubmissionTime(interaction.guildId, interaction.user.id, form.id);
    const waitMs = config.cooldownMinutes * 60000 - (Date.now() - last);
    if (last && waitMs > 0)
      return respond(interaction, { embeds: [embeds.error(`You can re-apply for this form in **${Math.ceil(waitMs / 60000)} minute(s)**.`)], components: [] });
  }

  const pages = buildPages(form.questions);
  const session = { formId: form.id, formName: form.name, pages, cursor: 0, answers: new Map(), ts: Date.now() };
  sessions.set(key(interaction), session);

  if (!pages.length) return finalize(interaction, session);
  return presentPage(interaction, session, 0);
}

// ── Collectors ────────────────────────────────────
function collectModal(interaction, session, index) {
  for (const q of session.pages[index].questions) {
    const val = interaction.fields.getTextInputValue(`q_${q.id}`);
    session.answers.set(q.id, (val || '').trim());
  }
}

function collectSelect(interaction, session, index) {
  const q = session.pages[index].questions[0];
  const v = interaction.values[0];
  session.answers.set(q.id, v === 'skip' ? '' : (q.options[parseInt(v, 10)] || ''));
}

const expired = interaction =>
  respond(interaction, { embeds: [embeds.error('Your application session expired. Please start again with `/apply`.')], components: [] });

// ── Staff review ──────────────────────────────────
function reviewModal(action, appId) {
  const fieldLabel = { deny: 'Reason for denial', info: 'What information is needed?', note: 'Internal note' }[action] || 'Message';
  return new ModalBuilder()
    .setCustomId(`app:rvm:${action}:${appId}`)
    .setTitle({ deny: 'Deny Application', info: 'Request Information', note: 'Add Note' }[action] || 'Review')
    .addComponents(new ActionRowBuilder().addComponents(
      new TextInputBuilder().setCustomId('text').setLabel(fieldLabel.slice(0, 45))
        .setStyle(TextInputStyle.Paragraph).setRequired(action !== 'note').setMaxLength(1500)
    ));
}

async function onReviewButton(interaction, action, appId) {
  const client = interaction.client;
  const config = client.applications.getConfig(interaction.guildId);
  if (!service.canReview(interaction.member, config))
    return interaction.reply({ embeds: [embeds.error('You do not have permission to review applications.')], ephemeral: true });

  const app = client.applications.getApplication(interaction.guildId, appId);
  if (!app) return interaction.reply({ embeds: [embeds.error('That application no longer exists.')], ephemeral: true });

  // Deny / Request Info / Note collect text first.
  if (action === 'deny' || action === 'info' || action === 'note')
    return interaction.showModal(reviewModal(action, appId));

  // Accept / Hold are immediate.
  await interaction.deferUpdate();
  await service.applyDecision(client, {
    guildId: interaction.guildId, appId, action,
    reviewer: { id: interaction.user.id, tag: interaction.user.tag }
  });
  await interaction.followUp({ embeds: [embeds.success(`Application **${action === 'accept' ? 'accepted' : 'put on hold'}**.`)], ephemeral: true });
}

async function onReviewModal(interaction, action, appId) {
  const client = interaction.client;
  const config = client.applications.getConfig(interaction.guildId);
  if (!service.canReview(interaction.member, config))
    return interaction.reply({ embeds: [embeds.error('You do not have permission to review applications.')], ephemeral: true });

  await interaction.deferReply({ ephemeral: true });
  const note = (interaction.fields.getTextInputValue('text') || '').trim();
  const app = await service.applyDecision(client, {
    guildId: interaction.guildId, appId, action, note,
    reviewer: { id: interaction.user.id, tag: interaction.user.tag }
  });
  if (!app) return interaction.editReply({ embeds: [embeds.error('That application no longer exists.')] });
  await interaction.editReply({ embeds: [embeds.success(`Application **${service.ACTION_VERB[action] || action}**.`)] });
}

// ── Router ────────────────────────────────────────
async function route(interaction, client) {
  const [, sub, a, b] = interaction.customId.split(':');
  try {
    switch (sub) {
      case 'pick':     return startFlow(interaction, interaction.values[0]);
      case 'start':    return startFlow(interaction, a);
      case 'continue': {
        const s = getSession(interaction); if (!s) return expired(interaction);
        return presentPage(interaction, s, parseInt(a, 10));
      }
      case 'modal': {
        const s = getSession(interaction); if (!s) return expired(interaction);
        const idx = parseInt(a, 10);
        collectModal(interaction, s, idx);
        return advance(interaction, s, idx);
      }
      case 'sel': {
        const s = getSession(interaction); if (!s) return expired(interaction);
        const idx = parseInt(a, 10);
        collectSelect(interaction, s, idx);
        return advance(interaction, s, idx);
      }
      case 'rv':  return onReviewButton(interaction, a, b);
      case 'rvm': return onReviewModal(interaction, a, b);
    }
  } catch (err) {
    logger.error(`Application handler "${interaction.customId}" failed:`, err);
    const payload = { embeds: [embeds.error('Something went wrong with that application action.')], ephemeral: true };
    if (interaction.replied || interaction.deferred) await interaction.followUp(payload).catch(() => {});
    else if (!interaction.isModalSubmit() && interaction.isRepliable?.()) await interaction.reply(payload).catch(() => {});
  }
}

module.exports = { route, buildPicker };
