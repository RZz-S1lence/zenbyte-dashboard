const {
  ActionRowBuilder, ButtonBuilder, ButtonStyle,
  StringSelectMenuBuilder, PermissionFlagsBits,
  ModalBuilder, LabelBuilder, TextInputBuilder, TextInputStyle
} = require('discord.js');
const { parseDuration } = require('../utils/time');
const logger = require('../utils/logger');

const NUM_EMOJI = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
const BAR_LEN = 12;
const EDIT_THROTTLE_MS = 2500;

// Trailing-throttle of message edits per poll so heavy voting can't rate-limit us.
const editTimers = new Map(); // pollKey -> timeout

function optionEmoji(i) { return i < NUM_EMOJI.length ? NUM_EMOJI[i] : null; }

function bar(pct) {
  const filled = Math.max(0, Math.min(BAR_LEN, Math.round((pct / 100) * BAR_LEN)));
  return '▰'.repeat(filled) + '▱'.repeat(BAR_LEN - filled);
}

function canManagePolls(member, config, store) {
  if (!member) return false;
  if (member.permissions.has(PermissionFlagsBits.ManageMessages) ||
      member.permissions.has(PermissionFlagsBits.ManageGuild) ||
      member.permissions.has(PermissionFlagsBits.Administrator)) return true;
  if (config?.creatorRoleIds?.some(r => member.roles.cache.has(r))) return true;
  return store?.isModerator?.(member.guild.id, member) || false;
}

// "Question | Option A | Option B" plus inline --flags. Returns parsed fields or { error }.
function parseSetup(text, config) {
  if (!text) return { error: 'Provide a question and options, e.g. `Favourite colour? | Red | Blue | Green`.' };

  const flags = { multi: false, maxChoices: 0, anonymous: false, hideResults: false, durationMs: 0, scheduleMs: 0 };
  let body = text;

  const grab = (re, fn) => { const m = body.match(re); if (m) { fn(m); body = body.replace(m[0], ' '); } };
  grab(/--multi(?:=(\d+))?/i, m => { flags.multi = true; flags.maxChoices = m[1] ? parseInt(m[1], 10) : 0; });
  grab(/--anon\b/i, () => flags.anonymous = true);
  grab(/--hide\b/i, () => flags.hideResults = true);
  grab(/--time\s+(\S+)/i, m => flags.durationMs = parseDuration(m[1]) || 0);
  grab(/--schedule\s+(\S+)/i, m => flags.scheduleMs = parseDuration(m[1]) || 0);

  const parts = body.split('|').map(s => s.trim()).filter(Boolean);
  const question = parts.shift();
  if (!question) return { error: 'Missing the poll question.' };
  if (parts.length < 2) return { error: 'A poll needs at least two options. Separate them with `|`.' };
  if (parts.length > config.maxOptions) return { error: `This server allows at most ${config.maxOptions} options.` };

  return {
    question: question.slice(0, 256),
    options: parts.map(p => p.slice(0, 100)),
    multi: flags.multi,
    maxChoices: flags.multi ? (flags.maxChoices || parts.length) : 1,
    anonymous: flags.anonymous,
    hideResults: flags.hideResults,
    durationMs: flags.durationMs,
    scheduleMs: flags.scheduleMs
  };
}

// The /poll create form. Options go in one box (one per line) since modals can't
// add fields dynamically; the multiple/anonymous choices are yes-no dropdowns.
function buildCreateModal() {
  const yesNo = (id, no, yes) => new StringSelectMenuBuilder().setCustomId(id)
    .addOptions({ label: no, value: 'no', default: true }, { label: yes, value: 'yes' });

  return new ModalBuilder().setCustomId('poll:createmodal').setTitle('Create a Poll').addLabelComponents(
    new LabelBuilder().setLabel('Question').setTextInputComponent(
      new TextInputBuilder().setCustomId('q').setStyle(TextInputStyle.Short).setMaxLength(256).setRequired(true)),
    new LabelBuilder().setLabel('Answer options (one per line, 2–25)').setTextInputComponent(
      new TextInputBuilder().setCustomId('opts').setStyle(TextInputStyle.Paragraph).setPlaceholder('Red\nBlue\nGreen').setRequired(true)),
    new LabelBuilder().setLabel('How long should it run?').setTextInputComponent(
      new TextInputBuilder().setCustomId('time').setStyle(TextInputStyle.Short).setPlaceholder('e.g. 30m, 2h, 1d, or leave blank for no limit').setRequired(false)),
    new LabelBuilder().setLabel('Allow multiple answers?').setStringSelectMenuComponent(
      yesNo('multi', 'No, single choice', 'Yes, multiple choice')),
    new LabelBuilder().setLabel('Anonymous votes?').setStringSelectMenuComponent(
      yesNo('anon', 'No, votes are visible', 'Yes, anonymous'))
  );
}

// Parses the modal submission into createPoll arguments, or returns { error }.
function parseModalSubmit(fields, config) {
  const picked = id => { try { return (fields.getStringSelectValues(id) || [])[0] === 'yes'; } catch { return false; } };
  const question = fields.getTextInputValue('q').trim().slice(0, 256);
  const options = fields.getTextInputValue('opts').split('\n').map(s => s.trim()).filter(Boolean).map(s => s.slice(0, 100));
  if (!question) return { error: 'Missing the poll question.' };
  if (options.length < 2) return { error: 'Add at least two options, one per line.' };
  if (options.length > config.maxOptions) return { error: `This server allows at most ${config.maxOptions} options.` };

  let durationMs = parseDuration(fields.getTextInputValue('time')) || 0;
  if (!durationMs && config.defaultDurationMin) durationMs = config.defaultDurationMin * 60000;

  return { question, options, multi: picked('multi'), anonymous: picked('anon'), durationMs };
}

function countsOf(poll) {
  const counts = new Array(poll.options.length).fill(0);
  let voters = 0;
  for (const choices of Object.values(poll.votes || {})) {
    voters++;
    for (const idx of choices) if (counts[idx] !== undefined) counts[idx]++;
  }
  return { counts, voters, totalVotes: counts.reduce((a, b) => a + b, 0) };
}

function statusLine(poll) {
  if (poll.status === 'cancelled') return '🚫 Cancelled';
  if (poll.status === 'ended') return '🔒 Ended';
  if (poll.status === 'scheduled') return `🕒 Opens <t:${Math.floor(poll.scheduledFor / 1000)}:R>`;
  if (poll.endsAt) return `⏳ Ends <t:${Math.floor(poll.endsAt / 1000)}:R>`;
  return '🟢 Open';
}

function buildPollEmbed(poll) {
  const { counts, voters, totalVotes } = countsOf(poll);
  const hide = poll.hideResults && poll.status === 'active';
  const denom = poll.multi ? (totalVotes || 1) : (voters || 1);

  const lines = poll.options.map((opt, i) => {
    const emoji = optionEmoji(i) || '•';
    if (hide) return `${emoji} ${opt.label}`;
    const pct = Math.round((counts[i] / denom) * 100);
    return `${emoji} **${opt.label}**\n\`${bar(pct)}\` ${pct}% · ${counts[i]} vote${counts[i] === 1 ? '' : 's'}`;
  });

  const tags = [
    poll.multi ? `Multiple choice${poll.maxChoices < poll.options.length ? ` (pick ${poll.maxChoices})` : ''}` : 'Single choice',
    poll.anonymous ? 'Anonymous' : null,
    hide ? 'Results hidden' : null
  ].filter(Boolean);

  const color = poll.status === 'cancelled' ? 0xed4245 : poll.status === 'ended' ? 0x99aab5 : 0x5865f2;
  return {
    title: `📊 ${poll.question}`,
    description: lines.join('\n\n') + (hide ? '\n\n🔒 Results are hidden until the poll ends.' : ''),
    color,
    fields: [{ name: '​', value: `${statusLine(poll)} · 🗳️ ${voters} voter${voters === 1 ? '' : 's'}` }],
    footer: { text: `Poll ID: ${poll.id}${poll.anonymous ? '' : ' · votes are visible to organisers'}` },
    timestamp: new Date(poll.createdAt)
  };
}

function buildComponents(poll) {
  if (poll.status !== 'active') {
    return [new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`poll:results:${poll.id}`).setLabel('View Results').setStyle(ButtonStyle.Secondary).setEmoji('📈')
    )];
  }
  const menu = new StringSelectMenuBuilder()
    .setCustomId(`poll:vote:${poll.id}`)
    .setPlaceholder(poll.multi ? `Select up to ${poll.maxChoices} option(s)` : 'Cast your vote')
    .setMinValues(1)
    .setMaxValues(poll.multi ? Math.min(poll.maxChoices, poll.options.length) : 1)
    .addOptions(poll.options.map((opt, i) => {
      const o = { label: opt.label.slice(0, 100), value: String(i) };
      const e = optionEmoji(i); if (e) o.emoji = e;
      return o;
    }));
  return [
    new ActionRowBuilder().addComponents(menu),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`poll:results:${poll.id}`).setLabel('Results').setStyle(ButtonStyle.Secondary).setEmoji('📈'),
      new ButtonBuilder().setCustomId(`poll:end:${poll.id}`).setLabel('End Poll').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
    )
  ];
}

function buildMessage(poll) {
  return { embeds: [buildPollEmbed(poll)], components: buildComponents(poll) };
}

function analytics(poll, { showVoters = false } = {}) {
  const { counts, voters, totalVotes } = countsOf(poll);
  const denom = poll.multi ? (totalVotes || 1) : (voters || 1);
  const byVoter = {};
  if (showVoters && !poll.anonymous) {
    for (const [uid, choices] of Object.entries(poll.votes || {}))
      for (const idx of choices) (byVoter[idx] = byVoter[idx] || []).push(uid);
  }
  const winner = counts.indexOf(Math.max(...counts));
  return {
    voters, totalVotes,
    options: poll.options.map((opt, i) => ({
      label: opt.label, count: counts[i],
      percent: Math.round((counts[i] / denom) * 100),
      leading: i === winner && counts[i] > 0,
      voters: byVoter[i] || []
    }))
  };
}

function resultsEmbed(poll, { showVoters = false } = {}) {
  const a = analytics(poll, { showVoters });
  const lines = a.options.map((o, i) => {
    const emoji = optionEmoji(i) || '•';
    const voterList = showVoters && !poll.anonymous && o.voters.length
      ? `\n   ${o.voters.slice(0, 20).map(id => `<@${id}>`).join(', ')}${o.voters.length > 20 ? ` +${o.voters.length - 20}` : ''}`
      : '';
    return `${emoji} **${o.label}**: ${o.count} (${o.percent}%)${o.leading ? ' 🏆' : ''}${voterList}`;
  });
  return {
    title: `📈 Results · ${poll.question}`,
    description: lines.join('\n'),
    color: 0x5865f2,
    footer: { text: `${a.voters} voter${a.voters === 1 ? '' : 's'} · ${a.totalVotes} vote${a.totalVotes === 1 ? '' : 's'} · Poll ID: ${poll.id}` }
  };
}

async function fetchMessage(client, poll) {
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel) return null;
  return channel.messages.fetch(poll.messageId).catch(() => null);
}

function scheduleUpdate(client, poll) {
  if (editTimers.has(poll.id)) return;
  const t = setTimeout(async () => {
    editTimers.delete(poll.id);
    const msg = await fetchMessage(client, poll);
    if (msg) await msg.edit(buildMessage(poll)).catch(() => {});
  }, EDIT_THROTTLE_MS);
  t.unref?.();
  editTimers.set(poll.id, t);
}

// Creates a poll, posting it immediately unless scheduled.
async function createPoll(client, { guild, channel, creator, question, options, multi, maxChoices,
  anonymous, hideResults, allowedRoleIds = [], durationMs = 0, scheduleMs = 0 }) {
  const id = client.polls.newId(guild.id);
  const now = Date.now();
  const scheduled = scheduleMs > 0;
  const poll = {
    id, guildId: guild.id, channelId: channel.id, messageId: null,
    question, options: options.map(label => ({ label })),
    multi: !!multi, maxChoices: multi ? Math.max(1, maxChoices || options.length) : 1,
    anonymous: !!anonymous, hideResults: !!hideResults,
    allowedRoleIds: allowedRoleIds.filter(r => /^\d{16,20}$/.test(r)),
    votes: {}, createdBy: creator.id, createdAt: now,
    scheduledFor: scheduled ? now + scheduleMs : null,
    endsAt: durationMs > 0 ? (scheduled ? now + scheduleMs : now) + durationMs : null,
    status: scheduled ? 'scheduled' : 'active'
  };

  if (!scheduled) {
    const msg = await channel.send(buildMessage(poll));
    poll.messageId = msg.id;
  }
  client.polls.addPoll(poll);
  return poll;
}

async function postScheduled(client, poll) {
  const channel = await client.channels.fetch(poll.channelId).catch(() => null);
  if (!channel) { poll.status = 'cancelled'; client.polls.markDirty(); return; }
  poll.status = 'active';
  if (poll.endsAt && poll.endsAt <= Date.now()) poll.endsAt = Date.now() + 60000;
  const msg = await channel.send(buildMessage(poll));
  poll.messageId = msg.id;
  client.polls.markDirty();
}

async function endPoll(client, poll, byTag = 'system') {
  if (poll.status !== 'active') return false;
  poll.status = 'ended';
  poll.endedAt = Date.now();
  poll.endsAt = null;
  client.polls.markDirty();

  const msg = await fetchMessage(client, poll);
  if (msg) await msg.edit(buildMessage(poll)).catch(() => {});

  const config = client.polls.getConfig(poll.guildId);
  if (config.resultsChannelId) {
    const channel = await client.channels.fetch(config.resultsChannelId).catch(() => null);
    if (channel) await channel.send({ embeds: [resultsEmbed(poll)] }).catch(() => {});
  }
  logger.debug(`Poll ${poll.id} ended by ${byTag}.`);
  return true;
}

async function cancelPoll(client, poll) {
  if (poll.status === 'ended' || poll.status === 'cancelled') return false;
  poll.status = 'cancelled';
  poll.endsAt = null;
  client.polls.markDirty();
  const msg = await fetchMessage(client, poll);
  if (msg) await msg.edit(buildMessage(poll)).catch(() => {});
  return true;
}

async function castVote(interaction, client, poll, indexes) {
  if (poll.status !== 'active')
    return interaction.reply({ content: 'This poll is no longer open.', ephemeral: true });

  if (poll.allowedRoleIds.length && !poll.allowedRoleIds.some(r => interaction.member.roles.cache.has(r)))
    return interaction.reply({ content: 'You do not have a role allowed to vote in this poll.', ephemeral: true });

  const valid = indexes.map(Number).filter(i => i >= 0 && i < poll.options.length);
  if (!valid.length) return interaction.reply({ content: 'Invalid selection.', ephemeral: true });

  poll.votes[interaction.user.id] = poll.multi ? valid.slice(0, poll.maxChoices) : [valid[0]];
  client.polls.markDirty();
  scheduleUpdate(client, poll);

  const picked = poll.votes[interaction.user.id].map(i => poll.options[i].label).join(', ');
  await interaction.reply({ content: `🗳️ Your vote was recorded: **${picked}**. You can vote again to change it.`, ephemeral: true });
}

// Auto-posts scheduled polls and auto-ends timed polls. Called on an interval.
async function sweep(client) {
  const now = Date.now();
  for (const poll of client.polls.allByStatus('scheduled'))
    if (poll.scheduledFor && poll.scheduledFor <= now) await postScheduled(client, poll).catch(() => {});
  for (const poll of client.polls.allByStatus('active'))
    if (poll.endsAt && poll.endsAt <= now) await endPoll(client, poll, 'auto').catch(() => {});
}

module.exports = {
  parseSetup, createPoll, buildMessage, buildPollEmbed, castVote, endPoll, cancelPoll,
  postScheduled, resultsEmbed, analytics, sweep, canManagePolls, countsOf,
  buildCreateModal, parseModalSubmit
};
