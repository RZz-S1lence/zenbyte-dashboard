const express = require('express');
const session = require('express-session');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const http    = require('http');
const crypto  = require('crypto');
const path    = require('path');
const fs      = require('fs');
const { attachChat } = require('./chat');
const { PermissionsBitField } = require('discord.js');

const LOG_TYPES = require('../config/logTypes');
const { normalizeTicketConfig } = require('../utils/tickets');
const { PROTECTIONS, PUNISHMENTS, mergeConfig } = require('../security/protections');
const { CURVES, ANNOUNCE_MODES } = require('../leveling/config');
const { SIGNALS: ALT_SIGNALS, SENSITIVITY_PRESETS, ACTIONS: ALT_ACTIONS } = require('../altdetect/config');
const verificationHandler = require('../handlers/verification');
const reactionRoleService = require('../reactionrole/service');
const { MODES: RR_MODES, parseEmoji: rrParseEmoji } = require('../reactionrole/config');
const pollService = require('../polls/service');
const socialService = require('../social/service');
const { providerMeta } = require('../social/providers');
const applicationService = require('../applications/service');
const {
  QUESTION_TYPES: APP_QUESTION_TYPES, STATUSES: APP_STATUSES, STATUS_META: APP_STATUS_META,
  ROLE_STATUSES: APP_ROLE_STATUSES, BUTTON_STYLES: APP_BUTTON_STYLES, DEFAULT_PANEL: APP_DEFAULT_PANEL
} = require('../applications/config');
const logger = require('../utils/logger');
const oauthClient = require('./auth');
const { requireAuth, requireOwner, requireGuildAccess, clientIp } = require('./middleware');

function avatarUrl(user) {
  if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
  return `https://cdn.discordapp.com/embed/avatars/${(BigInt(user.id) >> 22n) % 6n}.png`;
}

// Never fall back to a hardcoded session secret. Use SESSION_SECRET when set,
// otherwise generate one and persist it locally so logins survive restarts.
function resolveSessionSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(__dirname, '..', '..', '.session-secret');
  try {
    if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8').trim();
    const secret = crypto.randomBytes(48).toString('hex');
    fs.writeFileSync(file, secret, { mode: 0o600 });
    logger.warn('No SESSION_SECRET set. Generated one in .session-secret. Set SESSION_SECRET in your .env for production.');
    return secret;
  } catch {
    return crypto.randomBytes(48).toString('hex');
  }
}

// ── Server ────────────────────────────────────────
module.exports = function startDashboard(client) {
  const app  = express();
  const PORT = process.env.DASHBOARD_PORT || 3000;
  const BASE = require('../config').dashboard.url || `http://localhost:${PORT}`;
  const REDIRECT_URI = `${BASE}/auth/discord/callback`;

  const secure = BASE.startsWith('https://');
  if (secure) app.set('trust proxy', 1);

  const sessionMiddleware = session({
    secret: resolveSessionSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000, httpOnly: true, sameSite: 'lax', secure }
  });

  // Security headers. CSP is left off because the dashboard relies on inline
  // handlers, inline styles and same-origin socket.io; the other headers still apply.
  app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, 'public')));
  app.use(sessionMiddleware);

  // Rate limiting: a tight limit on auth, a looser one on the API.
  app.use('/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false }));
  app.use('/api', rateLimit({ windowMs: 60 * 1000, max: 200, standardHeaders: true, legacyHeaders: false }));

  // CSRF defence: state-changing API calls must come from this dashboard's own origin.
  app.use('/api', (req, res, next) => {
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.get('origin') || req.get('referer') || '';
      if (origin && !origin.startsWith(BASE)) {
        logger.warn(`Blocked cross-origin ${req.method} ${req.originalUrl} from ${origin} ip=${clientIp(req)}`);
        return res.status(403).json({ error: 'Cross-origin request blocked.' });
      }
    }
    next();
  });

  // ── Discord OAuth2 login ──────────────────────
  app.get('/auth/discord', (req, res) => {
    if (!oauthClient.isConfigured()) return res.redirect('/?error=oauth_not_configured');
    const state = crypto.randomBytes(16).toString('hex');
    req.session.oauthState = state;
    res.redirect(oauthClient.getAuthorizeUrl(REDIRECT_URI, state));
  });

  app.get('/auth/discord/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state || state !== req.session.oauthState) {
      logger.warn(`Blocked OAuth callback (bad state) ip=${clientIp(req)}`);
      return res.redirect('/?error=auth_failed');
    }
    delete req.session.oauthState;

    try {
      const token  = await oauthClient.exchangeCode(code, REDIRECT_URI);
      const user   = await oauthClient.fetchDiscordUser(token.access_token);
      const guilds = await oauthClient.fetchUserGuilds(token.access_token);

      req.session.userId        = user.id;
      req.session.username      = user.global_name || user.username;
      req.session.avatar        = avatarUrl(user);
      req.session.adminGuildIds = guilds.filter(oauthClient.hasAdminInOAuthGuild).map(g => g.id);

      logger.info(`Dashboard login: ${req.session.username} (${user.id}) from ${clientIp(req)}`);
      res.redirect('/');
    } catch (e) {
      logger.error('OAuth callback failed:', e.message);
      res.redirect('/?error=auth_failed');
    }
  });

  app.get('/api/auth', (req, res) => {
    const links = { invite: oauthClient.getBotInviteUrl(), support: require('../config').dashboard.supportInvite };
    if (!req.session?.userId)
      return res.json({ authenticated: false, configured: oauthClient.isConfigured(), links });
    res.json({
      authenticated: true,
      user: { id: req.session.userId, username: req.session.username, avatar: req.session.avatar },
      links
    });
  });

  app.post('/api/logout', (req, res) => {
    if (req.session?.userId) oauthClient.invalidateUser(req.session.userId);
    req.session.destroy(() => res.json({ success: true }));
  });

  // ── Bot status ─────────────────────────────────
  app.get('/api/status', requireAuth, (req, res) => {
    const uptime = client.uptime || 0;
    const h = Math.floor(uptime / 3600000);
    const m = Math.floor((uptime % 3600000) / 60000);
    const s = Math.floor((uptime % 60000) / 1000);
    res.json({
      ready:     client.isReady(),
      tag:       client.user?.tag || 'Not connected',
      avatarUrl: client.user?.displayAvatarURL({ size: 64 }) || null,
      guilds:    client.guilds.cache.size,
      uptime:    `${h}h ${m}m ${s}s`
    });
  });

  // ── Commands (built dynamically from the loaded command modules) ──
  app.get('/api/commands', requireAuth, (req, res) => {
    const permName = bit => {
      for (const [name, value] of Object.entries(PermissionsBitField.Flags)) if (value === bit) return name;
      return String(bit);
    };
    const list = [...client.commands.values()].map(cmd => {
      const json = cmd.data.toJSON();
      return {
        name:          json.name,
        description:   json.description,
        category:      cmd.category || 'General',
        cooldown:      cmd.cooldown || 0,
        ownerOnly:     !!cmd.ownerOnly,
        adminOnly:     !!cmd.adminOnly,
        permissions:   (cmd.permissions || []).map(permName),
        modPermission: cmd.modPermission ? permName(cmd.modPermission) : null,
        options: (json.options || []).map(o => ({
          name: o.name, description: o.description, type: o.type,
          required: !!o.required, autocomplete: !!o.autocomplete, choices: o.choices || null
        }))
      };
    }).sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    res.json(list);
  });

  // Guard applied to every guild-scoped route (live admin re-check).
  const guildGuard = requireGuildAccess(client);

  // ── Guilds ─────────────────────────────────────
  app.get('/api/guilds', requireAuth, async (req, res) => {
    res.json(await oauthClient.listAccessibleGuilds(client, req.session));
  });

  app.get('/api/guild/:id', requireAuth, guildGuard, (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });

    const textChannels = guild.channels.cache
      .filter(c => c.type === 0)
      .map(c => ({ id: c.id, name: c.name, category: c.parent?.name || null }))
      .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));

    const categories = guild.channels.cache
      .filter(c => c.type === 4)
      .map(c => ({ id: c.id, name: c.name }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const roles = guild.roles.cache
      .filter(r => r.id !== guild.id)
      .map(r => ({ id: r.id, name: r.name }))
      .sort((a, b) => b.rawPosition - a.rawPosition);

    res.json({ id: guild.id, name: guild.name, textChannels, categories, roles });
  });

  // ── Log channels ───────────────────────────────
  app.get('/api/guild/:id/logs', requireAuth, guildGuard, (req, res) => {
    res.json({
      config:   client.logChannels.get(req.params.id) || {},
      logTypes: LOG_TYPES
    });
  });

  app.put('/api/guild/:id/logs', requireAuth, guildGuard, (req, res) => {
    if (!client.guilds.cache.has(req.params.id)) return res.status(404).json({ error: 'Guild not found' });
    const current = client.logChannels.get(req.params.id) || {};
    for (const [key, val] of Object.entries(req.body)) {
      if (!val) delete current[key]; else current[key] = val;
    }
    client.logChannels.set(req.params.id, current);
    client.saveLogChannels();
    res.json({ success: true, config: current });
  });

  // ── Ticket config ──────────────────────────────
  app.get('/api/guild/:id/tickets', requireAuth, guildGuard, (req, res) => {
    res.json(client.tickets.get(req.params.id) || {});
  });

  app.put('/api/guild/:id/tickets', requireAuth, guildGuard, (req, res) => {
    if (!client.guilds.cache.has(req.params.id)) return res.status(404).json({ error: 'Guild not found' });
    const current = client.tickets.get(req.params.id) || {};
    const updated = normalizeTicketConfig({ ...current, ...req.body });
    client.tickets.set(req.params.id, updated);
    client.saveTickets();
    res.json({ success: true, config: updated });
  });

  app.get('/api/guild/:id/open-tickets', requireAuth, guildGuard, (req, res) => {
    const gTickets = client.openTickets.get(req.params.id);
    if (!gTickets) return res.json([]);
    const guild = client.guilds.cache.get(req.params.id);
    const list = [];
    for (const [channelId, data] of gTickets) {
      const ch = guild?.channels.cache.get(channelId);
      list.push({ channelId, channelName: ch?.name || channelId, ...data });
    }
    res.json(list);
  });

  // ── Anti-Nuke / Security ──────────────────────
  app.get('/api/guild/:id/security', requireAuth, guildGuard, (req, res) => {
    res.json({
      config:      client.store.getSecurityConfig(req.params.id),
      protections: PROTECTIONS.map(p => ({ key: p.key, label: p.label })),
      punishments: PUNISHMENTS
    });
  });

  app.put('/api/guild/:id/security', requireAuth, guildGuard, (req, res) => {
    if (!client.guilds.cache.has(req.params.id)) return res.status(404).json({ error: 'Guild not found' });
    const merged = mergeConfig(req.body || {});
    client.store.security.set(req.params.id, merged);
    client.store.saveSecurity();
    res.json({ success: true, config: merged });
  });

  // ── Verification ──────────────────────────────
  app.get('/api/guild/:id/verification', requireAuth, guildGuard, (req, res) => {
    res.json(client.store.getVerificationConfig(req.params.id));
  });

  app.put('/api/guild/:id/verification', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const b = req.body || {};
    const config = {
      enabled:          !!b.enabled,
      channelId:        b.channelId || null,
      verifiedRoleId:   b.verifiedRoleId || null,
      panelTitle:       b.panelTitle || null,
      panelDescription: b.panelDescription || null,
      minAccountAgeDays: Math.max(0, parseInt(b.minAccountAgeDays, 10) || 0),
      requireAvatar:    !!b.requireAvatar,
      altAction:        ['kick', 'ban', 'block'].includes(b.altAction) ? b.altAction : 'kick'
    };
    client.store.verification.set(req.params.id, config);
    client.store.saveVerification();

    let posted = false;
    if (b.repost && config.channelId) {
      const channel = guild.channels.cache.get(config.channelId);
      if (channel) { await channel.send(verificationHandler.buildPanel(config)).then(() => posted = true).catch(() => {}); }
    }
    res.json({ success: true, config, posted });
  });

  // ── Autoroles (roles given on join) ───────────
  app.get('/api/guild/:id/autorole', requireAuth, guildGuard, (req, res) => {
    res.json({ config: client.autoroles.getConfig(req.params.id) });
  });

  app.put('/api/guild/:id/autorole', requireAuth, guildGuard, (req, res) => {
    if (!client.guilds.cache.has(req.params.id)) return res.status(404).json({ error: 'Guild not found' });
    const config = client.autoroles.setConfig(req.params.id, req.body || {});
    res.json({ success: true, config });
  });

  // ── Reaction roles ────────────────────────────
  // Turns incoming [{ emoji, roleId }] into validated mapping objects.
  const buildMappings = raw => (Array.isArray(raw) ? raw : [])
    .map(m => {
      const parsed = rrParseEmoji(m?.emoji);
      if (!parsed || !/^\d{16,20}$/.test(m?.roleId || '')) return null;
      return { ...parsed, roleId: m.roleId };
    })
    .filter(Boolean)
    .slice(0, 20);

  app.get('/api/guild/:id/reactionroles', requireAuth, guildGuard, (req, res) => {
    res.json({ menus: client.reactionroles.listMenus(req.params.id), modes: RR_MODES });
  });

  app.post('/api/guild/:id/reactionroles', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const b = req.body || {};
    if (!guild.channels.cache.get(b.channelId)) return res.status(400).json({ error: 'Pick a valid channel.' });

    const managed = b.managed !== false;
    if (!managed) {
      if (!/^\d{16,20}$/.test(b.messageId || '')) return res.status(400).json({ error: 'Provide the existing message ID.' });
      const exists = await guild.channels.cache.get(b.channelId).messages.fetch(b.messageId).catch(() => null);
      if (!exists) return res.status(400).json({ error: 'I could not find that message in that channel.' });
    }

    const menu = client.reactionroles.createMenu(guild.id, {
      channelId: b.channelId, messageId: managed ? null : b.messageId, mode: b.mode, managed,
      embed: b.embed, title: b.title, description: b.description, color: b.color,
      mappings: buildMappings(b.mappings)
    });
    const result = await reactionRoleService.syncPanel(client, guild, menu);
    client.reactionroles.save();
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, menu });
  });

  app.put('/api/guild/:id/reactionroles/:menuId', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const existing = client.reactionroles.getMenu(guild.id, req.params.menuId);
    if (!existing) return res.status(404).json({ error: 'Panel not found' });
    const b = req.body || {};

    const menu = client.reactionroles.updateMenu(guild.id, req.params.menuId, {
      mode: b.mode, embed: b.embed, title: b.title, description: b.description, color: b.color,
      mappings: buildMappings(b.mappings)
    });
    const result = await reactionRoleService.syncPanel(client, guild, menu);
    client.reactionroles.save();
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, menu });
  });

  app.delete('/api/guild/:id/reactionroles/:menuId', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const menu = client.reactionroles.deleteMenu(guild.id, req.params.menuId);
    if (!menu) return res.status(404).json({ error: 'Panel not found' });
    // Best effort: delete the bot's own panel message.
    if (menu.managed && menu.messageId) {
      const ch = guild.channels.cache.get(menu.channelId);
      const msg = ch && await ch.messages.fetch(menu.messageId).catch(() => null);
      if (msg && msg.author?.id === client.user.id) await msg.delete().catch(() => {});
    }
    res.json({ success: true });
  });

  // ── Moderators (mod users + roles) ────────────
  app.get('/api/guild/:id/moderators', requireAuth, guildGuard, (req, res) => {
    const m = client.store.moderators.get(req.params.id) || { users: [], roles: [] };
    res.json({ users: m.users || [], roles: m.roles || [] });
  });

  app.put('/api/guild/:id/moderators', requireAuth, guildGuard, (req, res) => {
    const idList = v => Array.isArray(v) ? [...new Set(v.filter(x => /^\d{16,20}$/.test(x)))] : [];
    const config = { users: idList(req.body?.users), roles: idList(req.body?.roles) };
    client.store.moderators.set(req.params.id, config);
    client.store.saveModerators();
    res.json({ success: true, config });
  });

  // ── Command toggles (per guild) ───────────────
  app.get('/api/guild/:id/command-toggles', requireAuth, guildGuard, (req, res) => {
    res.json({ disabled: client.store.getDisabledCommands(req.params.id) });
  });

  app.put('/api/guild/:id/command-toggles', requireAuth, guildGuard, (req, res) => {
    const { name, enabled } = req.body || {};
    if (!name || !client.commands.has(name)) return res.status(400).json({ error: 'Unknown command.' });
    const disabled = client.store.setCommandEnabled(req.params.id, name, !!enabled);
    res.json({ success: true, disabled });
  });

  // ── General settings (per guild) ──────────────
  app.get('/api/guild/:id/prefix', requireAuth, guildGuard, (req, res) => {
    res.json({ prefix: client.store.getPrefix(req.params.id), defaultPrefix: require('../config').prefix });
  });

  app.put('/api/guild/:id/prefix', requireAuth, guildGuard, (req, res) => {
    const p = typeof req.body?.prefix === 'string' ? req.body.prefix.trim() : '';
    if (/\s/.test(p) || p.length > 5)
      return res.status(400).json({ error: 'Prefix must be 1 to 5 characters with no spaces.' });
    res.json({ success: true, prefix: client.store.setPrefix(req.params.id, p) });
  });

  // ── Leveling ──────────────────────────────────
  app.get('/api/guild/:id/leveling', requireAuth, guildGuard, (req, res) => {
    res.json({
      config: client.levels.getConfig(req.params.id),
      curves: CURVES,
      announceModes: ANNOUNCE_MODES
    });
  });

  app.put('/api/guild/:id/leveling', requireAuth, guildGuard, (req, res) => {
    const config = client.levels.setConfig(req.params.id, req.body || {});
    res.json({ success: true, config });
  });

  // ── Activity ──────────────────────────────────
  app.get('/api/guild/:id/activity', requireAuth, guildGuard, (req, res) => {
    res.json({ config: client.activity.getConfig(req.params.id) });
  });

  app.put('/api/guild/:id/activity', requireAuth, guildGuard, (req, res) => {
    const config = client.activity.setConfig(req.params.id, req.body || {});
    res.json({ success: true, config });
  });

  // ── Trust ─────────────────────────────────────
  app.get('/api/guild/:id/trust', requireAuth, guildGuard, (req, res) => {
    res.json({ config: client.trust.getConfig(req.params.id) });
  });

  app.put('/api/guild/:id/trust', requireAuth, guildGuard, (req, res) => {
    res.json({ success: true, config: client.trust.setConfig(req.params.id, req.body || {}) });
  });

  // ── Alt Detection ─────────────────────────────
  app.get('/api/guild/:id/altdetect', requireAuth, guildGuard, (req, res) => {
    res.json({
      config:   client.altdetect.getConfig(req.params.id),
      signals:  ALT_SIGNALS,
      presets:  SENSITIVITY_PRESETS,
      actions:  ALT_ACTIONS,
      flags:    client.altdetect.listFlags(req.params.id).slice(0, 50),
      pending:  client.altdetect.pendingCount(req.params.id)
    });
  });

  app.put('/api/guild/:id/altdetect', requireAuth, guildGuard, (req, res) => {
    if (!client.guilds.cache.has(req.params.id)) return res.status(404).json({ error: 'Guild not found' });
    const config = client.altdetect.setConfig(req.params.id, req.body || {});
    res.json({ success: true, config });
  });

  app.post('/api/guild/:id/altdetect/flags/:userId', requireAuth, guildGuard, (req, res) => {
    const status = ['cleared', 'actioned', 'pending'].includes(req.body?.status) ? req.body.status : 'cleared';
    const flag = client.altdetect.setFlagStatus(req.params.id, req.params.userId, status, req.session.userId);
    if (!flag) return res.status(404).json({ error: 'Flag not found' });
    res.json({ success: true, flag });
  });

  // ── Polls ─────────────────────────────────────
  const pollSummary = p => {
    const a = pollService.analytics(p);
    return {
      id: p.id, question: p.question, status: p.status, channelId: p.channelId,
      multi: p.multi, maxChoices: p.maxChoices, anonymous: p.anonymous, hideResults: p.hideResults,
      createdBy: p.createdBy, createdAt: p.createdAt, endsAt: p.endsAt, scheduledFor: p.scheduledFor,
      voters: a.voters, totalVotes: a.totalVotes, options: a.options
    };
  };

  app.get('/api/guild/:id/polls', requireAuth, guildGuard, (req, res) => {
    res.json({
      config: client.polls.getConfig(req.params.id),
      polls:  client.polls.listPolls(req.params.id).map(pollSummary)
    });
  });

  app.put('/api/guild/:id/polls/config', requireAuth, guildGuard, (req, res) => {
    res.json({ success: true, config: client.polls.setConfig(req.params.id, req.body || {}) });
  });

  app.post('/api/guild/:id/polls', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const b = req.body || {};
    const channel = guild.channels.cache.get(b.channelId);
    if (!channel || channel.type !== 0) return res.status(400).json({ error: 'Pick a valid text channel.' });

    const options = Array.isArray(b.options) ? b.options.map(s => String(s).trim()).filter(Boolean) : [];
    if (!b.question || options.length < 2) return res.status(400).json({ error: 'A poll needs a question and at least two options.' });
    const config = client.polls.getConfig(guild.id);
    if (options.length > config.maxOptions) return res.status(400).json({ error: `At most ${config.maxOptions} options.` });

    try {
      const poll = await pollService.createPoll(client, {
        guild, channel, creator: { id: req.session.userId },
        question: String(b.question).slice(0, 256), options,
        multi: !!b.multi, maxChoices: parseInt(b.maxChoices, 10) || options.length,
        anonymous: !!b.anonymous, hideResults: !!b.hideResults,
        allowedRoleIds: Array.isArray(b.allowedRoleIds) ? b.allowedRoleIds : [],
        durationMs: Math.max(0, parseInt(b.durationMin, 10) || 0) * 60000,
        scheduleMs: Math.max(0, parseInt(b.scheduleMin, 10) || 0) * 60000
      });
      res.json({ success: true, poll: pollSummary(poll) });
    } catch (e) {
      logger.error('Dashboard poll create failed:', e.message);
      res.status(500).json({ error: 'Could not post the poll. Check that I can send messages in that channel.' });
    }
  });

  app.post('/api/guild/:id/polls/:pollId/:op', requireAuth, guildGuard, async (req, res) => {
    const poll = client.polls.getPoll(req.params.id, req.params.pollId);
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    const by = req.session.username || 'dashboard';
    if (req.params.op === 'end') await pollService.endPoll(client, poll, by);
    else if (req.params.op === 'cancel') await pollService.cancelPoll(client, poll);
    else return res.status(400).json({ error: 'Unknown action' });
    res.json({ success: true, poll: pollSummary(poll) });
  });

  // ── Social media notifications ────────────────
  app.get('/api/guild/:id/social', requireAuth, guildGuard, (req, res) => {
    res.json({ config: client.social.getConfig(req.params.id), providers: providerMeta() });
  });

  app.put('/api/guild/:id/social', requireAuth, guildGuard, (req, res) => {
    const current = client.social.getConfig(req.params.id);
    const incoming = req.body?.platforms || {};
    for (const pid of Object.keys(current.platforms)) {
      const s = incoming[pid];
      if (!s) continue;
      const pc = current.platforms[pid];
      pc.enabled = !!s.enabled;
      pc.channelId = s.channelId || null;
      pc.mentionRoleId = s.mentionRoleId || null;
      if (typeof s.template === 'string') pc.template = s.template;
    }
    res.json({ success: true, config: client.social.setConfig(req.params.id, current) });
  });

  app.post('/api/guild/:id/social/creator', requireAuth, guildGuard, async (req, res) => {
    const { platform, account } = req.body || {};
    const result = await socialService.addCreator(client, req.params.id, platform, account);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true, config: client.social.getConfig(req.params.id) });
  });

  app.post('/api/guild/:id/social/creator/delete', requireAuth, guildGuard, (req, res) => {
    const { platform, key } = req.body || {};
    socialService.removeCreator(client, req.params.id, platform, key);
    res.json({ success: true, config: client.social.getConfig(req.params.id) });
  });

  app.post('/api/guild/:id/social/test', requireAuth, guildGuard, async (req, res) => {
    const guild = client.guilds.cache.get(req.params.id);
    if (!guild) return res.status(404).json({ error: 'Guild not found' });
    const result = await socialService.sendTest(client, guild, req.body?.platform);
    if (result.error) return res.status(400).json({ error: result.error });
    res.json({ success: true });
  });

  // ── Transcripts ───────────────────────────────
  app.get('/api/guild/:id/transcripts', requireAuth, guildGuard, (req, res) => {
    const dir = path.join(__dirname, '..', '..', 'transcripts');
    if (!fs.existsSync(dir)) return res.json([]);
    try {
      const list = fs.readdirSync(dir)
        .filter(f => f.startsWith(req.params.id + '-') && f.endsWith('.json'))
        .map(filename => {
          try {
            const d = JSON.parse(fs.readFileSync(path.join(dir, filename), 'utf8'));
            return {
              filename,
              number:       d.number,
              channelName:  d.channelName,
              type:         d.type,
              priority:     d.priority,
              closedAt:     d.closedAt,
              closedBy:     d.closedBy,
              messageCount: d.messages?.length || 0
            };
          } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => (b.closedAt || 0) - (a.closedAt || 0));
      res.json(list);
    } catch { res.json([]); }
  });

  app.get('/api/transcript/:filename', requireAuth, async (req, res) => {
    const filename = path.basename(req.params.filename);
    if (!filename.endsWith('.json')) return res.status(400).json({ error: 'Invalid file' });

    // Transcripts are named "<guildId>-...json", so verify access to that guild.
    const guildId = filename.split('-')[0];
    if (!await oauthClient.assertGuildAccess(client, req.session, guildId)) {
      logger.warn(`Blocked transcript access: user=${req.session.userId} file=${filename} ip=${clientIp(req)}`);
      return res.status(403).json({ error: 'You do not have access to this transcript.' });
    }

    const file = path.join(__dirname, '..', '..', 'transcripts', filename);
    if (!fs.existsSync(file)) return res.status(404).json({ error: 'Not found' });
    try { res.json(JSON.parse(fs.readFileSync(file, 'utf8'))); }
    catch { res.status(500).json({ error: 'Failed to read transcript' }); }
  });

  // ── Bot log files (owner only, may contain sensitive system info) ──
  app.get('/api/logs/:file', requireAuth, requireOwner, (req, res) => {
    const allowed = { bot: 'combined.log', error: 'error.log', out: 'out.log' };
    const filename = allowed[req.params.file];
    if (!filename) return res.status(400).json({ error: 'Invalid log file' });
    const logFile = path.join(__dirname, '..', '..', 'logs', filename);
    if (!fs.existsSync(logFile)) return res.json({ lines: [] });
    try {
      const lines = fs.readFileSync(logFile, 'utf8').trim().split('\n').slice(-300).reverse();
      res.json({ lines });
    } catch { res.json({ lines: [] }); }
  });

  // ── Applications ──────────────────────────────
  // Forms ─ list/create/reorder/update/duplicate/delete
  app.get('/api/guild/:id/applications/forms', requireAuth, guildGuard, (req, res) => {
    res.json({
      forms:  client.applications.listForms(req.params.id),
      config: client.applications.getConfig(req.params.id),
      meta:   {
        questionTypes: APP_QUESTION_TYPES, statuses: APP_STATUSES, statusMeta: APP_STATUS_META,
        roleStatuses: APP_ROLE_STATUSES, buttonStyles: APP_BUTTON_STYLES, panelDefaults: APP_DEFAULT_PANEL
      }
    });
  });

  app.post('/api/guild/:id/applications/forms', requireAuth, guildGuard, (req, res) => {
    const form = client.applications.createForm(req.params.id, req.body || {});
    res.json({ success: true, form });
  });

  app.put('/api/guild/:id/applications/forms-order', requireAuth, guildGuard, (req, res) => {
    const order = Array.isArray(req.body?.order) ? req.body.order.filter(x => typeof x === 'string') : [];
    res.json({ success: true, forms: client.applications.reorderForms(req.params.id, order) });
  });

  app.post('/api/guild/:id/applications/forms/:formId/duplicate', requireAuth, guildGuard, (req, res) => {
    const form = client.applications.duplicateForm(req.params.id, req.params.formId);
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true, form });
  });

  app.put('/api/guild/:id/applications/forms/:formId', requireAuth, guildGuard, (req, res) => {
    const form = client.applications.updateForm(req.params.id, req.params.formId, req.body || {});
    if (!form) return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true, form });
  });

  app.delete('/api/guild/:id/applications/forms/:formId', requireAuth, guildGuard, (req, res) => {
    if (!client.applications.deleteForm(req.params.id, req.params.formId))
      return res.status(404).json({ error: 'Form not found' });
    res.json({ success: true });
  });

  // Config
  app.put('/api/guild/:id/applications/config', requireAuth, guildGuard, (req, res) => {
    res.json({ success: true, config: client.applications.setConfig(req.params.id, req.body || {}) });
  });

  // Post / refresh the live applications panel in a channel.
  app.post('/api/guild/:id/applications/panel', requireAuth, guildGuard, async (req, res) => {
    const channelId = typeof req.body?.channelId === 'string' ? req.body.channelId : null;
    const result = await applicationService.publishPanel(client, req.params.id, channelId);
    if (!result.ok) return res.status(400).json({ error: result.error });
    res.json({ success: true, channelId: result.channelId, config: client.applications.getConfig(req.params.id) });
  });

  // Export (must be declared before the :appId routes)
  app.get('/api/guild/:id/applications/export', requireAuth, guildGuard, (req, res) => {
    const apps = client.applications.listApplications(req.params.id, {
      status: req.query.status, formId: req.query.formId, search: req.query.search, limit: 200
    });
    if (req.query.format === 'json') {
      res.setHeader('Content-Disposition', `attachment; filename="applications-${req.params.id}.json"`);
      return res.json(apps.map(a => ({ ...a, actions: undefined })));
    }
    const csvCell = v => {
      const s = String(v ?? '');
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = [['id', 'form', 'user_tag', 'user_id', 'status', 'created_at', 'answers']];
    for (const a of apps) {
      const answers = (a.answers || []).map(x => `${x.label}: ${x.value}`).join(' | ');
      rows.push([a.id, a.formName, a.userTag, a.userId, a.status, new Date(a.createdAt).toISOString(), answers]);
    }
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="applications-${req.params.id}.csv"`);
    res.send(rows.map(r => r.map(csvCell).join(',')).join('\n'));
  });

  // Applications ─ list (with filters) + counts
  app.get('/api/guild/:id/applications', requireAuth, guildGuard, (req, res) => {
    res.json({
      applications: client.applications.listApplications(req.params.id, {
        status: req.query.status, formId: req.query.formId, search: req.query.search,
        limit: req.query.limit, offset: req.query.offset
      }),
      counts: client.applications.countByStatus(req.params.id)
    });
  });

  // Perform a review action from the dashboard.
  app.post('/api/guild/:id/applications/:appId/action', requireAuth, guildGuard, async (req, res) => {
    const action = req.body?.action;
    if (!(action in applicationService.ACTION_STATUS))
      return res.status(400).json({ error: 'Unknown action.' });
    const note = typeof req.body?.note === 'string' ? req.body.note.slice(0, 1500) : null;
    if ((action === 'deny' || action === 'info') && !note?.trim())
      return res.status(400).json({ error: 'A message is required for this action.' });

    const updated = await applicationService.applyDecision(client, {
      guildId: req.params.id, appId: req.params.appId, action, note,
      reviewer: { id: req.session.userId, tag: req.session.username || 'Dashboard' }
    });
    if (!updated) return res.status(404).json({ error: 'Application not found' });
    res.json({ success: true, application: updated });
  });

  app.get('/api/guild/:id/applications/:appId', requireAuth, guildGuard, (req, res) => {
    const app2 = client.applications.getApplication(req.params.id, req.params.appId);
    if (!app2) return res.status(404).json({ error: 'Application not found' });
    res.json(app2);
  });

  const server = http.createServer(app);
  attachChat(server, sessionMiddleware, client);
  server.listen(PORT, () => {
    console.log(`📊 Dashboard → http://localhost:${PORT}`);
  });
};
