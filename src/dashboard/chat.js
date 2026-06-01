const { Server } = require('socket.io');
const logger = require('../utils/logger');
const { assertGuildAccess } = require('./auth');

const roomFor = (guildId, channelId) => `ticket:${guildId}:${channelId}`;

function serializeMessage(message) {
  return {
    id:           message.id,
    authorTag:    message.author?.tag || 'Unknown',
    authorId:     message.author?.id || null,
    authorAvatar: message.author?.displayAvatarURL?.({ size: 64 }) || null,
    bot:          !!message.author?.bot,
    content:      message.content || '',
    attachments:  [...(message.attachments?.values() || [])].map(a => ({
      url: a.url, name: a.name, contentType: a.contentType || null
    })),
    timestamp:    message.createdTimestamp || Date.now()
  };
}

// Attaches Socket.IO to the dashboard HTTP server and bridges a ticket's Discord
// channel with connected web clients in real time.
function attachChat(server, sessionMiddleware, client) {
  const io = new Server(server, { path: '/socket.io' });
  client.io = io;

  io.engine.use(sessionMiddleware);
  io.use((socket, next) => {
    const session = socket.request.session;
    if (session?.userId) return next();
    next(new Error('Unauthorized'));
  });

  io.on('connection', socket => {
    const session = socket.request.session;
    let current = null; // { guildId, channelId }

    socket.on('join', async ({ guildId, channelId }) => {
      // Server-side authorization: user must be a live admin of this guild.
      if (!await assertGuildAccess(client, session, guildId)) {
        logger.warn(`Blocked WS join: user=${session.userId} guild=${guildId}`);
        socket.emit('chat_error', 'You do not have access to this server.');
        return;
      }
      if (!client.store.isTicketChannel(guildId, channelId)) {
        socket.emit('chat_error', 'That ticket is not open.');
        return;
      }
      if (current) socket.leave(roomFor(current.guildId, current.channelId));
      current = { guildId, channelId };
      socket.join(roomFor(guildId, channelId));

      const channel = client.channels.cache.get(channelId);
      if (channel) {
        const recent = await channel.messages.fetch({ limit: 30 }).catch(() => null);
        if (recent) socket.emit('history', [...recent.values()].reverse().map(serializeMessage));
      }
    });

    socket.on('staff_message', async ({ content }) => {
      if (!current || !content?.trim()) return;
      // Re-verify access live on every send (immediate revocation if admin is lost).
      if (!await assertGuildAccess(client, session, current.guildId, { fresh: true })) {
        logger.warn(`Blocked WS message: user=${session.userId} guild=${current.guildId}`);
        socket.emit('chat_error', 'You no longer have access to this server.');
        socket.leave(roomFor(current.guildId, current.channelId));
        current = null;
        return;
      }
      const channel = client.channels.cache.get(current.channelId);
      if (!channel) return;
      const name = session.username || 'Staff';
      await channel.send({ content: `🌐 **${name}:** ${content.slice(0, 1800)}` }).catch(() => {});
    });

    socket.on('typing', () => {
      if (!current) return;
      const name = socket.request.session.username || 'Staff';
      socket.to(roomFor(current.guildId, current.channelId)).emit('typing', { name });
    });

    socket.on('leave', () => {
      if (current) { socket.leave(roomFor(current.guildId, current.channelId)); current = null; }
    });
  });

  logger.success('Live chat (Socket.IO) attached.');
  return io;
}

// Called from the message listener to push a Discord ticket message to web clients.
function broadcastMessage(client, message) {
  if (!client.io || !message.guild) return;
  if (!client.store.isTicketChannel(message.guild.id, message.channel.id)) return;
  client.io.to(roomFor(message.guild.id, message.channel.id)).emit('message', serializeMessage(message));
}

module.exports = { attachChat, broadcastMessage };
