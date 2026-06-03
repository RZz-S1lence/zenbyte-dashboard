require('dotenv').config();
const { GatewayIntentBits } = require('discord.js');

module.exports = {
  token:   process.env.DISCORD_TOKEN,
  ownerId: process.env.OWNER_ID || '1462546638970032376',
  // When set, slash commands register instantly to this guild only (great for testing).
  // When empty, commands register globally (can take up to ~1h to propagate).
  guildId: process.env.GUILD_ID || null,
  debug:   process.env.DEBUG === 'true',

  // Text-command prefix. Every slash command also works as `<prefix>name`.
  prefix:  process.env.PREFIX || '?',

  // Prefix (text) commands need Discord's privileged "Message Content" intent, which
  // is restricted once a bot is in 100+ servers. Set ENABLE_PREFIX_COMMANDS=false to
  // turn them off and run slash-command-only if you cannot keep that intent.
  prefixEnabled: process.env.ENABLE_PREFIX_COMMANDS !== 'false',

  dashboard: {
    port:          process.env.DASHBOARD_PORT || 3000,
    sessionSecret: process.env.SESSION_SECRET || 'zenbyte-session-secret',
    // Public base URL of the dashboard, used to build the OAuth2 redirect URI.
    url:           process.env.DASHBOARD_URL || null,
    // Invite to the ZenByte support server, shown on the dashboard.
    supportInvite: process.env.SUPPORT_INVITE || 'https://discord.gg/c6Ufke8zDw'
  },

  // Discord OAuth2 (dashboard login). Register the redirect URI
  // <DASHBOARD_URL>/auth/discord/callback in the Discord developer portal.
  oauth: {
    clientId:     process.env.DISCORD_CLIENT_ID || null,
    clientSecret: process.env.DISCORD_CLIENT_SECRET || null,
    scopes:       ['identify', 'guilds']
  },

  // Twitch live notifications (optional). Create an app at https://dev.twitch.tv/console/apps
  // → "Register Your Application" → copy the Client ID and generate a Client Secret.
  twitch: {
    clientId:     process.env.TWITCH_CLIENT_ID || null,
    clientSecret: process.env.TWITCH_CLIENT_SECRET || null
  },

  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildMessageTyping,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildWebhooks,
    GatewayIntentBits.GuildExpressions
  ],

  COLORS: {
    brand:   0x5865f2,
    success: 0x57f287,
    error:   0xed4245,
    warn:    0xfee75c,
    info:    0x5865f2
  }
};
