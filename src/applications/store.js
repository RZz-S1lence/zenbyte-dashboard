const crypto = require('crypto');
const { getDb } = require('../database/db');
const { mergeConfig, sanitizeQuestions, STATUSES } = require('./config');

const newId = () => crypto.randomBytes(6).toString('hex'); // 12 hex chars

// SQLite-backed store for the applications system. All methods are synchronous
// (better-sqlite3), matching how the rest of the bot reads/writes config.
class ApplicationStore {
  constructor() {
    this.db = getDb();
    const q = sql => this.db.prepare(sql);

    this.s = {
      getConfig:   q('SELECT config FROM application_config WHERE guild_id = ?'),
      setConfig:   q(`INSERT INTO application_config (guild_id, config, updated_at) VALUES (@g, @c, @t)
                      ON CONFLICT(guild_id) DO UPDATE SET config = @c, updated_at = @t`),

      listForms:   q('SELECT * FROM application_forms WHERE guild_id = ? ORDER BY position ASC, created_at ASC'),
      getForm:     q('SELECT * FROM application_forms WHERE guild_id = ? AND id = ?'),
      maxPosition: q('SELECT COALESCE(MAX(position), -1) AS m FROM application_forms WHERE guild_id = ?'),
      insertForm:  q(`INSERT INTO application_forms (id, guild_id, name, description, enabled, questions, position, created_at, updated_at)
                      VALUES (@id, @guild_id, @name, @description, @enabled, @questions, @position, @created_at, @updated_at)`),
      updateForm:  q(`UPDATE application_forms SET name=@name, description=@description, enabled=@enabled,
                      questions=@questions, updated_at=@updated_at WHERE guild_id=@guild_id AND id=@id`),
      setFormPos:  q('UPDATE application_forms SET position=@position, updated_at=@updated_at WHERE guild_id=@guild_id AND id=@id'),
      deleteForm:  q('DELETE FROM application_forms WHERE guild_id = ? AND id = ?'),

      insertApp:   q(`INSERT INTO applications (id, guild_id, form_id, form_name, user_id, user_tag, answers, status, created_at, updated_at)
                      VALUES (@id, @guild_id, @form_id, @form_name, @user_id, @user_tag, @answers, @status, @created_at, @updated_at)`),
      getApp:      q('SELECT * FROM applications WHERE guild_id = ? AND id = ?'),
      setAppStatus:q('UPDATE applications SET status=@status, updated_at=@updated_at WHERE guild_id=@guild_id AND id=@id'),
      setAppReview:q('UPDATE applications SET review_channel_id=@c, review_message_id=@m, updated_at=@t WHERE guild_id=@guild_id AND id=@id'),
      lastAppForUser: q(`SELECT created_at FROM applications WHERE guild_id=? AND user_id=? AND form_id=? ORDER BY created_at DESC LIMIT 1`),

      addAction:   q(`INSERT INTO application_actions (application_id, guild_id, reviewer_id, reviewer_tag, action, note, created_at)
                      VALUES (@application_id, @guild_id, @reviewer_id, @reviewer_tag, @action, @note, @created_at)`),
      listActions: q('SELECT * FROM application_actions WHERE application_id = ? ORDER BY created_at ASC'),

      countByStatus: q('SELECT status, COUNT(*) AS n FROM applications WHERE guild_id = ? GROUP BY status'),

      purgeConfig:  q('DELETE FROM application_config WHERE guild_id = ?'),
      purgeForms:   q('DELETE FROM application_forms WHERE guild_id = ?'),
      purgeApps:    q('DELETE FROM applications WHERE guild_id = ?'),
      purgeActions: q('DELETE FROM application_actions WHERE guild_id = ?')
    };
  }

  // ── Config ──
  getConfig(guildId) {
    const row = this.s.getConfig.get(guildId);
    return mergeConfig(row ? safeParse(row.config) : {});
  }

  setConfig(guildId, partial) {
    const merged = mergeConfig({ ...this.getConfig(guildId), ...(partial || {}) });
    this.s.setConfig.run({ g: guildId, c: JSON.stringify(merged), t: Date.now() });
    return merged;
  }

  // ── Forms ──
  listForms(guildId) {
    return this.s.listForms.all(guildId).map(mapForm);
  }

  getForm(guildId, formId) {
    const row = this.s.getForm.get(guildId, formId);
    return row ? mapForm(row) : null;
  }

  createForm(guildId, data = {}) {
    const now = Date.now();
    const form = {
      id:          newId(),
      guild_id:    guildId,
      name:        (typeof data.name === 'string' && data.name.trim() ? data.name.trim() : 'Untitled Form').slice(0, 100),
      description: (typeof data.description === 'string' ? data.description.trim().slice(0, 500) : '') || null,
      enabled:     data.enabled === false ? 0 : 1,
      questions:   JSON.stringify(sanitizeQuestions(data.questions)),
      position:    (this.s.maxPosition.get(guildId).m + 1),
      created_at:  now,
      updated_at:  now
    };
    this.s.insertForm.run(form);
    return this.getForm(guildId, form.id);
  }

  updateForm(guildId, formId, data = {}) {
    const existing = this.getForm(guildId, formId);
    if (!existing) return null;
    const row = {
      id:          formId,
      guild_id:    guildId,
      name:        (typeof data.name === 'string' && data.name.trim() ? data.name.trim() : existing.name).slice(0, 100),
      description: (data.description === undefined ? existing.description : (String(data.description || '').trim().slice(0, 500) || null)),
      enabled:     (data.enabled === undefined ? (existing.enabled ? 1 : 0) : (data.enabled ? 1 : 0)),
      questions:   JSON.stringify(data.questions === undefined ? existing.questions : sanitizeQuestions(data.questions)),
      updated_at:  Date.now()
    };
    this.s.updateForm.run(row);
    return this.getForm(guildId, formId);
  }

  setFormEnabled(guildId, formId, enabled) {
    const existing = this.getForm(guildId, formId);
    if (!existing) return null;
    return this.updateForm(guildId, formId, { enabled: !!enabled });
  }

  duplicateForm(guildId, formId) {
    const src = this.getForm(guildId, formId);
    if (!src) return null;
    return this.createForm(guildId, {
      name: `${src.name} (Copy)`.slice(0, 100),
      description: src.description,
      enabled: false,
      questions: src.questions
    });
  }

  deleteForm(guildId, formId) {
    return this.s.deleteForm.run(guildId, formId).changes > 0;
  }

  // Persists a new ordering. `orderedIds` is the full list of this guild's form ids.
  reorderForms(guildId, orderedIds) {
    if (!Array.isArray(orderedIds)) return this.listForms(guildId);
    const now = Date.now();
    const tx = this.db.transaction(ids => {
      ids.forEach((fid, i) => this.s.setFormPos.run({ guild_id: guildId, id: fid, position: i, updated_at: now }));
    });
    tx(orderedIds);
    return this.listForms(guildId);
  }

  // ── Applications ──
  createApplication({ guildId, form, userId, userTag, answers }) {
    const now = Date.now();
    const app = {
      id:         newId(),
      guild_id:   guildId,
      form_id:    form.id,
      form_name:  form.name,
      user_id:    userId,
      user_tag:   userTag,
      answers:    JSON.stringify(Array.isArray(answers) ? answers : []),
      status:     'pending',
      created_at: now,
      updated_at: now
    };
    this.s.insertApp.run(app);
    return this.getApplication(guildId, app.id);
  }

  getApplication(guildId, appId) {
    const row = this.s.getApp.get(guildId, appId);
    if (!row) return null;
    const app = mapApp(row);
    app.actions = this.s.listActions.all(appId).map(mapAction);
    return app;
  }

  // Filtered, paginated listing. Filtering/search happens in SQL where possible.
  listApplications(guildId, { status, formId, search, limit = 50, offset = 0 } = {}) {
    const where = ['guild_id = @guild_id'];
    const params = { guild_id: guildId, limit: Math.min(200, Math.max(1, Number(limit) || 50)), offset: Math.max(0, Number(offset) || 0) };
    if (status && STATUSES.includes(status)) { where.push('status = @status'); params.status = status; }
    if (formId) { where.push('form_id = @form_id'); params.form_id = formId; }
    if (search && String(search).trim()) {
      where.push('(user_tag LIKE @q OR user_id LIKE @q OR form_name LIKE @q OR answers LIKE @q)');
      params.q = `%${String(search).trim().slice(0, 80)}%`;
    }
    const sql = `SELECT * FROM applications WHERE ${where.join(' AND ')} ORDER BY created_at DESC LIMIT @limit OFFSET @offset`;
    return this.db.prepare(sql).all(params).map(mapApp);
  }

  setApplicationStatus(guildId, appId, status) {
    if (!STATUSES.includes(status)) return null;
    this.s.setAppStatus.run({ guild_id: guildId, id: appId, status, updated_at: Date.now() });
    return this.getApplication(guildId, appId);
  }

  setReviewMessage(guildId, appId, channelId, messageId) {
    this.s.setAppReview.run({ guild_id: guildId, id: appId, c: channelId || null, m: messageId || null, t: Date.now() });
  }

  addAction(appId, guildId, { reviewerId, reviewerTag, action, note }) {
    this.s.addAction.run({
      application_id: appId, guild_id: guildId,
      reviewer_id: reviewerId || null, reviewer_tag: reviewerTag || null,
      action, note: note || null, created_at: Date.now()
    });
  }

  lastSubmissionTime(guildId, userId, formId) {
    return this.s.lastAppForUser.get(guildId, userId, formId)?.created_at || 0;
  }

  countByStatus(guildId) {
    const out = { total: 0 };
    for (const s of STATUSES) out[s] = 0;
    for (const row of this.s.countByStatus.all(guildId)) { out[row.status] = row.n; out.total += row.n; }
    return out;
  }

  purgeGuild(guildId) {
    const tx = this.db.transaction(() => {
      this.s.purgeActions.run(guildId);
      this.s.purgeApps.run(guildId);
      this.s.purgeForms.run(guildId);
      this.s.purgeConfig.run(guildId);
    });
    tx();
  }
}

// ── Row mappers ──
function safeParse(s, fallback = {}) { try { return JSON.parse(s); } catch { return fallback; } }

function mapForm(row) {
  return {
    id: row.id, guildId: row.guild_id, name: row.name, description: row.description,
    enabled: !!row.enabled, questions: safeParse(row.questions, []),
    position: row.position, createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function mapApp(row) {
  return {
    id: row.id, guildId: row.guild_id, formId: row.form_id, formName: row.form_name,
    userId: row.user_id, userTag: row.user_tag, answers: safeParse(row.answers, []),
    status: row.status, reviewChannelId: row.review_channel_id, reviewMessageId: row.review_message_id,
    createdAt: row.created_at, updatedAt: row.updated_at
  };
}

function mapAction(row) {
  return {
    id: row.id, reviewerId: row.reviewer_id, reviewerTag: row.reviewer_tag,
    action: row.action, note: row.note, createdAt: row.created_at
  };
}

module.exports = { ApplicationStore };
