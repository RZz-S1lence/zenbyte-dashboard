const { ownerId } = require('../config');
const logger = require('../utils/logger');
const { assertGuildAccess } = require('./auth');

function clientIp(req) {
  let ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
        || req.socket?.remoteAddress || 'unknown';
  if (ip.startsWith('::ffff:')) ip = ip.slice(7);
  return ip;
}

function requireAuth(req, res, next) {
  if (req.session?.userId) return next();
  logger.warn(`Blocked unauthenticated request: ${req.method} ${req.originalUrl} ip=${clientIp(req)}`);
  res.status(401).json({ error: 'Unauthorized. Please log in with Discord.' });
}

function requireOwner(req, res, next) {
  if (req.session?.userId === ownerId) return next();
  logger.warn(`Blocked non-owner request: user=${req.session?.userId || 'anon'} ${req.method} ${req.originalUrl} ip=${clientIp(req)}`);
  res.status(403).json({ error: 'Forbidden.' });
}

// Guard for every guild-scoped route. Re-verifies live (bot membership + admin)
// on each call; write methods bypass the access cache for immediate revocation.
function requireGuildAccess(client) {
  return async (req, res, next) => {
    if (!req.session?.userId)
      return res.status(401).json({ error: 'Unauthorized. Please log in with Discord.' });

    const guildId = req.params.id;
    const fresh = req.method !== 'GET';
    let ok = false;
    try { ok = await assertGuildAccess(client, req.session, guildId, { fresh }); }
    catch (e) { logger.error('Guild access check errored:', e.message); }

    if (!ok) {
      logger.warn(`Blocked guild access: user=${req.session.userId} guild=${guildId} ${req.method} ${req.originalUrl} ip=${clientIp(req)}`);
      return res.status(403).json({ error: 'You do not have access to this server.' });
    }
    next();
  };
}

module.exports = { requireAuth, requireOwner, requireGuildAccess, clientIp };
