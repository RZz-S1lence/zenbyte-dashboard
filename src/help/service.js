const {
  PermissionFlagsBits, ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle
} = require('discord.js');
const embeds = require('../utils/embeds');
const { prefix: DEFAULT_PREFIX, ownerId, dashboard } = require('../config');

// Public dashboard URL, where admins customize the bot. Mirrors the /dashboard command's fallback.
const DASHBOARD_URL = (dashboard.url || 'https://zenbyte-dashboard.de').replace(/\/+$/, '');

// Display metadata for each command category. Order here is the order shown in the
// menu. Kept emoji-free to match the rest of the product's clean, professional look.
const CATEGORIES = [
  { key: 'Moderation',   blurb: 'Warn, ban, mute and keep your server in order.' },
  { key: 'Security',     blurb: 'Anti-nuke, verification and alt detection.' },
  { key: 'Config',       blurb: 'Set up logging, tickets and moderators.' },
  { key: 'Applications', blurb: 'Member application forms and staff review.' },
  { key: 'Leveling',     blurb: 'XP, levels and rank cards.' },
  { key: 'Activity',     blurb: 'Track member activity and view leaderboards.' },
  { key: 'Trust',        blurb: 'Member trust scoring and leaderboards.' },
  { key: 'Polls',        blurb: 'Build and manage polls.' },
  { key: 'Social',       blurb: 'Live and post notifications for creators.' },
  { key: 'System',       blurb: 'Bot info and utilities.' }
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

// How a command is invoked, as a code label: "/name" normally, "<prefix>name" for
// prefix-only commands.
const invokeLabel = (cmd, prefix = DEFAULT_PREFIX) =>
  cmd.prefixOnly ? `${prefix}${cmd.data.name}` : `/${cmd.data.name}`;

// True when a command is turned off in this guild (guildId may be null off-guild).
function isDisabled(client, guildId, cmd) {
  return !!guildId && client.store.isCommandDisabled(guildId, cmd.data.name);
}

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

function homeView(client, viewerId, guildId, prefix = DEFAULT_PREFIX) {
  const cats  = activeCategories(client, viewerId);
  const all   = visibleCommands(client, viewerId);
  const off   = all.filter(c => isDisabled(client, guildId, c)).length;

  const fields = cats.map(c => {
    const cmds = commandsIn(client, viewerId, c.key);
    const disabledHere = cmds.filter(x => isDisabled(client, guildId, x)).length;
    const count = disabledHere
      ? `\`${cmds.length}\` commands · \`${disabledHere}\` off`
      : `\`${cmds.length}\` commands`;
    return { name: c.key, value: `${c.blurb}\n${count}`, inline: true };
  });

  const embed = embeds.custom({
    title: 'ZenByte Help',
    description:
      'Browse commands by category using the menu below. '
      + `Every command works as a slash command and with the \`${prefix}\` prefix.`
      + `\n\n🌐 **Want to customize the bot?** Head to the [ZenByte Dashboard](${DASHBOARD_URL}) to configure leveling, tickets, logging and more.`
      + (off ? `\n\nCommands shown with a ~~strikethrough~~ are currently disabled in this server.` : ''),
    color: embeds.COLORS.brand,
    fields,
    footer: { text: `${all.length} commands available · prefix ${prefix}` }
  });

  const select = new StringSelectMenuBuilder()
    .setCustomId(`help:cat:${viewerId}`)
    .setPlaceholder('Browse a category')
    .addOptions(cats.map(c => ({ label: c.key, value: c.key, description: c.blurb.slice(0, 90) })));

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(select)] };
}

function categoryView(client, viewerId, guildId, category, prefix = DEFAULT_PREFIX) {
  const meta = META[category];
  if (!meta) return homeView(client, viewerId, guildId, prefix);
  const cmds = commandsIn(client, viewerId, category);

  const lines = cmds.map(c => {
    const label = invokeLabel(c, prefix);
    if (isDisabled(client, guildId, c))
      return `~~\`${label}\`~~ ${c.data.description} · **Disabled**`;
    const perm = permissionLabel(c);
    const tag = perm === 'Everyone' ? '' : ` · ${perm}`;
    return `\`${label}\` ${c.data.description}${tag}`;
  });

  const embed = embeds.custom({
    title: `${category} Commands`,
    description: `${meta.blurb}\n\n${lines.join('\n')}`,
    color: embeds.COLORS.brand,
    footer: { text: 'Pick a command below for full usage and details.' }
  });

  const catSelect = new StringSelectMenuBuilder()
    .setCustomId(`help:cat:${viewerId}`)
    .setPlaceholder('Switch category')
    .addOptions(activeCategories(client, viewerId)
      .map(c => ({ label: c.key, value: c.key, default: c.key === category })));

  const cmdSelect = new StringSelectMenuBuilder()
    .setCustomId(`help:cmd:${viewerId}:${category}`)
    .setPlaceholder('View a command')
    .addOptions(cmds.map(c => {
      const disabled = isDisabled(client, guildId, c);
      return {
        label: invokeLabel(c, prefix),
        value: c.data.name,
        description: `${disabled ? 'Disabled · ' : ''}${c.data.description}`.slice(0, 90)
      };
    }));

  const back = new ButtonBuilder().setCustomId(`help:home:${viewerId}`).setLabel('Overview').setStyle(ButtonStyle.Secondary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(catSelect),
      new ActionRowBuilder().addComponents(cmdSelect),
      new ActionRowBuilder().addComponents(back)
    ]
  };
}

function commandView(client, viewerId, guildId, category, name, prefix = DEFAULT_PREFIX) {
  const cmd = visibleCommands(client, viewerId).find(c => c.data.name === name);
  if (!cmd) return categoryView(client, viewerId, guildId, category, prefix);
  const json = cmd.data.toJSON();
  const disabled = isDisabled(client, guildId, cmd);

  const usage = usageLines(cmd, prefix);
  const usageText = (cmd.prefixOnly
    ? usage.map(u => u.text)
    : usage.map(u => `${u.slash}\n${u.text}`)).join('\n\n');

  const fields = [
    { name: 'Usage', value: usageText },
    { name: 'Required permission', value: permissionLabel(cmd), inline: true },
    { name: 'Category', value: cmd.category || 'System', inline: true },
    { name: 'Status', value: disabled ? 'Disabled in this server' : 'Enabled', inline: true }
  ];

  const subs = (json.options || []).filter(o => o.type === 1);
  if (subs.length)
    fields.push({ name: 'Subcommands', value: subs.map(s => `\`${s.name}\` ${s.description}`).join('\n') });

  const footer = cmd.prefixOnly
    ? `Works with ${prefix}${json.name} only`
    : `Works with /${json.name} or ${prefix}${json.name}`;

  const embed = embeds.custom({
    title: invokeLabel(cmd, prefix),
    description: disabled
      ? `${json.description}\n\nThis command is currently turned off in this server.`
      : json.description,
    color: disabled ? embeds.COLORS.warn : embeds.COLORS.brand,
    fields,
    footer: { text: footer }
  });

  const backCat = new ButtonBuilder().setCustomId(`help:back:${viewerId}:${category}`)
    .setLabel(`Back to ${category}`).setStyle(ButtonStyle.Secondary);
  const home = new ButtonBuilder().setCustomId(`help:home:${viewerId}`).setLabel('Overview').setStyle(ButtonStyle.Secondary);

  return { embeds: [embed], components: [new ActionRowBuilder().addComponents(backCat, home)] };
}

module.exports = { homeView, categoryView, commandView, isOwner };
