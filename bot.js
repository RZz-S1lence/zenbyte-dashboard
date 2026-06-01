const ExtendedClient = require('./src/core/ExtendedClient');
const startDashboard  = require('./src/dashboard/server');
const { token } = require('./src/config');
const logger = require('./src/utils/logger');

const client = new ExtendedClient();

startDashboard(client);

process.on('unhandledRejection', err => logger.error('Unhandled promise rejection:', err));
process.on('uncaughtException',  err => logger.error('Uncaught exception:', err));
for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { try { client.levels.flush(); client.activity.flush(); client.altdetect.flush(); client.polls.flush(); client.social.flush(); } catch {} process.exit(0); });
}
client.on('error', err => logger.error('Client error:', err));
client.on('shardError', err => logger.error('Shard error:', err));

client.start(token).catch(err => {
  logger.error('Login failed:', err.message);
  process.exit(1);
});
