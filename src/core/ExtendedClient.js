const { Client, Collection, Partials } = require('discord.js');
const { intents } = require('../config');
const Store = require('../database/store');
const { LevelStore } = require('../leveling/store');
const { ActivityStore } = require('../activity/store');
const { TrustStore } = require('../trust/store');
const { AltStore } = require('../altdetect/store');
const { PollStore } = require('../polls/store');
const { SocialStore } = require('../social/store');
const { AutoRoleStore } = require('../autorole/store');
const { ReactionRoleStore } = require('../reactionrole/store');
const loadCommands = require('./loadCommands');
const loadEvents = require('./loadEvents');
const logger = require('../utils/logger');

class ExtendedClient extends Client {
  constructor() {
    // Partials let reaction events fire for messages the bot has not cached
    // (e.g. older reaction-role panels) instead of being silently dropped.
    super({ intents, partials: [Partials.Message, Partials.Channel, Partials.Reaction] });

    this.commands  = new Collection();
    this.cooldowns = new Collection();
    this.store     = new Store();
    this.levels    = new LevelStore();
    this.activity  = new ActivityStore();
    this.trust     = new TrustStore();
    this.altdetect = new AltStore();
    this.polls     = new PollStore();
    this.social    = new SocialStore();
    this.autoroles     = new AutoRoleStore();
    this.reactionroles = new ReactionRoleStore();

    // Backwards-compatible aliases so the dashboard layer can read/write through
    // the same store instance without holding its own copy.
    this.warnings    = this.store.warnings;
    this.moderators  = this.store.moderators;
    this.logChannels = this.store.logChannels;
    this.tickets     = this.store.tickets;
    this.openTickets = this.store.openTickets;
    this.security    = this.store.security;
    this.verification = this.store.verification;
    this.saveWarnings    = () => this.store.saveWarnings();
    this.saveModerators  = () => this.store.saveModerators();
    this.saveLogChannels = () => this.store.saveLogChannels();
    this.saveTickets     = () => this.store.saveTickets();
    this.saveSecurity    = () => this.store.saveSecurity();
    this.saveVerification = () => this.store.saveVerification();
    this.isModerator     = (guildId, member) => this.store.isModerator(guildId, member);
  }

  async start(token) {
    loadCommands(this);
    loadEvents(this);
    await this.login(token);
  }
}

module.exports = ExtendedClient;
