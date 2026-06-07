// ── Premium feature limits ────────────────────────
// Single source of truth for every gated feature. `free` applies to guilds with
// no active premium slot; `premium` applies once isPremium(guildId) is true.
// `label`/`unit` are used to build the friendly upgrade message.
const LIMITS = {
  pollOptions:          { free: 4,  premium: 25, label: 'poll answer options',            unit: 'options' },
  reactionPanels:       { free: 2,  premium: 15, label: 'reaction-role panels',           unit: 'panels' },
  reactionMappings:     { free: 5,  premium: 20, label: 'roles per reaction-role panel',  unit: 'roles' },
  autoroleRoles:        { free: 2,  premium: 10, label: 'autorole roles',                 unit: 'roles' },
  socialCreators:       { free: 2,  premium: 25, label: 'social alert creators',          unit: 'creators' },
  levelingRewards:      { free: 10, premium: 25, label: 'leveling role rewards',          unit: 'rewards' },
  memberCounters:       { free: 3,  premium: 10, label: 'member counters',                unit: 'counters' },
  applicationForms:     { free: 2,  premium: 10, label: 'application forms',              unit: 'forms' },
  applicationQuestions: { free: 8,  premium: 25, label: 'questions per application form', unit: 'questions' },
  ticketPanels:         { free: 2,  premium: 10, label: 'ticket panels',                  unit: 'panels' },
  ticketForms:          { free: 2,  premium: 10, label: 'ticket forms',                   unit: 'forms' },
  autoResponses:        { free: 5,  premium: 50, label: 'auto responses',                 unit: 'responses' }
};

// The effective cap for a feature given whether the guild is premium.
function limitFor(feature, isPrem) {
  const l = LIMITS[feature];
  if (!l) throw new Error(`Unknown premium feature: ${feature}`);
  return isPrem ? l.premium : l.free;
}

module.exports = { LIMITS, limitFor };
