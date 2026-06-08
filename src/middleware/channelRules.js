// Per-command channel restrictions. Admins configure, per guild, whether a command
// is blocked in certain channels (blacklist) or only allowed in certain channels
// (whitelist). The actual rules live in the store; this module wires the check into
// command dispatch and builds the user-facing denial message.

// The channel ids relevant to a command use: the channel itself, plus its parent
// when the command is run inside a thread (a rule on the parent should still apply).
function channelIdsFor(channel, channelId) {
  const ids = [channelId];
  if (channel?.parentId) ids.push(channel.parentId);
  return ids.filter(Boolean);
}

// Returns { ok } when the command may run here, or { ok:false, reason } with a
// message to show the user. `guildId`, `channelId` and `channel` come from the
// interaction or message; `name` is the command's canonical name.
function check(client, { guildId, channelId, channel, name }) {
  const result = client.store.checkChannelRule(guildId, name, channelIdsFor(channel, channelId));
  if (result.ok) return { ok: true };

  if (result.mode === 'blacklist')
    return { ok: false, reason: 'This command is disabled in this channel.' };

  const list = result.channels.map(id => `<#${id}>`).join(', ');
  return { ok: false, reason: `This command is disabled in this channel, try using it in ${list}.` };
}

module.exports = { check };
