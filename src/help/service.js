const {
  PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const embeds = require('../utils/embeds');
const { prefix: DEFAULT_PREFIX, ownerId } = require('../config');

// Display metadata for each command category. Order here is the order shown in the menu.
const CATEGORIES = [
  { key: 'Moderation', emoji: '🛡️', blurb: 'Warn, ban, mute and keep your server in order.' },
  { key: 'Security',   emoji: '🔐', blurb: 'Anti-nuke, verification and alt detection.' },
  { key: 'Config',     emoji: '🔧', blurb: 'Set up logging, tickets and moderators.' },
  { key: 'Leveling',   emoji: '📈', blurb: 'XP, levels and rank cards.' },
  { key: 'Activity',   emoji: '📊', blurb: 'Track member activity and view leaderboards.' },
  { key: 'Trust',      emoji: '🤝', blurb: 'Member trust scoring and leaderboards.' },
  { key: 'Polls',      emoji: '🗳️', blurb: 'Build and manage polls.' },
  { key: 'Social',     emoji: '📡', blurb: 'Live and post notifications for creators.' },
  { key: 'System',     emoji: '⚙️', blurb: 'Bot info and utilities.' }
];
const META = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

// Friendlier names for the permission flags we actually use on commands.
const PERM_NAMES = {
  [PermissionFlagsBits.ManageGuild]:      'Manage Server',
  [PermissionFlagsBits.ManageChannels]:   'Manage Channels',
  [PermissionFlagsBits.ManageMessages]:   'Manage Messages',
  [PermissionFlagsBits.ManageNicknames]:  'Manage Nicknames',
  [PermissionFlagsBits.ManageRoles]:      'Manage Roles',
  [PermissionFlagsBits.ModerateMembers]:  'Timeout Members',
  [PermissionFlagsBits.BanMembers]:       'Ban Members',
  [PermissionFlagsBits.KickMembers]:      'Kick Members',
  [PermissionFlagsBits.Administrator]:    'Administrator'
};
const permName = flag => PERM_NAMES[flag] || 'a special permission';

function permissionLabel(cmd) {
  if (cmd.ownerOnly) return 'Bot owner';
  if (cmd.adminOnly) return 'Administrator';
  if (cmd.modPermission) return `Moderator, or ${permName(cmd.modPermission)}`;
  if (Array.isArray(cmd.permissions) && cmd.permissions.length)
    return cmd.permissions.map(permName).join(' + ');
  return 'Everyone';
}

const isOwner = viewerId => viewerId === ownerId;

// Hides owner-only commands from anyone who is not the owner.
function visibleCommands(client, viewerId) {
  return [...client.commands.values()].filter(c => !c.ownerOnly || isOwner(viewerId));
}

function commandsIn(client, viewerId, category) {
  return visibleCommands(client, viewerId)
    .filter(c => (c.category || 'System') === category)
    .sort((a, b) => a.data.name.localeCompare(b.data.name));
}

function activeCategories(client, viewerId) {
  return CATEGORIES.filter(c => commandsIn(client, viewerId, c.key).length);
}

const argList = options => (options || [])
  .filter(o => o.type !== 1 && o.type !== 2)
  .map(o => (o.required ? `<${o.name}>` : `[${o.name}]`))
  .join(' ');

// Returns both the slash and prefix usage strings for a command (per subcommand when present).
function usageLines(cmd, prefix = DEFAULT_PREFIX) {
  const json = cmd.data.toJSON();
  const subs = (json.options || []).filter(o => o.type === 1);
  const rows = subs.length
    ? subs.map(s => `${json.name} ${s.name}${argList(s.options) ? ` ${argList(s.options)}` : ''}`)
    : [`${json.name}${argList(json.options) ? ` ${argList(json.options)}` : ''}`];
  return rows.map(r => ({ slash: `/${r}`, text: `${prefix}${r}` }));
}

function homeView(client, viewerId, prefix = DEFAULT_PREFIX) {
  const cats = activeCategories(client, viewerId);
  const total = visibleCommands(client, viewerId).length;

  const fields = cats.map(c => ({
    name: `${c.emoji} ${c.key}`,
    value: `${c.blurb}\n\`${commandsIn(client, viewerId, c.key).length}\` commands`,
    inline: true
  }));

  const embed = embeds.custom({
    title: "🤖 ZenByte · Help",
    description: 'Pick a category below to see its commands. Every command works as a slash command and with the '
      + `\`${prefix}\` prefix.`,
    color: embeds.COLORS.brand,
    fields,
    footer: { text: `${total} commands available · prefix ${prefix}` }
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`help:cat:${viewerId}`)
    .setPlaceholder('Browse a category')
    .addOptions(cats.map(c => ({ label: c.key, value: c.key, description: c.blurb.slice(0, 90), emoji: c.emoji })));

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

function categoryView(client, viewerId, category) {
  const meta = META[category];
  if (!meta) return homeView(client, viewerId);
  const cmds = commandsIn(client, viewerId, category);

  const lines = cmds.map(c => {
    const perm = permissionLabel(c);
    const tag = perm === 'Everyone' ? '' : ` · ${perm}`;
    return `\`/${c.data.name}\` ${c.data.description}${tag}`;
  });

  const embed = embeds.custom({
    title: `${meta.emoji} ${category} Commands`,
    description: `${meta.blurb}\n\n${lines.join('\n')}`,
    color: embeds.COLORS.brand,
    footer: { text: 'Pick a command below for usage and details.' }
  });

  const catSelect = new StringSelectMenuBuilder()
    .setCustomId(`help:cat:${viewerId}`)
    .setPlaceholder('Switch category')
    .addOptions(activeCategories(client, viewerId)
      .map(c => ({ label: c.key, value: c.key, emoji: c.emoji, default: c.key === category })));

  const cmdSelect = new StringSelectMenuBuilder()
    .setCustomId(`help:cmd:${viewerId}:${category}`)
    .setPlaceholder('View a command')
    .addOptions(cmds.map(c => ({
      label: `/${c.data.name}`,
      value: c.data.name,
      description: c.data.description.slice(0, 90)
    })));

  const back = new ButtonBuilder().setCustomId(`help:home:${viewerId}`).setLabel('Overview').setEmoji('🏠').setStyle(ButtonStyle.Secondary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(catSelect),
      new ActionRowBuilder().addComponents(cmdSelect),
      new ActionRowBuilder().addComponents(back)
    ]
  };
}

function commandView(client, viewerId, category, name, prefix = DEFAULT_PREFIX) {
  const cmd = visibleCommands(client, viewerId).find(c => c.data.name === name);
  if (!cmd) return categoryView(client, viewerId, category);
  const json = cmd.data.toJSON();
  const meta = META[cmd.category] || META.System;

  const usage = usageLines(cmd, prefix);
  const usageText = usage.map(u => `${u.slash}\n${u.text}`).join('\n\n');

  const fields = [
    { name: 'Usage', value: usageText },
    { name: 'Required permission', value: permissionLabel(cmd), inline: true },
    { name: 'Category', value: `${meta.emoji} ${cmd.category || 'System'}`, inline: true }
  ];

  const subs = (json.options || []).filter(o => o.type === 1);
  if (subs.length)
    fields.push({ name: 'Subcommands', value: subs.map(s => `\`${s.name}\` ${s.description}`).join('\n') });

  const embed = embeds.custom({
    title: `/${json.name}`,
    description: json.description,
    color: embeds.COLORS.brand,
    fields,
    footer: { text: `Works with /${json.name} or ${prefix}${json.name}` }
  });

  const backCat = new ButtonBuilder().setCustomId(`help:back:${viewerId}:${category}`)
    .setLabel(`Back to ${category}`).setEmoji(meta.emoji).setStyle(ButtonStyle.Secondary);
  const home = new ButtonBuilder().setCustomId(`help:home:${viewerId}`).setLabel('Overview').setEmoji('🏠').setStyle(ButtonStyle.Secondary);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(backCat, home)] };
}

module.exports = { homeView, categoryView, commandView, isOwner };
