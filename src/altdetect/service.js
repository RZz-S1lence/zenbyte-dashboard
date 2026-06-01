const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const logger = require('../utils/logger');

// Sliding window of recent join times per guild, for raid/burst detection.
const burstWindows = new Map(); // guildId -> number[]

function recordJoin(guildId, windowMs) {
  const now = Date.now();
  const arr = (burstWindows.get(guildId) || []).filter(t => now - t < windowMs);
  arr.push(now);
  burstWindows.set(guildId, arr);
  return arr.length;
}

function peekBurst(guildId, windowMs) {
  const now = Date.now();
  return (burstWindows.get(guildId) || []).filter(t => now - t < windowMs).length;
}

function looksSuspiciousName(name) {
  if (!name) return false;
  const n = name.toLowerCase();
  if (/\d{4,}$/.test(n)) return true;             // long trailing digit run
  if (/^[a-z]{1,8}\d{3,}$/.test(n)) return true;  // short word followed by digits
  const digits = (n.match(/\d/g) || []).length;
  if (n.length >= 6 && digits / n.length > 0.5) return true; // mostly digits
  if (/^[bcdfghjklmnpqrstvwxz]{6,}$/.test(n)) return true;    // long, no vowels (keysmash)
  return false;
}

function isExempt(member, config) {
  if (member.user.bot) return true;
  return config.exemptRoleIds.some(id => member.roles.cache.has(id));
}

// Core scorer. Pure given the member, config and a small context object.
// context: { burstCount, warnings, fullUser }
function score(member, config, context = {}) {
  const s = config.signals;
  const now = Date.now();
  const ageMs   = now - member.user.createdTimestamp;
  const ageDays = ageMs / 86400000;
  const signals = [];
  let total = 0;

  const add = (key, label, points, detail) => {
    const p = Math.round(points);
    if (p <= 0) return;
    total += p;
    signals.push({ key, label, points: p, detail });
  };

  if (s.youngAccount.enabled && ageDays < s.youngAccount.maxAgeDays) {
    const ratio = 1 - ageDays / s.youngAccount.maxAgeDays;
    add('youngAccount', 'New Account', s.youngAccount.weight * ratio,
      `${ageDays < 1 ? `${Math.floor(ageMs / 3600000)}h` : `${Math.floor(ageDays)}d`} old`);
  }

  if (s.instantJoin.enabled) {
    const ageHours = ageMs / 3600000;
    if (ageHours < s.instantJoin.withinHours) {
      const ratio = 1 - ageHours / s.instantJoin.withinHours;
      add('instantJoin', 'Created & Joined', s.instantJoin.weight * ratio,
        `created ${ageHours < 1 ? '<1h' : `${Math.floor(ageHours)}h`} before joining`);
    }
  }

  if (s.noAvatar.enabled && !member.user.avatar)
    add('noAvatar', 'Default Avatar', s.noAvatar.weight, 'no profile picture');

  if (s.suspiciousName.enabled && looksSuspiciousName(member.user.username))
    add('suspiciousName', 'Suspicious Username', s.suspiciousName.weight, `\`${member.user.username}\``);

  if (s.joinBurst.enabled && (context.burstCount || 0) >= s.joinBurst.joins)
    add('joinBurst', 'Join Burst', s.joinBurst.weight,
      `${context.burstCount} joins in ${s.joinBurst.windowSec}s`);

  if (s.priorWarnings.enabled && (context.warnings || 0) > 0)
    add('priorWarnings', 'Prior Warnings', s.priorWarnings.weight, `${context.warnings} warning(s)`);

  if (s.noProfile.enabled && context.fullUser) {
    const u = context.fullUser;
    const empty = !u.banner && !u.accentColor && (u.flags?.bitfield ? false : true);
    if (empty) add('noProfile', 'Empty Profile', s.noProfile.weight, 'no banner, badges or accent');
  }

  total = Math.max(0, Math.min(100, total));
  const level = total >= config.thresholds.high ? 'high'
              : total >= config.thresholds.flag ? 'flag' : 'clear';
  return { score: total, level, signals };
}

const LEVELS = {
  clear: { label: 'Clear',      color: 0x57f287 },
  flag:  { label: 'Suspicious', color: 0xfee75c },
  high:  { label: 'High Risk',  color: 0xed4245 }
};

// Full analysis used by the /altcheck command and the join check. Pulls
// behavioural context (warnings) and, if enabled, the full user profile.
async function analyze(client, guild, member, { atJoin = false } = {}) {
  const config = client.altdetect.getConfig(guild.id);
  const windowMs = config.signals.joinBurst.windowSec * 1000;
  const burstCount = atJoin ? recordJoin(guild.id, windowMs) : peekBurst(guild.id, windowMs);
  const warnings = client.store.warnings.get(guild.id)?.get(member.id)?.length || 0;

  let fullUser = null;
  if (config.signals.noProfile.enabled) fullUser = await member.user.fetch(true).catch(() => null);

  return { config, ...score(member, config, { burstCount, warnings, fullUser }) };
}

function buildFlagEmbed(member, result, { reviewed } = {}) {
  const meta = LEVELS[result.level] || LEVELS.flag;
  const lines = result.signals.length
    ? result.signals.map(s => `• **${s.label}** (+${s.points}): ${s.detail}`).join('\n')
    : '• No signals triggered.';
  const createdAt = Math.floor(member.user.createdTimestamp / 1000);
  return {
    title: `🔍 Alt Detection · ${meta.label}`,
    color: meta.color,
    thumbnail: { url: member.user.displayAvatarURL() },
    fields: [
      { name: 'Member',     value: `${member.user.tag} (<@${member.id}>)`, inline: true },
      { name: 'Risk Score', value: `**${result.score}/100** · ${meta.label}`, inline: true },
      { name: 'Account Created', value: `<t:${createdAt}:R>`, inline: true },
      { name: 'Signals', value: lines }
    ],
    footer: reviewed ? { text: reviewed } : undefined,
    timestamp: new Date()
  };
}

function reviewComponents(userId, config) {
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`altcheck:clear:${userId}`).setLabel('Not an Alt').setStyle(ButtonStyle.Success).setEmoji('✅'),
    new ButtonBuilder().setCustomId(`altcheck:kick:${userId}`).setLabel('Kick').setStyle(ButtonStyle.Secondary).setEmoji('👢'),
    new ButtonBuilder().setCustomId(`altcheck:ban:${userId}`).setLabel('Ban').setStyle(ButtonStyle.Danger).setEmoji('🔨')
  );
  if (config.quarantineRoleId)
    row.addComponents(new ButtonBuilder().setCustomId(`altcheck:quarantine:${userId}`).setLabel('Quarantine').setStyle(ButtonStyle.Secondary).setEmoji('🚧'));
  return [row];
}

async function applyAction(client, guild, member, action, reason) {
  try {
    switch (action) {
      case 'ban':
        if (!member.bannable) return 'failed (cannot ban, role hierarchy)';
        await member.ban({ reason });
        return 'banned';
      case 'kick':
        if (!member.kickable) return 'failed (cannot kick, role hierarchy)';
        await member.kick(reason);
        return 'kicked';
      case 'quarantine': {
        const config = client.altdetect.getConfig(guild.id);
        const role = config.quarantineRoleId && guild.roles.cache.get(config.quarantineRoleId);
        if (!role) return 'failed (no quarantine role)';
        if (role.position >= guild.members.me.roles.highest.position) return 'failed (quarantine role too high)';
        await member.roles.add(role, reason);
        return 'quarantined';
      }
      default: return 'flagged for review';
    }
  } catch (e) {
    logger.error(`Alt detection action failed for ${member.id}:`, e.message);
    return `failed (${e.message})`;
  }
}

// Entry point from guildMemberAdd. Returns true if the member was removed
// (so the join logger can skip the normal "member joined" embed).
async function runJoinCheck(client, member) {
  const config = client.altdetect.getConfig(member.guild.id);
  if (!config.enabled || isExempt(member, config)) return false;

  const result = await analyze(client, member.guild, member, { atJoin: true });
  if (result.level === 'clear') return false;

  const action = result.level === 'high' ? config.actions.onHigh : config.actions.onFlag;
  const reason = `Alt detection: ${result.score}/100 risk (${result.signals.map(s => s.key).join(', ')})`;

  let outcome = 'flagged for review';
  let removed = false;
  if (action !== 'review') {
    if (config.dmOnAction && (action === 'kick' || action === 'ban')) {
      await member.send({ embeds: [{
        title: `Removed from ${member.guild.name}`,
        description: 'Your account was automatically flagged as a likely alternate or throwaway account. If this is a mistake, contact a server moderator.',
        color: 0xed4245
      }] }).catch(() => {});
    }
    outcome = await applyAction(client, member.guild, member, action, reason);
    removed = outcome === 'banned' || outcome === 'kicked';
  }

  client.altdetect.addFlag(member.guild.id, {
    userId: member.id,
    tag: member.user.tag,
    score: result.score,
    level: result.level,
    signals: result.signals,
    action,
    outcome,
    flaggedAt: Date.now(),
    status: removed ? 'actioned' : 'pending'
  });

  const channel = config.reviewChannelId && member.guild.channels.cache.get(config.reviewChannelId);
  if (channel) {
    const embed = buildFlagEmbed(member, result);
    embed.fields.push({ name: 'Auto Action', value: `\`${action}\` → ${outcome}`, inline: false });
    await channel.send({
      embeds: [embed],
      components: removed ? [] : reviewComponents(member.id, config)
    }).catch(() => {});
  }

  if (removed)
    logger.warn(`Alt detection ${outcome} ${member.user.tag} in ${member.guild.name} (${result.score}/100).`);
  return removed;
}

module.exports = {
  analyze, score, runJoinCheck, looksSuspiciousName,
  buildFlagEmbed, reviewComponents, applyAction, LEVELS
};
