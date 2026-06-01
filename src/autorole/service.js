const logger = require('../utils/logger');

// Assigns the configured join roles to a member. Called from guildMemberAdd.
// Humans get config.roleIds, bots get config.botRoleIds. Roles the bot cannot
// assign (managed, @everyone, or above its top role) are skipped silently.
async function applyOnJoin(client, member) {
  const config = client.autoroles.getConfig(member.guild.id);
  if (!config.enabled) return;

  const ids = member.user.bot ? config.botRoleIds : config.roleIds;
  if (!ids.length) return;

  const me = member.guild.members.me;
  const roles = ids
    .map(id => member.guild.roles.cache.get(id))
    .filter(r => r && !r.managed && r.id !== member.guild.id &&
                 (!me || r.position < me.roles.highest.position));

  if (!roles.length) return;

  try {
    await member.roles.add(roles, 'Autorole on join');
    logger.debug?.(`Autorole: gave ${roles.length} role(s) to ${member.user.tag} in ${member.guild.name}.`);
  } catch (e) {
    logger.debug?.(`Autorole add failed for ${member.user.tag}: ${e.message}`);
  }
}

module.exports = { applyOnJoin };
