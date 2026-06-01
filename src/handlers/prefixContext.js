const { ApplicationCommandOptionType } = require('discord.js');

class PrefixUsageError extends Error {}

const idFrom = (token, regex) => {
  if (!token) return null;
  const m = token.match(regex);
  return m ? m[1] : (/^\d{16,20}$/.test(token) ? token : null);
};

const userId    = t => idFrom(t, /^<@!?(\d+)>$/);
const channelId = t => idFrom(t, /^<#(\d+)>$/);
const roleId    = t => idFrom(t, /^<@&(\d+)>$/);

function normalizePayload(payload) {
  const data = typeof payload === 'string' ? { content: payload } : { ...payload };
  delete data.ephemeral;
  delete data.flags;
  return data;
}

// Resolves message arguments against a command's slash option schema and exposes
// an interaction-like context so command.execute() runs unchanged from a text command.
async function buildPrefixContext(message, command, args, client) {
  const T = ApplicationCommandOptionType;
  const topOptions = command.data.toJSON().options || [];
  const guild   = message.guild;
  const values  = { strings: {}, integers: {}, numbers: {}, booleans: {}, users: {}, members: {}, channels: {}, roles: {}, mentionables: {} };

  // Subcommand support: "<command> <sub> [args]" maps to the slash subcommand.
  let subcommand = null;
  let schema = topOptions.filter(o => o.type !== T.Subcommand && o.type !== T.SubcommandGroup);
  const subs = topOptions.filter(o => o.type === T.Subcommand);
  if (subs.length) {
    const subName = (args[0] || '').toLowerCase();
    const sub = subs.find(s => s.name === subName);
    if (!sub)
      throw new PrefixUsageError(`Usage: \`${command.data.name} <${subs.map(s => s.name).join('|')}> …\``);
    subcommand = sub.name;
    args = args.slice(1);
    schema = (sub.options || []).filter(o => o.type !== T.Subcommand && o.type !== T.SubcommandGroup);
  }

  let i = 0;
  for (let idx = 0; idx < schema.length; idx++) {
    const opt    = schema[idx];
    const isLast = idx === schema.length - 1;

    let token;
    if (opt.type === T.String && isLast) token = args.slice(i).join(' ') || undefined;
    else token = args[i];
    const present = token !== undefined && token !== '';

    if (!present) {
      if (opt.required) throw new PrefixUsageError(`Missing required argument **${opt.name}**.\nUsage: \`${command.data.name} ${schema.map(o => o.required ? `<${o.name}>` : `[${o.name}]`).join(' ')}\``);
      i++; continue;
    }

    switch (opt.type) {
      case T.String:  values.strings[opt.name]  = token; break;
      case T.Integer: values.integers[opt.name] = parseInt(token, 10); break;
      case T.Number:  values.numbers[opt.name]  = Number(token); break;
      case T.Boolean: values.booleans[opt.name] = /^(true|yes|y|1|on)$/i.test(token); break;
      case T.User: {
        const id = userId(token);
        if (id) {
          values.users[opt.name]   = await client.users.fetch(id).catch(() => null);
          values.members[opt.name] = await guild.members.fetch(id).catch(() => null);
        }
        break;
      }
      case T.Channel: {
        const id = channelId(token);
        if (id) values.channels[opt.name] = guild.channels.cache.get(id) || null;
        break;
      }
      case T.Role: {
        const id = roleId(token);
        if (id) values.roles[opt.name] = guild.roles.cache.get(id) || null;
        break;
      }
      case T.Mentionable: {
        const rId = roleId(token);
        if (rId) { values.mentionables[opt.name] = guild.roles.cache.get(rId) || null; break; }
        const uId = userId(token);
        if (uId) {
          const member = await guild.members.fetch(uId).catch(() => null);
          values.mentionables[opt.name] = member || await client.users.fetch(uId).catch(() => null);
        }
        break;
      }
      default: values.strings[opt.name] = token;
    }
    i++;
  }

  const options = {
    getString:      n => values.strings[n]      ?? null,
    getInteger:     n => values.integers[n]     ?? null,
    getNumber:      n => values.numbers[n]       ?? null,
    getBoolean:     n => values.booleans[n]      ?? null,
    getUser:        n => values.users[n]         ?? null,
    getMember:      n => values.members[n]       ?? null,
    getChannel:     n => values.channels[n]      ?? null,
    getRole:        n => values.roles[n]         ?? null,
    getMentionable: n => values.mentionables[n]  ?? null,
    getSubcommand:  () => subcommand,
    getFocused:     () => ''
  };

  const ctx = {
    isPrefix:   true,
    client,
    guild,
    guildId:    guild.id,
    channel:    message.channel,
    channelId:  message.channel.id,
    user:       message.author,
    member:     message.member,
    options,
    replied:    false,
    deferred:   false,
    _sent:      null,

    inGuild: () => !!message.guild,

    async reply(payload) {
      this._sent = await message.reply(normalizePayload(payload));
      this.replied = true;
      return this._sent;
    },
    async deferReply() { this.deferred = true; },
    async editReply(payload) {
      if (this._sent) return this._sent.edit(normalizePayload(payload));
      this._sent = await message.channel.send(normalizePayload(payload));
      this.replied = true;
      return this._sent;
    },
    async followUp(payload) { return message.channel.send(normalizePayload(payload)); }
  };

  return ctx;
}

module.exports = { buildPrefixContext, PrefixUsageError };
