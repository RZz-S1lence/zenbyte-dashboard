const path = require('path');
const fs   = require('fs');
const Database = require('better-sqlite3');
const logger = require('../utils/logger');

const ROOT     = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(ROOT, 'data');
const DB_FILE  = process.env.DATABASE_FILE || path.join(DATA_DIR, 'zenbyte.db');

let db = null;

// ── Migrations ────────────────────────────────────
// Append-only list. Each entry runs once, inside a transaction, and is recorded
// in schema_migrations so re-running on startup is a no-op. NEVER edit an applied
// migration — add a new one instead.
const MIGRATIONS = [
  {
    id: '001_applications',
    up: d => {
      d.exec(`
        CREATE TABLE application_config (
          guild_id   TEXT PRIMARY KEY,
          config     TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE application_forms (
          id          TEXT PRIMARY KEY,
          guild_id    TEXT NOT NULL,
          name        TEXT NOT NULL,
          description TEXT,
          enabled     INTEGER NOT NULL DEFAULT 1,
          questions   TEXT NOT NULL DEFAULT '[]',
          position    INTEGER NOT NULL DEFAULT 0,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
        CREATE INDEX idx_forms_guild ON application_forms (guild_id, position);

        CREATE TABLE applications (
          id                 TEXT PRIMARY KEY,
          guild_id           TEXT NOT NULL,
          form_id            TEXT NOT NULL,
          form_name          TEXT NOT NULL,
          user_id            TEXT NOT NULL,
          user_tag           TEXT NOT NULL,
          answers            TEXT NOT NULL DEFAULT '[]',
          status             TEXT NOT NULL DEFAULT 'pending',
          review_channel_id  TEXT,
          review_message_id  TEXT,
          created_at         INTEGER NOT NULL,
          updated_at         INTEGER NOT NULL
        );
        CREATE INDEX idx_apps_guild        ON applications (guild_id, created_at DESC);
        CREATE INDEX idx_apps_guild_status ON applications (guild_id, status);
        CREATE INDEX idx_apps_user         ON applications (guild_id, user_id);

        CREATE TABLE application_actions (
          id             INTEGER PRIMARY KEY AUTOINCREMENT,
          application_id TEXT NOT NULL,
          guild_id       TEXT NOT NULL,
          reviewer_id    TEXT,
          reviewer_tag   TEXT,
          action         TEXT NOT NULL,
          note           TEXT,
          created_at     INTEGER NOT NULL
        );
        CREATE INDEX idx_actions_app ON application_actions (application_id, created_at);
      `);
    }
  },
  {
    id: '002_member_counters',
    up: d => {
      d.exec(`
        CREATE TABLE member_counters (
          id          TEXT PRIMARY KEY,
          guild_id    TEXT NOT NULL,
          channel_id  TEXT NOT NULL,
          type        TEXT NOT NULL,
          template    TEXT NOT NULL,
          role_id     TEXT,
          enabled     INTEGER NOT NULL DEFAULT 1,
          position    INTEGER NOT NULL DEFAULT 0,
          last_value  INTEGER,
          last_edit   INTEGER,
          created_at  INTEGER NOT NULL,
          updated_at  INTEGER NOT NULL
        );
        CREATE INDEX idx_counters_guild ON member_counters (guild_id, position);
      `);
    }
  },
  {
    id: '003_premium',
    up: d => {
      d.exec(`
        -- One row per premium account, keyed by Discord user id. Set by the Lemon
        -- Squeezy webhook (paid) or the owner ?give-premium command (comped).
        CREATE TABLE premium_users (
          user_id         TEXT PRIMARY KEY,        -- Discord user id
          premium_tier    TEXT,                    -- 'pro' | 'max' | 'lifetime' | 'complimentary' | NULL
          premium_source  TEXT,                    -- 'lemonsqueezy' | 'owner'
          subscription_id TEXT,                    -- LS subscription id (maps cancel/expire events back to a user)
          customer_id     TEXT,                    -- LS customer id
          expires_at      INTEGER,                 -- ms epoch; NULL when lifetime = 1
          lifetime        INTEGER NOT NULL DEFAULT 0,
          extra_slots     INTEGER NOT NULL DEFAULT 0,  -- extra permanent slots bought on top of the base
          slots           INTEGER NOT NULL DEFAULT 1,  -- base server-slot count (from tier or owner grant)
          updated_at      INTEGER NOT NULL
        );

        -- Which guilds a user has activated with their slots. UNIQUE(guild_id) means a
        -- guild can be covered by at most one slot at a time.
        CREATE TABLE premium_servers (
          user_id     TEXT NOT NULL,
          guild_id    TEXT NOT NULL UNIQUE,
          assigned_at INTEGER NOT NULL,
          PRIMARY KEY (user_id, guild_id)
        );
        CREATE INDEX idx_premium_servers_guild ON premium_servers (guild_id);
      `);
    }
  }
];

function runMigrations(d) {
  d.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)`);
  const applied = new Set(d.prepare('SELECT id FROM schema_migrations').all().map(r => r.id));
  const record  = d.prepare('INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)');
  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const tx = d.transaction(() => { m.up(d); record.run(m.id, Date.now()); });
    tx();
    logger.info(`Applied DB migration: ${m.id}`);
  }
}

// Returns the shared, lazily-opened database connection. Safe to call repeatedly.
function getDb() {
  if (db) return db;
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  db = new Database(DB_FILE);
  db.pragma('journal_mode = WAL');   // better concurrency + durability
  db.pragma('foreign_keys = ON');
  runMigrations(db);
  logger.success(`SQLite ready (${path.relative(ROOT, DB_FILE)}).`);
  return db;
}

function closeDb() {
  if (db) { try { db.close(); } catch {} db = null; }
}

module.exports = { getDb, closeDb, DB_FILE };
