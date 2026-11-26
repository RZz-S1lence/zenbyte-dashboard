// Remembers which messages the bot itself deleted (AutoMod etc.), so the
// "Message Deleted" log can say who did it. Discord's audit log is too slow
// and unreliable for this, so we track it ourselves. Entries expire after 60s.
const TTL_MS = 60_000;
const marked = new Map(); // messageId -> { reason, ts }

function mark(ids, reason) {
  const now = Date.now();
  for (const id of [].concat(ids)) if (id) marked.set(id, { reason, ts: now });
  if (marked.size > 5000) {
    for (const [id, v] of marked) if (now - v.ts > TTL_MS) marked.delete(id);
  }
}

// Returns the reason (string) once and forgets the id, or null if the bot didn't delete it.
function take(id) {
  const v = marked.get(id);
  if (!v) return null;
  marked.delete(id);
  return Date.now() - v.ts <= TTL_MS ? v.reason : null;
}

module.exports = { mark, take };
