// Per-user, per-command cooldown tracking. Returns { ok: true } or { ok: false, remaining }.
function check(client, command, userId) {
  const seconds = command.cooldown || 0;
  if (seconds <= 0) return { ok: true };

  const name = command.data.name;
  if (!client.cooldowns.has(name)) client.cooldowns.set(name, new Map());
  const timestamps = client.cooldowns.get(name);

  const now = Date.now();
  const expiresAt = timestamps.get(userId);
  if (expiresAt && now < expiresAt) {
    return { ok: false, remaining: ((expiresAt - now) / 1000).toFixed(1) };
  }

  timestamps.set(userId, now + seconds * 1000);
  setTimeout(() => timestamps.delete(userId), seconds * 1000);
  return { ok: true };
}

module.exports = { check };
