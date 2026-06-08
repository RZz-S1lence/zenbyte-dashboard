/* ════════════════════════════════════════
   ZenByte Dashboard
   ════════════════════════════════════════ */

// Global state
const state = {
  guildId:   null,   // currently selected guild
  guildData: null,   // { textChannels, categories, roles }
  guilds:    [],     // all guilds list
  ticketForms: [],   // named reusable ticket forms
  ticketPanels: [],  // ticket panels with assigned forms
  greetings:   null, // welcome/leave message config { welcome, leave }
  modRoleIds:  [],   // selected ticket moderator role IDs
  commands:    [],   // cached command list from /api/commands
  cmdDisabled: new Set(), // disabled command names for the selected guild
  cmdCategory: 'all',     // commands page category filter
  cmdStatus:   'all',     // commands page status filter (all|enabled|disabled)
  security:     null, // current anti-nuke config
  securityMeta: null, // { protections, punishments }
  leveling:     null, // current leveling config
  levelingMeta: null, // { curves, announceModes }
  activity:     null, // current activity config
  trust:        null, // current trust config
  altdetect:    null, // current alt detection config
  altMeta:      null, // { signals, presets, actions, flags, pending }
  pollConfig:   null, // current poll settings
  pollList:     [],   // polls for the selected guild
  pollOptions:  null, // draft option strings for the create form
  socialConfig: null, // current social notification config
  socialProviders: [], // provider metadata
  autorole:      null, // current autorole config
  reactionMenus: [],   // reaction-role panels for the selected guild
  reactionModes: [],   // available reaction-role modes
  arspRules:   [],     // auto-response rules for the selected guild
  arspMeta:    null,   // { matchModes, responseTypes }
  arspEditing: null,   // the rule currently being created/edited, or null
  links:         null, // { invite, support } bot-invite and support-server links
  // Applications
  appsForms:   [],     // form list for the selected guild
  appsConfig:  null,   // applications config
  appsMeta:    null,   // { questionTypes, statuses, statusMeta }
  appsEditing: null,   // form currently open in the builder (null = list view)
  appsTabCur:  'forms',// active Applications sub-tab
  appsSubs:    [],     // loaded submissions
  appsCounts:  {},     // submission counts by status
  appsFilter:  { status: '', formId: '', search: '' },
  // Member counters
  mcCounters:  [],     // counter list for the selected guild
  mcTypes:     [],      // counter type metadata
  mcPreview:   null    // live current values per type
};

// ── Inline icon system (replaces emojis everywhere) ─────────────────────────
// Each entry is the inner markup of a 24×24 line icon. Use svg('name') in markup.
const ICONS = {
  check:   '<polyline points="20 6 9 17 4 12"/>',
  x:       '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  plus:    '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  edit:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>',
  trash:   '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  search:  '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  clipboard:'<rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>',
  inbox:   '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
  gear:    '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  megaphone:'<path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>',
  star:    '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  ticket:  '<path d="M3 7v2a2 2 0 1 1 0 6v2c0 1.1.9 2 2 2h14a2 2 0 0 0 2-2v-2a2 2 0 1 1 0-6V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2Z"/><path d="M13 5v14"/>',
  hash:    '<line x1="4" y1="9" x2="20" y2="9"/><line x1="4" y1="15" x2="20" y2="15"/><line x1="10" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="14" y2="21"/>',
  shield:  '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  home:    '<path d="M3 9.5 12 3l9 6.5V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
  users:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  user:    '<circle cx="12" cy="8" r="4"/><path d="M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>',
  bot:     '<rect x="4" y="8" width="16" height="12" rx="2"/><path d="M12 8V4"/><circle cx="9" cy="13" r="1"/><circle cx="15" cy="13" r="1"/><path d="M9 17h6"/>',
  bolt:    '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  signal:  '<circle cx="12" cy="12" r="2"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14M7.76 16.24a6 6 0 0 1 0-8.49M16.24 7.76a6 6 0 0 1 0 8.49M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  clock:   '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  file:    '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>',
  monitor: '<rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>',
  folder:  '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>',
  book:    '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  speaker: '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  trophy:  '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>',
  smile:   '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>',
  eye:     '<path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
  envelope:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 5L2 7"/>',
  gem:     '<path d="M6 3h12l4 6-10 13L2 9Z"/><path d="M11 3 8 9l4 13 4-13-3-6"/><path d="M2 9h20"/>',
  tag:     '<path d="M12 2H2v10l9.29 9.29a2 2 0 0 0 2.83 0l7.17-7.17a2 2 0 0 0 0-2.83L12 2Z"/><line x1="7" y1="7" x2="7.01" y2="7"/>',
  lock:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  ban:     '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>',
  warn:    '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  paperclip:'<path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/>',
  image:   '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.09-3.09a2 2 0 0 0-2.82 0L6 21"/>',
  menu:    '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  arrowDown:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
  chat:    '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  list:    '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
  pause:   '<rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/>',
  download:'<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'
};
// Returns an inline SVG string. `extra` is appended to the class list.
function svg(name, extra = '') {
  const inner = ICONS[name];
  if (!inner) return '';
  return `<svg class="ic ${extra}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${inner}</svg>`;
}
// A small filled status dot (green/yellow/red) — replaces 🟢 🟡 🔴.
function dot(color) { return `<span class="sdot" style="background:${color}"></span>`; }

// A small "Premium" chip (gem icon + label) shown next to gated features so
// users see a feature needs premium up front, not at submit time.
function premiumChip(label = 'Premium') {
  return `<span class="premium-chip" title="Premium feature">${svg('gem')}${label}</span>`;
}

// Generic gate for a counted list feature in the current guild. `feature` is a
// key from the limits map (e.g. 'memberCounters'). Returns the effective cap,
// whether we're at it, and a ready-to-render limit hint with a Premium chip.
function premiumGate(feature, count) {
  const lim = state.guildData?.limits?.[feature];
  const isPrem = !!state.guildData?.premium;
  if (!lim) return { atCap: false, isPrem, cap: Infinity, hint: '' };
  const cap = isPrem ? lim.premium : lim.free;
  const used = `<b>${count}</b>/<b>${cap}</b> used`;
  const hint = isPrem
    ? `<span class="hint">${used} &middot; ${premiumChip()} up to ${lim.premium}.</span>`
    : `<span class="hint">${used} &middot; Free up to <b>${lim.free}</b> &middot; ${premiumChip()} up to <b>${lim.premium}</b>.</span>`;
  return { atCap: count >= cap, isPrem, cap, hint, free: lim.free, premium: lim.premium };
}

// A locked "add" button (dashed Premium style) that nudges instead of adding.
function premiumLockedBtn(label, feature) {
  return `<button class="btn btn-secondary btn-locked" title="Premium feature" onclick="premiumNudge('${feature}')">${svg('gem')} ${label} · Premium</button>`;
}
function premiumNudge(feature) {
  const lim = state.guildData?.limits?.[feature] || {};
  alert(`This is a Premium feature.\n\nFree servers allow up to ${lim.free}; Premium allows up to ${lim.premium}.\n\nOpen the Premium tab in the sidebar to upgrade and activate this server.`);
}

// Renders the correct "create" button for a gated feature based on plan + usage:
//   not at cap          -> a normal primary button that runs `onclick`
//   at cap, no Premium  -> a locked button that nudges the user to upgrade
//   at cap, on Premium  -> a disabled button stating the plan limit is reached
// This keeps upgrade messaging exclusive to users who actually lack Premium, and
// shows a plain "limit reached" state once a Premium server is at its ceiling.
function gateCreateButton(gate, label, onclick, feature, opts = {}) {
  const cls = opts.className || 'btn-primary';
  const inner = `${opts.icon ? opts.icon + ' ' : ''}${label}`;
  if (!gate.atCap) return `<button class="btn ${cls}" onclick="${onclick}">${inner}</button>`;
  if (!gate.isPrem) return premiumLockedBtn(label, feature);
  return `<button class="btn ${cls}" disabled title="You have reached the maximum for your plan">${inner}</button>`;
}

// Fills any static element marked <... data-icon="name"> with its SVG. Lets the
// HTML stay emoji-free without inlining big SVG blobs everywhere.
function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach(el => {
    if (el.dataset.iconDone) return;
    el.innerHTML = svg(el.dataset.icon);
    el.dataset.iconDone = '1';
  });
}

// ── Boot ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  const auth = await api('GET', '/api/auth').catch(() => ({ authenticated: false }));
  state.links = auth.links || null;
  applyLinks(state.links);
  hydrateIcons();
  if (auth.authenticated) await enterDashboard(auth.user);
  else showLogin(auth);
});

// Wires the bot-invite and support-server links into every place they appear.
function applyLinks(links) {
  if (!links) return;
  const set = (id, url) => { const el = document.getElementById(id); if (el && url) el.href = url; };
  set('addbot-invite', links.invite);
  set('ov-invite', links.invite);

  // The support server is temporarily closed while it's being set up. Until it's
  // ready, the support buttons show a notice instead of opening the invite.
  ['sidebar-support', 'addbot-support', 'ov-support'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.removeAttribute('href');
    el.removeAttribute('target');
    el.style.cursor = 'pointer';
    el.addEventListener('click', (e) => {
      e.preventDefault();
      alert('The ZenByte support server is currently being worked on. It will be joinable once it\'s finished — thanks for your patience!');
    });
  });
}

const AUTH_ERRORS = {
  oauth_not_configured: 'Discord login is not configured on this server yet.',
  auth_failed: 'Discord login failed or was cancelled. Please try again.'
};

function showLogin(auth) {
  show('login-screen');
  hide('dashboard');

  const params = new URLSearchParams(location.search);
  const err = params.get('error');
  if (err) {
    document.getElementById('auth-err').textContent = AUTH_ERRORS[err] || 'Login failed.';
    history.replaceState({}, '', location.pathname);
  }
  if (auth && auth.configured === false) {
    const btn = document.getElementById('discord-login-btn');
    btn.classList.add('disabled');
    btn.removeAttribute('href');
    document.getElementById('auth-err').textContent = AUTH_ERRORS.oauth_not_configured;
  }

  api('GET', '/api/status').then(s => {
    if (s.avatarUrl) {
      const img = document.getElementById('login-avatar');
      img.src = s.avatarUrl;
      img.classList.remove('hidden');
    }
  }).catch(() => {});
}

async function enterDashboard(user) {
  hide('login-screen');
  if (user?.username) document.getElementById('sidebar-user').textContent = `Signed in as ${user.username}`;
  await loadStatus();
  await loadGuilds();

  // No servers the user can manage → show the "Add ZenByte" screen instead.
  if (!state.guilds.length) {
    hide('dashboard');
    show('addbot-screen');
  } else {
    hide('addbot-screen');
    show('dashboard');
  }
}

async function logout() {
  await api('POST', '/api/logout').catch(() => {});
  location.href = '/';
}

// ── Navigation ────────────────────────────────────
function goto(page) {
  clearAllDirty();
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${page}`).classList.add('active');
  document.querySelector(`[data-page="${page}"]`).classList.add('active');

  if (page === 'overview')    loadStatus();
  if (page === 'premium')     loadPremium();
  if (page === 'settings'    && state.guildId) loadSettings();
  if (page === 'commands')    loadCommands();
  if (page === 'logs'        && state.guildId) loadLogConfig();
  if (page === 'tickets'     && state.guildId) loadTicketConfig();
  if (page === 'leveling'    && state.guildId) loadLeveling();
  if (page === 'polls'       && state.guildId) loadPolls();
  if (page === 'social'      && state.guildId) loadSocial();
  if (page === 'autoresponses' && state.guildId) loadAutoResponses();
  if (page === 'applications' && state.guildId) loadApplications();
  if (page === 'greetings'   && state.guildId) loadGreetings();
  if (page === 'membercounters' && state.guildId) loadMemberCounters();
  if (page === 'autorole'    && state.guildId) loadAutorole();
  if (page === 'reactionroles' && state.guildId) loadReactionRoles();
  if (page === 'activity'    && state.guildId) loadActivity();
  if (page === 'trust'       && state.guildId) loadTrust();
  if (page === 'moderators'  && state.guildId) loadModerators();
  if (page === 'security'    && state.guildId) loadSecurityConfig();
  if (page === 'verification' && state.guildId) loadVerification();
  if (page === 'altdetect'   && state.guildId) loadAltDetect();
  if (page === 'transcripts' && state.guildId) loadTranscripts();
  if (page === 'botlogs') loadBotLogs();

  closeSidebar();
}

function toggleSidebar() { document.getElementById('dashboard').classList.toggle('sidebar-open'); }
function closeSidebar()  { document.getElementById('dashboard').classList.remove('sidebar-open'); }

// ── Unsaved-changes tracking ──────────────────────
// Any edit on the active page lights up its sticky save bar. A successful save
// (setStatus 'ok') or a fresh page/guild load clears it again.
function markDirty() {
  const bar = document.querySelector('.page.active .save-bar');
  if (bar) bar.classList.add('dirty');
}
function clearAllDirty() {
  document.querySelectorAll('.save-bar.dirty').forEach(b => b.classList.remove('dirty'));
}
const _main = document.querySelector('.main-content');
if (_main) { _main.addEventListener('input', markDirty); _main.addEventListener('change', markDirty); }

// ── Overview ──────────────────────────────────────
async function loadStatus() {
  try {
    const s = await api('GET', '/api/status');
    const setTxt = (id, v) => { const e = document.getElementById(id); if (e) e.textContent = v; };

    const statusEl = document.getElementById('stat-status');
    if (statusEl) statusEl.innerHTML = s.ready ? `${dot('var(--green)')}Online` : `${dot('var(--red)')}Offline`;
    setTxt('stat-guilds',   s.guilds);
    setTxt('stat-members',  (s.members ?? 0).toLocaleString());
    setTxt('stat-commands', s.commands ?? '—');
    setTxt('stat-ping',     s.ping != null ? `${s.ping} ms` : '—');
    setTxt('stat-uptime',   s.uptime);

    setTxt('ov-name', s.tag);
    const st = document.getElementById('ov-status');
    if (st) st.innerHTML = `<span class="ov-dot${s.ready ? '' : ' off'}"></span> ${s.ready ? 'Online' : 'Offline'}`;

    if (s.avatarUrl) {
      document.getElementById('sidebar-bot-avatar').src = s.avatarUrl;
      const ov = document.getElementById('ov-avatar'); if (ov) ov.src = s.avatarUrl;
      const ab = document.getElementById('addbot-avatar');
      if (ab) { ab.src = s.avatarUrl; ab.classList.remove('hidden'); }
    }
  } catch {}
}

// ── Commands ──────────────────────────────────────
const OPTION_TYPES = {
  1: 'Subcommand', 2: 'Group', 3: 'Text', 4: 'Integer', 5: 'Boolean',
  6: 'User', 7: 'Channel', 8: 'Role', 9: 'Mentionable', 10: 'Number', 11: 'Attachment'
};

async function loadCommands() {
  const body = document.getElementById('commands-body');
  if (!state.commands.length) {
    body.innerHTML = '<p style="color:var(--muted);padding:20px">Loading…</p>';
    try { state.commands = await api('GET', '/api/commands'); }
    catch { body.innerHTML = '<p style="color:var(--muted);padding:20px">Failed to load commands.</p>'; return; }
  }
  // Per-guild enable/disable state (only when a server is selected).
  state.cmdDisabled = new Set();
  state.cmdChannelRules = {};
  if (state.guildId) {
    try {
      const { disabled } = await api('GET', `/api/guild/${state.guildId}/command-toggles`);
      state.cmdDisabled = new Set(disabled);
    } catch {}
    try {
      // Channel rules need the guild's channel list for the editor's multi-select.
      await ensureGuildData();
      const { rules } = await api('GET', `/api/guild/${state.guildId}/channel-rules`);
      state.cmdChannelRules = rules || {};
    } catch {}
  }
  renderCommands();
}

function setCmdCategory(cat) { state.cmdCategory = cat; renderCommands(); }
function setCmdStatus(status) { state.cmdStatus = status; renderCommands(); }

async function toggleCommand(name, enable) {
  if (!state.guildId) return;
  try {
    const { disabled } = await api('PUT', `/api/guild/${state.guildId}/command-toggles`, { name, enabled: enable });
    state.cmdDisabled = new Set(disabled);
  } catch {
    if (enable) state.cmdDisabled.delete(name); else state.cmdDisabled.add(name);
  }
  renderCommands();
}

// Enable/disable many commands at once (a category, or everything in view).
async function bulkToggleCommands(names, enable) {
  if (!state.guildId || !names.length) return;
  try {
    const { disabled } = await api('PUT', `/api/guild/${state.guildId}/command-toggles/bulk`, { names, enabled: enable });
    state.cmdDisabled = new Set(disabled);
  } catch {
    for (const n of names) { if (enable) state.cmdDisabled.delete(n); else state.cmdDisabled.add(n); }
  }
  renderCommands();
}

// Names of the commands currently shown (after category + status + search filters).
function visibleCommandNames() { return (state.cmdFiltered || []).map(c => c.name); }
function toggleCategoryCommands(cat, enable) {
  const names = state.commands.filter(c => (c.category || 'General') === cat).map(c => c.name);
  bulkToggleCommands(names, enable);
}

// ── Per-command channel rules (blacklist / whitelist) ──
// Only one command's editor is open at a time, tracked on `state`.
function openChannelRuleEditor(name) {
  const rule = state.cmdChannelRules?.[name];
  state.cmdRuleEditing = name;
  state.cmdRuleDraftMode = rule?.mode || 'off';
  state.cmdRuleDraftChannels = rule?.channels ? [...rule.channels] : [];
  renderCommands();
}

function closeChannelRuleEditor() {
  state.cmdRuleEditing = null;
  renderCommands();
}

// Switch mode while the editor is open, keeping any channels the user already picked.
// Read from the live host element (not msStore, which can hold a stale entry).
function setChannelRuleMode(mode) {
  if (document.getElementById('chrule-ms')) state.cmdRuleDraftChannels = msValues('chrule-ms');
  state.cmdRuleDraftMode = mode;
  renderCommands();
}

async function saveChannelRule(name) {
  if (!state.guildId) return;
  const mode = state.cmdRuleDraftMode || 'off';
  const channels = mode === 'off'
    ? []
    : (document.getElementById('chrule-ms') ? msValues('chrule-ms') : (state.cmdRuleDraftChannels || []));
  if (mode !== 'off' && !channels.length)
    return alert('Pick at least one channel, or set the mode to Off.');
  try {
    const { rule } = await api('PUT', `/api/guild/${state.guildId}/channel-rules`, { name, mode, channels });
    if (rule) state.cmdChannelRules[name] = rule;
    else delete state.cmdChannelRules[name];
  } catch (e) { return alert('Failed to save: ' + e.message); }
  state.cmdRuleEditing = null;
  renderCommands();
}

function channelRuleSummary(rule) {
  const n = rule.channels.length;
  const label = rule.mode === 'whitelist' ? 'Only in' : 'Blocked in';
  return `${label} ${n} channel${n === 1 ? '' : 's'}`;
}

// The inline channel-rule control shown on each command card (guild selected only).
function channelRuleSection(cmd) {
  if (!state.guildId || cmd.ownerOnly) return '';
  const name = cmd.name;
  const rule = state.cmdChannelRules?.[name];

  if (state.cmdRuleEditing !== name) {
    const summary = rule
      ? `<span class="chrule-badge chrule-${rule.mode}">${channelRuleSummary(rule)}</span>`
      : '<span class="chrule-none">Usable in any channel</span>';
    return `<div class="cmd-chrule">
      ${summary}
      <button class="cmd-cat-btn" onclick="openChannelRuleEditor('${esc(name)}')">${rule ? 'Edit channels' : 'Limit channels'}</button>
    </div>`;
  }

  const mode = state.cmdRuleDraftMode || 'off';
  const modeBtn = (m, label) =>
    `<button class="cmd-chip${mode === m ? ' active' : ''}" onclick="setChannelRuleMode('${m}')">${label}</button>`;
  const help = mode === 'whitelist'
    ? 'Command works <strong>only</strong> in the channels you pick.'
    : mode === 'blacklist'
      ? 'Command is <strong>blocked</strong> in the channels you pick.'
      : 'No channel restriction — usable everywhere.';

  return `<div class="cmd-chrule cmd-chrule-edit">
    <div class="cmd-chips">${modeBtn('off', 'Off')}${modeBtn('whitelist', 'Whitelist')}${modeBtn('blacklist', 'Blacklist')}</div>
    <p class="chrule-help">${help}</p>
    ${mode === 'off' ? '' : '<div id="chrule-ms"></div>'}
    <div class="chrule-actions">
      <button class="btn btn-primary btn-sm" onclick="saveChannelRule('${esc(name)}')">Save</button>
      <button class="btn btn-secondary btn-sm" onclick="closeChannelRuleEditor()">Cancel</button>
    </div>
  </div>`;
}

function permBadges(cmd) {
  const badges = [];
  if (cmd.ownerOnly) badges.push('<span class="perm-badge perm-owner">Owner Only</span>');
  if (cmd.adminOnly) badges.push('<span class="perm-badge perm-admin">Admin Only</span>');
  if (cmd.modPermission) badges.push(`<span class="perm-badge perm-mod">Mod · ${esc(prettyPerm(cmd.modPermission))}</span>`);
  for (const p of cmd.permissions || []) badges.push(`<span class="perm-badge">${esc(prettyPerm(p))}</span>`);
  if (!badges.length) badges.push('<span class="perm-badge perm-everyone">Everyone</span>');
  return badges.join('');
}

function prettyPerm(p) {
  return String(p).replace(/([a-z])([A-Z])/g, '$1 $2');
}

function renderCommands() {
  const body  = document.getElementById('commands-body');
  const query = (document.getElementById('cmd-search').value || '').toLowerCase().trim();
  const active = state.cmdCategory || 'all';
  const status = state.cmdStatus || 'all';
  const hasGuild = !!state.guildId;
  const isDisabled = c => state.cmdDisabled?.has(c.name);

  const categories = [...new Set(state.commands.map(c => c.category || 'General'))].sort();
  const chips = ['all', ...categories].map(cat =>
    `<button class="cmd-chip${active === cat ? ' active' : ''}" onclick="setCmdCategory('${esc(cat)}')">${cat === 'all' ? 'All' : esc(cat)}</button>`
  ).join('');

  // Status filter (only meaningful when a server is selected).
  const statusChips = hasGuild ? `<div class="cmd-chips cmd-status-chips">
    ${['all', 'enabled', 'disabled'].map(s =>
      `<button class="cmd-chip${status === s ? ' active' : ''}" onclick="setCmdStatus('${s}')">${s[0].toUpperCase() + s.slice(1)}</button>`).join('')}
  </div>` : '';

  const filtered = state.commands.filter(c => {
    const cat = c.category || 'General';
    if (active !== 'all' && cat !== active) return false;
    if (hasGuild && status === 'enabled'  && isDisabled(c)) return false;
    if (hasGuild && status === 'disabled' && !isDisabled(c)) return false;
    return !query || c.name.toLowerCase().includes(query) ||
      (c.description || '').toLowerCase().includes(query) || cat.toLowerCase().includes(query);
  });
  state.cmdFiltered = filtered; // used by the bulk "in view" actions

  document.getElementById('cmd-count').textContent =
    `${filtered.length} command${filtered.length === 1 ? '' : 's'}`;

  // Stats + bulk actions for the current view.
  let toolbar = '';
  if (hasGuild) {
    const totalDisabled = state.commands.filter(isDisabled).length;
    const enabledCount = state.commands.length - totalDisabled;
    const viewNames = filtered.map(c => c.name);
    toolbar = `<div class="cmd-bulkbar">
      <span class="cmd-stats">${svg('check')} ${enabledCount} enabled · ${svg('ban')} ${totalDisabled} disabled</span>
      <span class="cmd-bulk">
        <button class="btn btn-secondary btn-sm" ${viewNames.length ? '' : 'disabled'}
          onclick='bulkToggleCommands(${JSON.stringify(viewNames)}, true)'>Enable all shown</button>
        <button class="btn btn-secondary btn-sm" ${viewNames.length ? '' : 'disabled'}
          onclick='bulkToggleCommands(${JSON.stringify(viewNames)}, false)'>Disable all shown</button>
      </span>
    </div>`;
  }

  const hint = hasGuild
    ? '<p class="cmd-toggle-hint">Toggle a command to enable or disable it in the selected server.</p>'
    : '<p class="cmd-toggle-hint">← Select a server to enable/disable commands.</p>';

  const groups = {};
  for (const c of filtered) (groups[c.category || 'General'] = groups[c.category || 'General'] || []).push(c);

  const catActions = cat => hasGuild ? `<span class="cmd-cat-actions">
      <button class="cmd-cat-btn" onclick="toggleCategoryCommands('${esc(cat)}', true)">Enable all</button>
      <button class="cmd-cat-btn" onclick="toggleCategoryCommands('${esc(cat)}', false)">Disable all</button>
    </span>` : '';

  const list = !filtered.length
    ? '<p style="color:var(--muted);padding:20px">No commands match your filter.</p>'
    : Object.keys(groups).sort().map(cat => `
        <div class="cmd-category">
          <h3 class="cmd-cat-title">${esc(cat)} <span class="cmd-cat-count">${groups[cat].length}</span>${catActions(cat)}</h3>
          <div class="cmd-grid">${groups[cat].map(renderCommandCard).join('')}</div>
        </div>`).join('');

  body.innerHTML = `<div class="cmd-chips">${chips}</div>${statusChips}${toolbar}${hint}${list}`;

  // If a channel-rule editor is open, initialise its channel multi-select now that
  // the host element exists in the DOM.
  if (state.cmdRuleEditing && (state.cmdRuleDraftMode || 'off') !== 'off' && document.getElementById('chrule-ms'))
    msInit('chrule-ms', channelItems(), state.cmdRuleDraftChannels || []);
}

function renderCommandCard(cmd) {
  const opts = (cmd.options || []).map(o => `
    <div class="cmd-opt">
      <span class="cmd-opt-name">${esc(o.name)}${o.required ? '<span class="cmd-opt-req">*</span>' : ''}</span>
      <span class="cmd-opt-type">${OPTION_TYPES[o.type] || o.type}</span>
      ${o.autocomplete ? '<span class="cmd-opt-tag">auto</span>' : ''}
      ${o.choices?.length ? `<span class="cmd-opt-tag">${o.choices.length} choices</span>` : ''}
      <span class="cmd-opt-desc">${esc(o.description || '')}</span>
    </div>`).join('');

  const disabled = state.cmdDisabled?.has(cmd.name);
  const toggle = state.guildId
    ? `<label class="cmd-switch" title="${disabled ? 'Disabled' : 'Enabled'}">
         <input type="checkbox" ${disabled ? '' : 'checked'} onchange="toggleCommand('${esc(cmd.name)}', this.checked)">
         <span class="cmd-slider"></span>
       </label>`
    : '';

  return `
    <div class="cmd-card${disabled ? ' cmd-disabled' : ''}">
      <div class="cmd-card-head">
        <span class="cmd-name">/${esc(cmd.name)}</span>
        <div class="cmd-head-right">
          ${cmd.cooldown ? `<span class="cmd-cooldown">⏱ ${cmd.cooldown}s</span>` : ''}
          ${toggle}
        </div>
      </div>
      <p class="cmd-desc">${esc(cmd.description || '')}</p>
      <div class="cmd-badges">${permBadges(cmd)}</div>
      ${opts ? `<div class="cmd-opts">${opts}</div>` : ''}
      ${channelRuleSection(cmd)}
    </div>`;
}

// ── Guild selector ────────────────────────────────
async function loadGuilds() {
  state.guilds = await api('GET', '/api/guilds');
  renderGuildDropdown();
}

function guildColor(id) {
  const colors = ['#5865F2','#57F287','#FEE75C','#EB459E','#ED4245','#FF7043','#00BCD4','#9B59B6'];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0x7FFFFFFF;
  return colors[h % colors.length];
}

function guildIconHTML(guild, size, cls) {
  const style = `width:${size}px;height:${size}px;border-radius:50%;flex-shrink:0;overflow:hidden;` +
                `display:flex;align-items:center;justify-content:center;font-weight:700;` +
                `font-size:${Math.floor(size * 0.42)}px;color:#fff;`;
  if (guild.icon) {
    return `<div class="${cls}" style="${style}"><img src="${guild.icon}" width="${size}" height="${size}" style="object-fit:cover"></div>`;
  }
  const bg = guildColor(guild.id);
  const initial = guild.name.replace(/\s+/g, '').charAt(0).toUpperCase();
  return `<div class="${cls}" style="${style}background:${bg}">${initial}</div>`;
}

function renderGuildDropdown() {
  const dd = document.getElementById('guild-dropdown');
  dd.innerHTML = state.guilds.map(g => `
    <div class="guild-option${g.id === state.guildId ? ' active' : ''}"
         onclick="selectGuild('${g.id}')">
      ${guildIconHTML(g, 36, 'guild-icon-circle')}
      <div class="guild-option-info">
        <div class="guild-option-name">${esc(g.name)}</div>
        <div class="guild-option-count">${g.memberCount.toLocaleString()} members</div>
      </div>
    </div>`).join('');
}

function toggleGuildDropdown() {
  const dd = document.getElementById('guild-dropdown');
  dd.classList.toggle('hidden');
}

async function selectGuild(id) {
  clearAllDirty();
  state.guildId   = id;
  state.guildData = null;
  document.getElementById('guild-dropdown').classList.add('hidden');

  const guild = state.guilds.find(g => g.id === id);
  if (guild) {
    const btn = document.getElementById('guild-btn');
    btn.querySelector('.guild-btn-text span').textContent = guild.name;

    // Replace icon inside button
    const existing = btn.querySelector('.guild-icon-sm, .guild-icon-circle');
    if (existing) existing.remove();
    const iconEl = document.createElement('div');
    iconEl.innerHTML = guildIconHTML(guild, 28, 'guild-icon-sm');
    btn.insertBefore(iconEl.firstChild, btn.querySelector('.guild-btn-text'));
  }

  renderGuildDropdown();

  // Reload current page data
  const activePage = document.querySelector('.nav-item.active')?.dataset?.page;
  if (activePage === 'settings')    await loadSettings();
  if (activePage === 'commands')    await loadCommands();
  if (activePage === 'logs')        await loadLogConfig();
  if (activePage === 'tickets')     await loadTicketConfig();
  if (activePage === 'leveling')    await loadLeveling();
  if (activePage === 'activity')    await loadActivity();
  if (activePage === 'trust')       await loadTrust();
  if (activePage === 'moderators')  await loadModerators();
  if (activePage === 'security')    await loadSecurityConfig();
  if (activePage === 'verification') await loadVerification();
  if (activePage === 'autorole')    await loadAutorole();
  if (activePage === 'reactionroles') await loadReactionRoles();
  if (activePage === 'social')      await loadSocial();
  if (activePage === 'autoresponses') await loadAutoResponses();
  if (activePage === 'applications') await loadApplications();
  if (activePage === 'membercounters') await loadMemberCounters();
  if (activePage === 'greetings')   await loadGreetings();
  if (activePage === 'transcripts') await loadTranscripts();
}

// Close dropdown when clicking outside
document.addEventListener('click', e => {
  const sel = document.getElementById('guild-selector');
  if (sel && !sel.contains(e.target)) {
    document.getElementById('guild-dropdown')?.classList.add('hidden');
  }
  document.querySelectorAll('.multiselect').forEach(msEl => {
    if (!msEl.contains(e.target)) msEl.querySelector('.multiselect-menu')?.classList.add('hidden');
  });
});

async function ensureGuildData() {
  if (!state.guildData && state.guildId) {
    state.guildData = await api('GET', `/api/guild/${state.guildId}`);
  }
  return state.guildData;
}

// ── LOG CHANNELS ──────────────────────────────────
async function loadLogConfig() {
  hide('logs-body');
  const noGuild = document.getElementById('logs-no-guild');

  if (!state.guildId) { show('logs-no-guild'); return; }
  hide('logs-no-guild');

  const [{ config, logTypes }, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/logs`),
    ensureGuildData()
  ]);

  // Build channel <option> html (grouped by category)
  let channelOpts = '<option value="">None</option>';
  let curCat = null;
  for (const ch of guild.textChannels) {
    if (ch.category !== curCat) {
      if (curCat !== null) channelOpts += '</optgroup>';
      channelOpts += `<optgroup label="${esc(ch.category || 'No Category')}">`;
      curCat = ch.category;
    }
    channelOpts += `<option value="${ch.id}">#${esc(ch.name)}</option>`;
  }
  if (curCat !== null) channelOpts += '</optgroup>';

  // Group log types
  const groups = {};
  for (const lt of logTypes) (groups[lt.group] = groups[lt.group] || []).push(lt);

  let html = '';
  for (const [group, items] of Object.entries(groups)) {
    html += `<tr class="group-header"><td colspan="3">${group}</td></tr>`;
    for (const lt of items) {
      const saved = config[lt.key] || '';
      const opts  = channelOpts.replace(`value="${saved}"`, `value="${saved}" selected`);
      html += `<tr>
        <td><span class="log-key">${lt.key}</span></td>
        <td><span class="log-desc">${lt.desc}</span></td>
        <td><select id="log-${lt.key}" data-key="${lt.key}">${opts}</select></td>
      </tr>`;
    }
  }

  document.getElementById('log-rows').innerHTML = html;
  document.getElementById('log-save-msg').textContent = '';
  show('logs-body');
}

async function saveLogConfig() {
  if (!state.guildId) return;
  const msg = document.getElementById('log-save-msg');
  const updates = {};
  document.querySelectorAll('#log-rows select[data-key]').forEach(s => {
    updates[s.dataset.key] = s.value || null;
  });
  try {
    await api('PUT', `/api/guild/${state.guildId}/logs`, updates);
    setStatus(msg, 'ok', '✅ Saved!');
  } catch {
    setStatus(msg, 'err', '❌ Failed to save.');
  }
}

// ── TICKETS ───────────────────────────────────────
async function loadTicketConfig() {
  hide('tickets-body');
  if (!state.guildId) { show('tickets-no-guild'); return; }
  hide('tickets-no-guild');

  const [config, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/tickets`),
    ensureGuildData()
  ]);

  document.getElementById('t-title').value = config.panelTitle || '';
  document.getElementById('t-desc').value  = config.panelDescription || '';
  const col = config.panelColor || '#5865F2';
  document.getElementById('t-color-picker').value = col;
  document.getElementById('t-color-hex').value    = col;

  fillSelect('t-category',   guild.categories,   config.categoryId,   n => n.name);
  fillSelect('t-logchannel', guild.textChannels,  config.logChannelId, n => `#${n.name}`);

  const modRoleIds = Array.isArray(config.modRoleIds)
    ? config.modRoleIds.filter(Boolean)
    : (config.modRoleId ? [config.modRoleId] : []);
  msInit('t-modroles', roleItems(), modRoleIds);

  const pc = config.priorityCategories || {};
  document.getElementById('t-pc-enabled').checked = !!pc.enabled;
  fillSelect('t-pc-low',    guild.categories, pc.Low,    n => n.name);
  fillSelect('t-pc-medium', guild.categories, pc.Medium, n => n.name);
  fillSelect('t-pc-high',   guild.categories, pc.High,   n => n.name);
  togglePriorityCategories();

  document.getElementById('t-maxtickets').value = config.maxTickets || 1;
  document.getElementById('t-namescheme').value = config.nameScheme || 'ticket-{number}';
  document.getElementById('t-welcome').value = config.welcomeMessage || '';
  const ac = config.autoClose || {};
  document.getElementById('t-ac-enabled').checked = !!ac.enabled;
  document.getElementById('t-ac-hours').value = ac.inactivityHours || 0;
  document.getElementById('t-ac-leave').checked = !!ac.closeOnLeave;

  document.getElementById('t-priority-enabled').checked = config.priorityEnabled !== false;
  toggleTicketPriority();

  const ppr = config.priorityPingRoles || {};
  msInit('t-openping', roleItems(), config.openPingRoles || []);
  msInit('t-pp-low',    roleItems(), ppr.Low || []);
  msInit('t-pp-medium', roleItems(), ppr.Medium || []);
  msInit('t-pp-high',   roleItems(), ppr.High || []);

  state.ticketForms  = Array.isArray(config.forms)  ? config.forms  : [];
  state.ticketPanels = Array.isArray(config.panels) ? config.panels : [];
  renderTicketForms();
  renderTicketPanels();

  await loadOpenTickets();
  show('tickets-body');
}

function togglePriorityCategories() {
  const on = document.getElementById('t-pc-enabled').checked;
  document.getElementById('t-pc-options').classList.toggle('hidden', !on);
}

function toggleTicketPriority() {
  const on = document.getElementById('t-priority-enabled').checked;
  document.getElementById('t-priority-cat-card').classList.toggle('hidden', !on);
  document.getElementById('t-pp-section').classList.toggle('hidden', !on);
}

function fillSelect(id, items, savedId, labelFn) {
  const el = document.getElementById(id);
  el.innerHTML = '<option value="">None</option>';
  for (const item of items) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = labelFn(item);
    if (item.id === savedId) opt.selected = true;
    el.appendChild(opt);
  }
}

// ══════════════════════════════════════════════════
//  Reusable searchable multi-select (chips + dropdown)
//  Usage: msInit('host-id', [{id,label}], [selectedIds]);  msValues('host-id')
// ══════════════════════════════════════════════════
const msStore = {};

function roleItems()    { return (state.guildData?.roles || []).map(r => ({ id: r.id, label: '@' + r.name })); }
function channelItems() { return (state.guildData?.textChannels || []).map(c => ({ id: c.id, label: '#' + c.name })); }

function msInit(hostId, items, selected = []) {
  msStore[hostId] = { items, selected: new Set(selected) };
  const host = document.getElementById(hostId);
  if (!host) return;
  host.classList.add('multiselect');
  host.innerHTML = `
    <div class="multiselect-control" onclick="msToggleMenu('${hostId}', event)">
      <div class="multiselect-tags" data-tags></div>
      <span class="guild-chevron">▾</span>
    </div>
    <div class="multiselect-menu hidden" data-menu>
      <input class="ms-search" placeholder="Search…" oninput="msSearch('${hostId}', this.value)" onclick="event.stopPropagation()">
      <div class="ms-options" data-options></div>
    </div>`;
  msRenderTags(hostId);
  msRenderOptions(hostId, '');
}

function msValues(hostId) { return [...(msStore[hostId]?.selected || [])]; }

function msRenderTags(hostId) {
  const st = msStore[hostId], host = document.getElementById(hostId);
  if (!st || !host) return;
  const sel = [...st.selected].map(id => st.items.find(i => i.id === id)).filter(Boolean);
  host.querySelector('[data-tags]').innerHTML = sel.length
    ? sel.map(i => `<span class="ms-tag">${esc(i.label)}<button class="ms-tag-x" onclick="msRemove('${hostId}','${i.id}',event)">${svg('x')}</button></span>`).join('')
    : '<span class="multiselect-placeholder">None selected</span>';
}

function msRenderOptions(hostId, query) {
  const st = msStore[hostId], host = document.getElementById(hostId);
  if (!st || !host) return;
  const q = (query || '').toLowerCase();
  const opts = st.items.filter(i => !q || i.label.toLowerCase().includes(q));
  host.querySelector('[data-options]').innerHTML = opts.length
    ? opts.map(i => `<label class="ms-option${st.selected.has(i.id) ? ' on' : ''}" data-id="${i.id}">
        <input type="checkbox" ${st.selected.has(i.id) ? 'checked' : ''} onchange="msToggle('${hostId}','${i.id}')">
        <span>${esc(i.label)}</span></label>`).join('')
    : '<div class="ms-empty">No matches.</div>';
}

function msToggleMenu(hostId, e) {
  e.stopPropagation();
  const menu = document.getElementById(hostId).querySelector('[data-menu]');
  const open = menu.classList.contains('hidden');
  document.querySelectorAll('.multiselect-menu').forEach(m => m.classList.add('hidden'));
  if (open) { menu.classList.remove('hidden'); menu.querySelector('.ms-search')?.focus(); }
}

function msToggle(hostId, id) {
  const st = msStore[hostId];
  if (st.selected.has(id)) st.selected.delete(id); else st.selected.add(id);
  msRenderTags(hostId);
  document.getElementById(hostId).querySelector(`.ms-option[data-id="${id}"]`)?.classList.toggle('on', st.selected.has(id));
}

function msRemove(hostId, id, e) {
  e.stopPropagation();
  msStore[hostId].selected.delete(id);
  msRenderTags(hostId);
  const label = document.getElementById(hostId).querySelector(`.ms-option[data-id="${id}"]`);
  if (label) { label.classList.remove('on'); const cb = label.querySelector('input'); if (cb) cb.checked = false; }
}

function msSearch(hostId, val) { msRenderOptions(hostId, val); }

function syncColor(source) {
  if (source === 'picker') {
    document.getElementById('t-color-hex').value = document.getElementById('t-color-picker').value;
  } else {
    const v = document.getElementById('t-color-hex').value;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) document.getElementById('t-color-picker').value = v;
  }
}

async function saveTicketConfig() {
  if (!state.guildId) return;
  const msg = document.getElementById('ticket-save-msg');
  const payload = {
    panelTitle:       document.getElementById('t-title').value.trim() || null,
    panelDescription: document.getElementById('t-desc').value.trim()  || null,
    panelColor:       document.getElementById('t-color-hex').value    || '#5865F2',
    categoryId:       document.getElementById('t-category').value     || null,
    logChannelId:     document.getElementById('t-logchannel').value   || null,
    modRoleIds:       msValues('t-modroles'),
    priorityCategories: {
      enabled: document.getElementById('t-pc-enabled').checked,
      Low:     document.getElementById('t-pc-low').value    || null,
      Medium:  document.getElementById('t-pc-medium').value || null,
      High:    document.getElementById('t-pc-high').value   || null
    },
    openPingRoles: msValues('t-openping'),
    priorityPingRoles: {
      Low:    msValues('t-pp-low'),
      Medium: msValues('t-pp-medium'),
      High:   msValues('t-pp-high')
    },
    priorityEnabled: document.getElementById('t-priority-enabled').checked,
    maxTickets:    parseInt(document.getElementById('t-maxtickets').value, 10) || 1,
    nameScheme:    document.getElementById('t-namescheme').value.trim() || 'ticket-{number}',
    welcomeMessage: document.getElementById('t-welcome').value.trim() || null,
    autoClose: {
      enabled:         document.getElementById('t-ac-enabled').checked,
      inactivityHours: parseInt(document.getElementById('t-ac-hours').value, 10) || 0,
      closeOnLeave:    document.getElementById('t-ac-leave').checked
    }
  };
  try {
    await api('PUT', `/api/guild/${state.guildId}/tickets`, payload);
    setStatus(msg, 'ok', '✅ Saved!');
  } catch {
    setStatus(msg, 'err', '❌ Failed to save.');
  }
}

// ── Ticket forms (named, reusable) ─────────────────
function tfFieldRow(f = {}) {
  return `<div class="tf-row">
    <input type="text" class="tf-label" placeholder="Question / label" maxlength="45" value="${esc(f.label || '')}">
    <input type="text" class="tf-ph" placeholder="Placeholder (optional)" maxlength="100" value="${esc(f.placeholder || '')}">
    <select class="tf-style">
      <option value="short"${f.style === 'short' ? ' selected' : ''}>Short</option>
      <option value="paragraph"${f.style === 'paragraph' ? ' selected' : ''}>Paragraph</option>
    </select>
    <label class="tf-req"><input type="checkbox" class="tf-required" ${f.required !== false ? 'checked' : ''}> Required</label>
    <button class="btn btn-secondary tf-del" onclick="this.closest('.tf-row').remove()">${svg('x')}</button>
  </div>`;
}

// Centered empty state shared by the forms and panels sections.
function ticketEmptyState(icon, title, text, btn) {
  return `<div class="mc-empty">
    <div class="mc-empty-ico">${svg(icon)}</div>
    <h4>${esc(title)}</h4>
    <p>${esc(text)}</p>
    ${btn}
  </div>`;
}

function renderTicketForms() {
  const forms = state.ticketForms || [];
  const gate = premiumGate('ticketForms', forms.length);
  const newBtn = gateCreateButton(gate, 'New Form', 'tfNew()', 'ticketForms', { icon: svg('plus') });
  const body = forms.length
    ? `<div class="ticket-items">${forms.map(tfItemCard).join('')}</div>`
    : ticketEmptyState('clipboard', 'No forms yet', 'Create a reusable question form, then assign it to a panel.', newBtn);
  document.getElementById('t-forms-section').innerHTML = `
    <div class="card">
      <div class="section-head">
        <h3>Ticket Forms</h3>
        <div class="section-head-actions">${gate.hint}${forms.length ? newBtn : ''}</div>
      </div>
      ${body}
    </div>`;
}

function tfItemCard(f) {
  const n = (f.fields || []).length;
  return `<div class="ticket-item">
    <div class="ticket-item-info">
      <div class="ticket-item-name">${esc(f.name)}</div>
      <div class="hint">${n} question${n === 1 ? '' : 's'}</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="tfEdit('${f.id}')">Edit</button>
      <button class="btn btn-secondary" onclick="tfDuplicate('${f.id}')">Duplicate</button>
      <button class="btn btn-secondary" onclick="tfDeleteForm('${f.id}')">Delete</button>
    </div>
  </div>`;
}

// Modal editor for a single form (new when form.id is null).
function tfOpenModal(form) {
  const rows = (form.fields || []).map(tfFieldRow).join('');
  openAppsModal(`
    <h3 class="modal-title">${form.id ? 'Edit Form' : 'New Form'}</h3>
    <input type="hidden" id="tf-edit-id" value="${form.id || ''}">
    <div class="form-row"><label>Form name</label><input type="text" id="tf-edit-name" maxlength="80" value="${esc(form.name || '')}"></div>
    <div class="form-row"><label>Questions (up to 5)</label>
      <div id="tf-edit-fields">${rows}</div>
      <button class="btn btn-secondary" style="margin-top:8px" onclick="tfModalAddField()">+ Add Question</button>
      <span class="hint" style="display:block;margin-top:6px">Answers appear in the ticket when it opens.</span>
    </div>
    <div class="btn-row" style="margin-top:18px;align-items:center">
      <button class="btn btn-primary" onclick="tfModalSave()">${form.id ? 'Save Form' : 'Create Form'}</button>
      <button class="btn btn-secondary" onclick="closeAppsModal()">Cancel</button>
      <span id="tf-edit-msg" class="save-status"></span>
    </div>`);
}

function tfNew() {
  const gate = premiumGate('ticketForms', (state.ticketForms || []).length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('ticketForms'); return; }
  tfOpenModal({ id: null, name: '', fields: [] });
}

function tfEdit(id) {
  const f = (state.ticketForms || []).find(x => x.id === id);
  if (f) tfOpenModal(JSON.parse(JSON.stringify(f)));
}

function tfModalAddField() {
  const box = document.getElementById('tf-edit-fields');
  if (box.querySelectorAll('.tf-row').length >= 5) return;
  box.insertAdjacentHTML('beforeend', tfFieldRow());
}

function tfModalCollect() {
  return [...document.querySelectorAll('#tf-edit-fields .tf-row')].map(row => ({
    label:       row.querySelector('.tf-label').value.trim(),
    placeholder: row.querySelector('.tf-ph').value.trim(),
    style:       row.querySelector('.tf-style').value,
    required:    row.querySelector('.tf-required').checked
  })).filter(f => f.label);
}

async function tfModalSave() {
  const id = document.getElementById('tf-edit-id').value || null;
  const name = document.getElementById('tf-edit-name').value.trim() || 'Untitled form';
  const fields = tfModalCollect();
  const msg = document.getElementById('tf-edit-msg');
  try {
    const r = id
      ? await api('PUT', `/api/guild/${state.guildId}/ticket-forms/${id}`, { name, fields })
      : await api('POST', `/api/guild/${state.guildId}/ticket-forms`, { name, fields });
    state.ticketForms = r.config.forms; state.ticketPanels = r.config.panels;
    closeAppsModal();
    renderTicketForms(); renderTicketPanels();
  } catch (e) { setStatus(msg, 'err', e.message); }
}

async function tfDuplicate(id) {
  const f = (state.ticketForms || []).find(x => x.id === id);
  if (!f) return;
  const gate = premiumGate('ticketForms', (state.ticketForms || []).length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('ticketForms'); return; }
  try {
    const r = await api('POST', `/api/guild/${state.guildId}/ticket-forms`, { name: `${f.name} (copy)`, fields: f.fields });
    state.ticketForms = r.config.forms; state.ticketPanels = r.config.panels;
    renderTicketForms();
  } catch (e) { alert(e.message); }
}

async function tfDeleteForm(id) {
  if (!confirm('Delete this form? Panels using it will fall back to opening with no form.')) return;
  try {
    const r = await api('DELETE', `/api/guild/${state.guildId}/ticket-forms/${id}`);
    state.ticketForms = r.config.forms; state.ticketPanels = r.config.panels;
    renderTicketForms(); renderTicketPanels();
  } catch (e) { alert(e.message); }
}

// ── Ticket panels (each type picks its own form) ───
function renderTicketPanels() {
  const panels = state.ticketPanels || [];
  const gate = premiumGate('ticketPanels', panels.length);
  const newBtn = gateCreateButton(gate, 'New Panel', 'tpNew()', 'ticketPanels', { icon: svg('plus') });
  const body = panels.length
    ? `<div class="ticket-items">${panels.map(tpItemCard).join('')}</div>`
    : ticketEmptyState('ticket', 'No panels yet', 'Create a panel, assign a form, and publish it to a channel.', newBtn);
  document.getElementById('t-panels-section').innerHTML = `
    <div class="card">
      <div class="section-head">
        <h3>Ticket Panels</h3>
        <div class="section-head-actions">${gate.hint}${panels.length ? newBtn : ''}</div>
      </div>
      ${body}
    </div>`;
}

function tpItemCard(p) {
  const ch = p.channelId ? `#${channelName(p.channelId)}` : 'No channel';
  const typeCount = (p.types || []).length;
  const bits = [esc(ch)];
  bits.push(typeCount ? `${typeCount} type${typeCount > 1 ? 's' : ''}` : 'No types');
  bits.push(p.messageId ? 'Published' : 'Not published');
  return `<div class="ticket-item">
    <div class="ticket-item-info">
      <div class="ticket-item-name">${esc(p.name)}</div>
      <div class="hint">${bits.join(' &middot; ')}</div>
    </div>
    <div class="btn-row">
      <button class="btn btn-secondary" onclick="tpEdit('${p.id}')">Edit</button>
      <button class="btn btn-secondary" onclick="tpDuplicate('${p.id}')">Duplicate</button>
      <button class="btn btn-secondary" onclick="tpDelete('${p.id}')">Delete</button>
    </div>
  </div>`;
}

// Options for a per-type form picker: an explicit "no form" entry plus every
// saved form. Picking a form makes that type open the form when chosen.
function tpTypeFormOptions(selectedId) {
  const none = `<option value=""${!selectedId ? ' selected' : ''}>No form (open immediately)</option>`;
  return none + (state.ticketForms || []).map(f =>
    `<option value="${f.id}"${f.id === selectedId ? ' selected' : ''}>${esc(f.name)}</option>`).join('');
}

// One editable ticket-type row: a name plus the form it opens. Accepts legacy
// string types (no per-type form) as well as { name, formId } objects.
function tpTypeRow(t) {
  if (typeof t === 'string') t = { name: t, formId: '' };
  t = t || { name: '', formId: '' };
  return `<div class="tp-type-row">
    <input type="text" class="tp-type-name" maxlength="100" placeholder="Type name (e.g. Support)" value="${esc(t.name || '')}">
    <select class="tp-type-form">${tpTypeFormOptions(t.formId || '')}</select>
    <button class="btn btn-secondary tp-type-del" title="Remove type" onclick="this.closest('.tp-type-row').remove()">${svg('trash')}</button>
  </div>`;
}

function tpModalAddType() {
  const list = document.getElementById('tp-types-list');
  list.insertAdjacentHTML('beforeend', tpTypeRow(null));
}

// Premium-only branding for the published panel embed (logo, banner, author,
// footer). For non-premium guilds the fields are shown but locked.
function tpBrandingSection(p) {
  const isPrem = !!state.guildData?.premium;
  const dis = isPrem ? '' : ' disabled';
  const note = isPrem
    ? '<span class="hint">Customize how the published panel message looks.</span>'
    : `<span class="hint">${premiumChip()} Customize the panel embed (logo, banner, author, footer). Activate Premium on this server to unlock.</span>`;
  return `
    <div class="form-row" style="margin-top:4px"><label>Panel embed branding ${isPrem ? '' : premiumChip()}</label>${note}</div>
    <div class="card-grid">
      <div class="form-row"><label>Logo / thumbnail URL</label><input type="text" id="tp-edit-thumb"${dis} maxlength="500" value="${esc(p.thumbnailUrl || '')}" placeholder="https://example.com/logo.png"></div>
      <div class="form-row"><label>Author / header text</label><input type="text" id="tp-edit-author"${dis} maxlength="256" value="${esc(p.authorName || '')}" placeholder="Shown as a small heading above the title"></div>
    </div>
    <div class="form-row"><label>Banner image URL</label><input type="text" id="tp-edit-image"${dis} maxlength="500" value="${esc(p.imageUrl || '')}" placeholder="https://example.com/banner.png (large image below the text)"></div>
    <div class="form-row"><label>Footer text</label><input type="text" id="tp-edit-footer"${dis} maxlength="2048" value="${esc(p.footerText || '')}" placeholder="Optional footer line"></div>`;
}

// Modal editor for a single panel (new when p.id is null).
function tpOpenModal(p) {
  openAppsModal(`
    <h3 class="modal-title">${p.id ? 'Edit Panel' : 'New Panel'}</h3>
    <input type="hidden" id="tp-edit-id" value="${p.id || ''}">
    <div class="card-grid">
      <div class="form-row"><label>Panel name</label><input type="text" id="tp-edit-name" maxlength="80" value="${esc(p.name || '')}"></div>
      <div class="form-row"><label>Channel</label><select id="tp-edit-channel">${lvChannelOpts(p.channelId || '')}</select></div>
    </div>
    <div class="form-row"><label>Button label</label><input type="text" id="tp-edit-button" maxlength="60" value="${esc(p.buttonLabel || 'Create Ticket')}"></div>
    <div class="form-row"><label>Panel title</label><input type="text" id="tp-edit-title" maxlength="256" value="${esc(p.title || '')}" placeholder="Support Tickets"></div>
    <div class="form-row"><label>Panel description</label><textarea id="tp-edit-desc" maxlength="2000" placeholder="Need help? Use the button below to open a ticket.">${esc(p.description || '')}</textarea></div>
    <div class="form-row"><label>Color</label><div class="color-row"><input type="color" id="tp-edit-color" value="${/^#[0-9a-fA-F]{6}$/.test(p.color) ? p.color : '#5865F2'}"></div></div>
    ${tpBrandingSection(p)}
    <div class="form-row">
      <label>Ticket types</label>
      <span class="hint">Add types so users pick one when opening, and choose which form each one shows. Leave empty to open a ticket immediately with no type picker.</span>
      <div id="tp-types-list">${(p.types || []).map(tpTypeRow).join('')}</div>
      <button class="btn btn-secondary" onclick="tpModalAddType()" style="margin-top:8px">${svg('plus')} Add type</button>
    </div>
    <div class="btn-row" style="margin-top:18px;align-items:center">
      <button class="btn btn-primary" onclick="tpModalSave(true)">Save &amp; Publish</button>
      <button class="btn btn-secondary" onclick="tpModalSave(false)">Save</button>
      <button class="btn btn-secondary" onclick="closeAppsModal()">Cancel</button>
      <span id="tp-edit-msg" class="save-status"></span>
    </div>`);
}

function tpNew() {
  const gate = premiumGate('ticketPanels', (state.ticketPanels || []).length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('ticketPanels'); return; }
  tpOpenModal({ id: null, name: '', channelId: '', buttonLabel: 'Create Ticket', title: '', description: '', color: '#5865F2', thumbnailUrl: '', imageUrl: '', authorName: '', footerText: '', types: [], messageId: null });
}

function tpEdit(id) {
  const p = (state.ticketPanels || []).find(x => x.id === id);
  if (p) tpOpenModal(JSON.parse(JSON.stringify(p)));
}

function tpModalCollectTypes() {
  return [...document.querySelectorAll('#tp-types-list .tp-type-row')].map(row => ({
    name:   row.querySelector('.tp-type-name').value.trim(),
    formId: row.querySelector('.tp-type-form').value || null
  })).filter(t => t.name);
}

function tpModalCollect() {
  const g = id => document.getElementById(id);
  return {
    name:         g('tp-edit-name').value.trim() || 'Ticket panel',
    channelId:    g('tp-edit-channel').value || null,
    buttonLabel:  g('tp-edit-button').value.trim() || 'Create Ticket',
    title:        g('tp-edit-title').value.trim() || null,
    description:  g('tp-edit-desc').value.trim() || null,
    color:        g('tp-edit-color').value || '#5865F2',
    thumbnailUrl: g('tp-edit-thumb').value.trim() || null,
    imageUrl:     g('tp-edit-image').value.trim() || null,
    authorName:   g('tp-edit-author').value.trim() || null,
    footerText:   g('tp-edit-footer').value.trim() || null,
    types:        tpModalCollectTypes()
  };
}

async function tpModalSave(publish) {
  const id = document.getElementById('tp-edit-id').value || null;
  const msg = document.getElementById('tp-edit-msg');
  const payload = { ...tpModalCollect(), publish: !!publish };
  if (publish && !payload.channelId) return setStatus(msg, 'err', 'Pick a channel to publish.');
  try {
    const r = id
      ? await api('PUT', `/api/guild/${state.guildId}/ticket-panels/${id}`, payload)
      : await api('POST', `/api/guild/${state.guildId}/ticket-panels`, payload);
    state.ticketPanels = r.config.panels;
    closeAppsModal();
    renderTicketPanels();
  } catch (e) { setStatus(msg, 'err', e.message); }
}

async function tpDuplicate(id) {
  const p = (state.ticketPanels || []).find(x => x.id === id);
  if (!p) return;
  const gate = premiumGate('ticketPanels', (state.ticketPanels || []).length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('ticketPanels'); return; }
  try {
    const r = await api('POST', `/api/guild/${state.guildId}/ticket-panels`, {
      name: `${p.name} (copy)`, buttonLabel: p.buttonLabel,
      title: p.title, description: p.description, color: p.color,
      thumbnailUrl: p.thumbnailUrl, imageUrl: p.imageUrl, authorName: p.authorName, footerText: p.footerText,
      types: p.types
    });
    state.ticketPanels = r.config.panels;
    renderTicketPanels();
  } catch (e) { alert(e.message); }
}

async function tpDelete(id) {
  if (!confirm('Delete this panel? Its posted message will be removed too.')) return;
  try {
    const r = await api('DELETE', `/api/guild/${state.guildId}/ticket-panels/${id}`);
    state.ticketPanels = r.config.panels;
    renderTicketPanels();
  } catch (e) { alert(e.message); }
}

async function loadOpenTickets() {
  const el  = document.getElementById('open-tickets-list');
  const list = await api('GET', `/api/guild/${state.guildId}/open-tickets`);
  if (!list.length) {
    el.innerHTML = '<span style="color:var(--muted)">No open tickets.</span>';
    return;
  }
  const badgeCls = { Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' };
  el.innerHTML = list.map(t => `
    <div class="ticket-row">
      <span class="ticket-ch">#${esc(t.channelName)}</span>
      <span class="ticket-meta">Type: ${esc(t.type)}</span>
      <span class="badge ${badgeCls[t.priority] || ''}">${esc(t.priority)}</span>
      <span class="ticket-meta">Claimed: ${t.claimedBy ? `<@${t.claimedBy}>` : 'No'}</span>
      <span class="ticket-meta">${timeAgo(t.createdAt)}</span>
      <button class="btn btn-secondary" style="padding:4px 12px;font-size:12px;margin-left:auto"
              onclick="openChat('${t.channelId}','${esc(t.channelName)}')">${svg('chat')} Live Chat</button>
    </div>`).join('');
}

// ── ANTI-NUKE / SECURITY ──────────────────────────
async function loadSecurityConfig() {
  hide('security-body'); hide('security-save-bar');
  if (!state.guildId) { show('security-no-guild'); return; }
  hide('security-no-guild');

  const [{ config, protections, punishments }, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/security`),
    ensureGuildData()
  ]);

  state.security     = config;
  state.securityMeta = { protections, punishments };
  renderSecurity(guild);
  show('security-body'); show('security-save-bar');
}

function channelOptionsHtml(selected) {
  const roleNone = `<option value="">None</option>`;
  return roleNone + (state.guildData?.textChannels || [])
    .map(c => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>#${esc(c.name)}</option>`).join('');
}

function roleMultiHtml(selectedArr) {
  const sel = new Set(selectedArr || []);
  return (state.guildData?.roles || [])
    .map(r => `<option value="${r.id}"${sel.has(r.id) ? ' selected' : ''}>@${esc(r.name)}</option>`).join('');
}

function renderSecurity(guild) {
  const c = state.security;
  const { protections, punishments } = state.securityMeta;

  const punishOpts = key => punishments
    .map(p => `<option value="${p}"${c.protections[key].punishment === p ? ' selected' : ''}>${p}</option>`).join('');

  const rows = protections.map(p => {
    const pc = c.protections[p.key];
    return `<tr data-key="${p.key}">
      <td><label class="sec-switch"><input type="checkbox" class="sec-p-enabled" ${pc.enabled ? 'checked' : ''}><span>${esc(p.label)}</span></label></td>
      <td><input type="number" class="sec-p-limit" min="1" value="${pc.limit}" style="width:64px"></td>
      <td><input type="number" class="sec-p-window" min="1" value="${Math.round(pc.windowMs / 1000)}" style="width:64px"> s</td>
      <td><select class="sec-p-punish">${punishOpts(p.key)}</select></td>
      <td><select class="sec-p-roles" multiple size="3">${roleMultiHtml(pc.whitelist.roles)}</select></td>
    </tr>`;
  }).join('');

  document.getElementById('security-body').innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master">
        <input type="checkbox" id="sec-enabled" ${c.enabled ? 'checked' : ''}>
        <span><strong>Enable Anti-Nuke</strong>. When off, nothing is detected or punished.</span>
      </label>
      <div class="form-row" style="margin-top:14px">
        <label>Security Log Channel</label>
        <select id="sec-logchannel">${channelOptionsHtml(c.logChannelId)}</select>
        <span class="hint">Triggered protections are reported here.</span>
      </div>
    </div>

    <div class="card">
      <h3>Global Whitelist</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Exempt from <em>all</em> protections. The server owner and bot owner are always exempt.</p>
      <div class="card-grid">
        <div class="form-row">
          <label>Whitelisted Roles</label>
          <div id="sec-global-roles"></div>
        </div>
        <div class="form-row">
          <label>Whitelisted User IDs</label>
          <textarea id="sec-global-users" placeholder="One ID per line or comma-separated">${esc((c.globalWhitelist.users || []).join('\n'))}</textarea>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>Protections</h3>
      <div class="log-table-wrap">
        <table class="log-table sec-table">
          <thead><tr>
            <th>Protection</th><th>Limit</th><th>Window</th><th>Punishment</th><th>Whitelisted Roles</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    </div>`;

  msInit('sec-global-roles', roleItems(), c.globalWhitelist.roles);
}

function selectedValues(el) {
  return [...el.selectedOptions].map(o => o.value).filter(Boolean);
}

async function saveSecurityConfig() {
  if (!state.guildId || !state.security) return;
  const msg = document.getElementById('security-save-msg');

  const userIds = (document.getElementById('sec-global-users').value.match(/\d{16,20}/g)) || [];

  const protections = {};
  document.querySelectorAll('.sec-table tbody tr').forEach(tr => {
    protections[tr.dataset.key] = {
      enabled:    tr.querySelector('.sec-p-enabled').checked,
      limit:      Math.max(1, parseInt(tr.querySelector('.sec-p-limit').value, 10) || 1),
      windowMs:   Math.max(1, parseInt(tr.querySelector('.sec-p-window').value, 10) || 1) * 1000,
      punishment: tr.querySelector('.sec-p-punish').value,
      whitelist:  { users: [], roles: selectedValues(tr.querySelector('.sec-p-roles')) }
    };
  });

  const payload = {
    enabled:      document.getElementById('sec-enabled').checked,
    logChannelId: document.getElementById('sec-logchannel').value || null,
    globalWhitelist: { users: userIds, roles: msValues('sec-global-roles') },
    protections
  };

  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/security`, payload);
    state.security = res.config;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch {
    setStatus(msg, 'err', '❌ Failed to save.');
  }
}

// ── VERIFICATION ──────────────────────────────────
async function loadVerification() {
  hide('verif-body');
  if (!state.guildId) { show('verif-no-guild'); return; }
  hide('verif-no-guild');

  const [config, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/verification`),
    ensureGuildData()
  ]);

  document.getElementById('verif-enabled').checked = !!config.enabled;
  document.getElementById('verif-title').value = config.panelTitle || '';
  document.getElementById('verif-desc').value  = config.panelDescription || '';
  document.getElementById('verif-minage').value = config.minAccountAgeDays || 0;
  document.getElementById('verif-requireavatar').checked = !!config.requireAvatar;
  fillSelect('verif-channel', guild.textChannels, config.channelId,      n => `#${n.name}`);
  fillSelect('verif-role',    guild.roles,        config.verifiedRoleId, n => `@${n.name}`);
  show('verif-body');
}

async function saveVerification(repost) {
  if (!state.guildId) return;
  const msg = document.getElementById('verif-save-msg');
  const payload = {
    enabled:          document.getElementById('verif-enabled').checked,
    channelId:        document.getElementById('verif-channel').value || null,
    verifiedRoleId:   document.getElementById('verif-role').value || null,
    panelTitle:       document.getElementById('verif-title').value.trim() || null,
    panelDescription: document.getElementById('verif-desc').value.trim() || null,
    minAccountAgeDays: parseInt(document.getElementById('verif-minage').value, 10) || 0,
    requireAvatar:    document.getElementById('verif-requireavatar').checked,
    repost: !!repost
  };
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/verification`, payload);
    setStatus(msg, 'ok', repost ? (res.posted ? '✅ Saved & panel posted!' : '✅ Saved (panel not posted, check the channel).') : '✅ Saved!');
  } catch {
    setStatus(msg, 'err', '❌ Failed to save.');
  }
}

// ── WELCOME & LEAVE ───────────────────────────────
const GREET_META = {
  welcome: { title: 'Welcome Message', blurb: 'Posted when a member joins the server.' },
  leave:   { title: 'Leave Message',   blurb: 'Posted when a member leaves the server.' }
};

async function loadGreetings() {
  hide('greet-body');
  if (!state.guildId) { show('greet-no-guild'); return; }
  hide('greet-no-guild');
  const [data] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/greetings`),
    ensureGuildData()
  ]);
  state.greetings = data.config;
  renderGreetSection('welcome');
  renderGreetSection('leave');
  show('greet-body');
}

function renderGreetSection(which) {
  const cfg  = state.greetings[which];
  const meta = GREET_META[which];
  const isEmbed = cfg.mode === 'embed';
  const thumbMode = cfg.embed.thumbnail === 'avatar' ? 'avatar' : (cfg.embed.thumbnail ? 'url' : 'none');
  const textLabel = isEmbed ? 'Text above the embed (optional)' : 'Message text';
  document.getElementById(`greet-${which}-section`).innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master">
        <input type="checkbox" id="g-${which}-enabled" ${cfg.enabled ? 'checked' : ''}>
        <span><strong>Enable ${meta.title}</strong></span>
      </label>
      <p class="hint" style="margin:6px 0 14px">${meta.blurb}</p>
      <div class="card-grid">
        <div class="form-row"><label>Channel</label><select id="g-${which}-channel">${lvChannelOpts(cfg.channelId || '')}</select></div>
        <div class="form-row"><label>Message style</label>
          <select id="g-${which}-mode" onchange="greetModeChanged('${which}')">
            <option value="embed"${isEmbed ? ' selected' : ''}>Embed</option>
            <option value="text"${!isEmbed ? ' selected' : ''}>Plain text</option>
          </select>
        </div>
      </div>
      <div class="form-row"><label>${textLabel}</label><textarea id="g-${which}-text" maxlength="2000" placeholder="Welcome {user} to {server}!">${esc(cfg.text || '')}</textarea></div>
      <div id="g-${which}-embed" class="${isEmbed ? '' : 'hidden'}">
        <div class="card-grid">
          <div class="form-row"><label>Embed title</label><input type="text" id="g-${which}-title" maxlength="256" value="${esc(cfg.embed.title)}" placeholder="Welcome!"></div>
          <div class="form-row"><label>Color</label><div class="color-row"><input type="color" id="g-${which}-color" value="${/^#[0-9a-fA-F]{6}$/.test(cfg.embed.color) ? cfg.embed.color : '#5865F2'}"></div></div>
        </div>
        <div class="form-row"><label>Embed description</label><textarea id="g-${which}-desc" maxlength="4000" placeholder="Glad to have you, {username}. You are member number {membercount}.">${esc(cfg.embed.description)}</textarea></div>
        <div class="card-grid">
          <div class="form-row"><label>Thumbnail</label>
            <select id="g-${which}-thumb-mode" onchange="greetThumbChanged('${which}')">
              <option value="none"${thumbMode === 'none' ? ' selected' : ''}>None</option>
              <option value="avatar"${thumbMode === 'avatar' ? ' selected' : ''}>Member avatar</option>
              <option value="url"${thumbMode === 'url' ? ' selected' : ''}>Custom URL</option>
            </select>
          </div>
          <div class="form-row"><label>Footer text</label><input type="text" id="g-${which}-footer" maxlength="2048" value="${esc(cfg.embed.footer)}"></div>
        </div>
        <div class="form-row ${thumbMode === 'url' ? '' : 'hidden'}" id="g-${which}-thumb-url-row"><label>Thumbnail URL</label><input type="text" id="g-${which}-thumb-url" maxlength="500" value="${esc(thumbMode === 'url' ? cfg.embed.thumbnail : '')}" placeholder="https://example.com/image.png"></div>
        <div class="form-row"><label>Banner image URL</label><input type="text" id="g-${which}-image" maxlength="500" value="${esc(cfg.embed.image)}" placeholder="https://example.com/banner.png"></div>
        <label class="sec-switch" style="margin-top:4px"><input type="checkbox" id="g-${which}-ts" ${cfg.embed.showTimestamp ? 'checked' : ''}><span>Show a timestamp on the embed</span></label>
      </div>
      <div class="hint" style="margin-top:12px">Placeholders: <code>{user}</code> mention, <code>{username}</code>, <code>{tag}</code>, <code>{server}</code>, <code>{membercount}</code>.</div>
      <div class="btn-row" style="margin-top:12px;align-items:center">
        <button class="btn btn-secondary" onclick="testGreeting('${which}')">Send test message</button>
        <span id="g-${which}-test-msg" class="save-status"></span>
      </div>
    </div>`;
}

// Reads the current DOM for one section back into state, so re-rendering (after a
// style/thumbnail change) keeps every other field the admin already edited.
function collectGreetSection(which) {
  const g = id => document.getElementById(`g-${which}-${id}`);
  const cfg = state.greetings[which];
  cfg.enabled   = g('enabled').checked;
  cfg.channelId = g('channel').value || null;
  cfg.mode      = g('mode').value;
  cfg.text      = g('text').value;
  cfg.embed.title         = g('title').value;
  cfg.embed.description   = g('desc').value;
  cfg.embed.color         = g('color').value;
  cfg.embed.footer        = g('footer').value;
  cfg.embed.image         = g('image').value;
  cfg.embed.showTimestamp = g('ts').checked;
  const tm = g('thumb-mode').value;
  cfg.embed.thumbnail = tm === 'avatar' ? 'avatar' : (tm === 'url' ? g('thumb-url').value.trim() : '');
}

function greetModeChanged(which) { collectGreetSection(which); renderGreetSection(which); }
function greetThumbChanged(which) { collectGreetSection(which); renderGreetSection(which); }

async function saveGreetings() {
  if (!state.guildId) return;
  collectGreetSection('welcome');
  collectGreetSection('leave');
  const msg = document.getElementById('greet-save-msg');
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/greetings`, state.greetings);
    state.greetings = res.config;
    setStatus(msg, 'ok', 'Saved');
    renderGreetSection('welcome');
    renderGreetSection('leave');
  } catch (e) { setStatus(msg, 'err', e.message || 'Failed to save.'); }
}

async function testGreeting(which) {
  if (!state.guildId) return;
  collectGreetSection('welcome');
  collectGreetSection('leave');
  const msg = document.getElementById(`g-${which}-test-msg`);
  if (!state.greetings[which].channelId) return setStatus(msg, 'err', 'Pick a channel first.');
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/greetings`, { ...state.greetings, test: which });
    state.greetings = res.config;
    setStatus(msg, res.tested ? 'ok' : 'err', res.tested ? 'Test sent to the channel.' : 'Could not send. Check the channel and my permissions.');
  } catch (e) { setStatus(msg, 'err', e.message || 'Failed.'); }
}

// ── SOCIAL ALERTS ─────────────────────────────────
async function loadSocial() {
  hide('social-body');
  if (!state.guildId) { show('social-no-guild'); return; }
  hide('social-no-guild');
  await ensureGuildData();
  const data = await api('GET', `/api/guild/${state.guildId}/social`);
  state.socialConfig = data.config;
  state.socialProviders = data.providers;
  renderSocial();
  show('social-body');
}

function socialTotalCreators() {
  return Object.values(state.socialConfig.platforms).reduce((n, p) => n + (p.creators?.length || 0), 0);
}
function socCreatorsHtml(pid) {
  const list = state.socialConfig.platforms[pid].creators;
  if (!list.length) return '<span class="hint">No creators followed yet.</span>';
  return list.map(c => `<span class="ms-tag">${esc(c.name)}<button class="ms-tag-x" onclick="socialRemove('${pid}','${esc(c.key)}')">${svg('x')}</button></span>`).join('');
}

function renderSocial() {
  const cards = state.socialProviders.map(p => {
    const pc = state.socialConfig.platforms[p.id];
    const warn = p.needsAuth && !p.configured
      ? `<div class="soc-warn">${svg('warn')} ${esc(p.label)} alerts aren't available yet. The bot owner needs to enable ${esc(p.label)} integration before these notifications can be used.</div>`
      : '';
    return `<div class="card">
      <div class="soc-head">
        <h3>${p.emoji} ${esc(p.label)} <span class="hint">· ${p.kind === 'live' ? 'goes live' : 'new posts'}</span></h3>
        <label class="sec-switch"><input type="checkbox" id="soc-${p.id}-enabled" ${chk(pc.enabled)}><span>Enabled</span></label>
      </div>
      ${warn}
      <div class="card-grid">
        <div class="form-row"><label>Notification Channel</label><select id="soc-${p.id}-channel"></select></div>
        <div class="form-row"><label>Mention Role (optional)</label><select id="soc-${p.id}-role"></select></div>
      </div>
      <div class="form-row"><label>Message</label>
        <textarea id="soc-${p.id}-template" rows="2">${esc(pc.template)}</textarea>
        <span class="hint">Placeholders: {name} {title} {url} {platform}</span></div>
      <div class="form-row"><label>Creators</label>
        <div class="ms-tags-static" id="soc-${p.id}-creators">${socCreatorsHtml(p.id)}</div>
        <div class="btn-row" style="margin-top:10px">
          <input type="text" id="soc-${p.id}-add" placeholder="${esc(p.example)}" style="flex:1;min-width:200px">
          <button class="btn btn-secondary" onclick="socialAdd('${p.id}')">Add</button>
          <button class="btn btn-secondary" onclick="socialTest('${p.id}')">Send test</button>
        </div>
        <span class="hint" id="soc-${p.id}-msg"></span>
      </div>
    </div>`;
  }).join('');

  const total = socialTotalCreators();
  const gate = premiumGate('socialCreators', total);
  const header = `<div class="card" style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
      <span>Following <strong>${total}</strong> creator${total === 1 ? '' : 's'} across all platforms.</span> ${gate.hint}
    </div>`;

  document.getElementById('social-body').innerHTML = header + cards + `
    <div class="save-bar"><button class="btn btn-primary" onclick="saveSocial()">Save Settings</button>
      <span id="social-save-msg" class="save-status"></span></div>`;

  for (const p of state.socialProviders) {
    const pc = state.socialConfig.platforms[p.id];
    fillSelect(`soc-${p.id}-channel`, state.guildData.textChannels, pc.channelId, n => `#${n.name}`);
    fillSelect(`soc-${p.id}-role`, state.guildData.roles, pc.mentionRoleId, n => `@${n.name}`);
  }
}

async function saveSocial() {
  const platforms = {};
  for (const p of state.socialProviders) {
    platforms[p.id] = {
      enabled: boolv(`soc-${p.id}-enabled`),
      channelId: document.getElementById(`soc-${p.id}-channel`).value || null,
      mentionRoleId: document.getElementById(`soc-${p.id}-role`).value || null,
      template: document.getElementById(`soc-${p.id}-template`).value
    };
  }
  const msg = document.getElementById('social-save-msg');
  try { const r = await api('PUT', `/api/guild/${state.guildId}/social`, { platforms }); state.socialConfig = r.config; setStatus(msg, 'ok', '✅ Saved!'); }
  catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

async function socialAdd(pid) {
  const input = document.getElementById(`soc-${pid}-add`);
  const account = input.value.trim();
  const msg = document.getElementById(`soc-${pid}-msg`);
  if (!account) return;
  const gate = premiumGate('socialCreators', socialTotalCreators());
  if (gate.atCap) {
    if (!gate.isPrem) return premiumNudge('socialCreators');
    msg.textContent = `Limit reached (${gate.cap}).`; return;
  }
  msg.textContent = 'Adding…';
  try {
    const r = await api('POST', `/api/guild/${state.guildId}/social/creator`, { platform: pid, account });
    state.socialConfig = r.config;
    input.value = '';
    document.getElementById(`soc-${pid}-creators`).innerHTML = socCreatorsHtml(pid);
    msg.textContent = '';
  } catch (e) { msg.innerHTML = svg('x') + ' ' + esc(e.message); }
}

async function socialRemove(pid, key) {
  try {
    const r = await api('POST', `/api/guild/${state.guildId}/social/creator/delete`, { platform: pid, key });
    state.socialConfig = r.config;
    document.getElementById(`soc-${pid}-creators`).innerHTML = socCreatorsHtml(pid);
  } catch {}
}

async function socialTest(pid) {
  const msg = document.getElementById(`soc-${pid}-msg`);
  msg.textContent = 'Sending…';
  try { await api('POST', `/api/guild/${state.guildId}/social/test`, { platform: pid }); msg.innerHTML = svg('check') + ' Test sent.'; setTimeout(() => msg.textContent = '', 3000); }
  catch (e) { msg.innerHTML = svg('x') + ' ' + esc(e.message); }
}

// ── POLLS ─────────────────────────────────────────
async function loadPolls() {
  hide('polls-body');
  if (!state.guildId) { show('polls-no-guild'); return; }
  hide('polls-no-guild');
  await ensureGuildData();
  const data = await api('GET', `/api/guild/${state.guildId}/polls`);
  state.pollConfig = data.config;
  state.pollList = data.polls;
  if (!state.pollOptions) state.pollOptions = ['', ''];
  renderPolls();
  show('polls-body');
}

const POLL_STATUS = { active: `${dot('var(--green)')}Active`, scheduled: `${svg('clock')} Scheduled`, ended: `${svg('lock')} Ended`, cancelled: `${svg('ban')} Cancelled` };
function channelName(id) { const c = (state.guildData?.textChannels || []).find(x => x.id === id); return c ? c.name : id; }

// Effective option cap for the current guild (free vs premium, bounded by the
// server's own maxOptions setting). Drives the builder so free users see the
// limit up front instead of being rejected at "Create & Post".
function pollOptMax() {
  const lim = state.guildData?.limits?.pollOptions || { free: 4, premium: 25 };
  const cap = state.guildData?.premium ? lim.premium : lim.free;
  return Math.min(cap, state.pollConfig?.maxOptions || 25);
}

function pollOptionRows() {
  return state.pollOptions.map((v, i) => `
    <div class="lv-row">
      <input class="poll-opt" placeholder="Option ${i + 1}" value="${esc(v)}" style="flex:1;min-width:160px">
      <button class="btn btn-secondary lv-del" onclick="pollDelOption(${i})">${svg('x')}</button>
    </div>`).join('');
}

// Rows + the add button + a limit hint, re-rendered together so the button can
// flip to a locked "Premium" state once a free server hits its option cap.
function pollOptionsArea() {
  const lim = state.guildData?.limits?.pollOptions || { free: 4, premium: 25 };
  const isPrem = !!state.guildData?.premium;
  const atCap  = state.pollOptions.length >= pollOptMax();
  const addBtn = (!isPrem && atCap)
    ? `<button class="btn btn-secondary btn-locked" onclick="pollPremiumNudge()" title="Premium feature">${svg('gem')} Add Option · Premium</button>`
    : `<button class="btn btn-secondary" onclick="pollAddOption()" ${atCap ? 'disabled' : ''}>+ Add Option</button>`;
  const hint = isPrem
    ? `<span class="hint">${premiumChip()} up to ${lim.premium} options.</span>`
    : `<span class="hint">Free: up to <b>${lim.free}</b> options · ${premiumChip()} up to <b>${lim.premium}</b>.</span>`;
  return `<div id="poll-options">${pollOptionRows()}</div>
    <div class="poll-opt-actions" style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">${addBtn}${hint}</div>`;
}
function renderPollOptions() { const el = document.getElementById('poll-options-area'); if (el) el.innerHTML = pollOptionsArea(); }

function pollSyncOptions() { state.pollOptions = [...document.querySelectorAll('.poll-opt')].map(i => i.value); }
function pollAddOption() { pollSyncOptions(); if (state.pollOptions.length < pollOptMax()) state.pollOptions.push(''); renderPollOptions(); }
function pollDelOption(i) { pollSyncOptions(); state.pollOptions.splice(i, 1); while (state.pollOptions.length < 2) state.pollOptions.push(''); renderPollOptions(); }
function pollPremiumNudge() {
  const lim = state.guildData?.limits?.pollOptions || { free: 4, premium: 25 };
  const el = document.getElementById('poll-create-msg');
  if (el) setStatus(el, 'err', `Free servers allow up to ${lim.free} poll options. Upgrade to Premium for up to ${lim.premium}.`);
}

function pollListCard(title, list, actionable) {
  if (!list.length) return '';
  const rows = list.map(p => {
    const bars = p.options.map(o => `<div class="hint">${esc(o.label)}: ${o.count} (${o.percent}%)${o.leading && o.count ? ' ' + svg('trophy') : ''}</div>`).join('');
    const when = p.status === 'scheduled' && p.scheduledFor ? `opens ${new Date(p.scheduledFor).toLocaleString()}`
               : p.endsAt ? `ends ${new Date(p.endsAt).toLocaleString()}` : '';
    const btns = actionable ? `<div class="btn-row">
      ${p.status === 'active' ? `<button class="btn btn-secondary" onclick="pollAction('${p.id}','end')">End</button>` : ''}
      ${p.status === 'active' || p.status === 'scheduled' ? `<button class="btn btn-secondary" onclick="pollAction('${p.id}','cancel')">Cancel</button>` : ''}
    </div>` : '';
    return `<div class="alt-flag-row" style="align-items:flex-start">
      <div style="flex:1;min-width:200px">
        <div><strong>${esc(p.question)}</strong> <span class="hint">· ${POLL_STATUS[p.status] || p.status} · ${p.voters} voter(s)${p.multi ? ' · multi' : ''}${p.anonymous ? ' · anon' : ''}</span></div>
        <div class="hint">#${esc(channelName(p.channelId))} · <code>${esc(p.id)}</code>${when ? ` · ${esc(when)}` : ''}</div>
        <div style="margin-top:6px">${bars}</div>
      </div>${btns}</div>`;
  }).join('');
  return `<div class="card"><h3>${title}</h3><div class="alt-flags">${rows}</div></div>`;
}

function renderPolls() {
  const cfg = state.pollConfig;
  const live = state.pollList.filter(p => p.status === 'active' || p.status === 'scheduled');
  const past = state.pollList.filter(p => p.status === 'ended' || p.status === 'cancelled').slice(0, 20);

  document.getElementById('polls-body').innerHTML = `
    <div class="card">
      <h3>Create a Poll</h3>
      <div class="card-grid">
        <div class="form-row"><label>Channel</label><select id="poll-channel"></select></div>
        <div class="form-row"><label>Question</label><input type="text" id="poll-question" maxlength="256" placeholder="What should we play next?"></div>
      </div>
      <div class="form-row"><label>Options</label><div id="poll-options-area">${pollOptionsArea()}</div></div>
      <div class="card-grid">
        <label class="sec-switch"><input type="checkbox" id="poll-multi"><span>Allow multiple choices</span></label>
        <div class="form-row"><label>Max choices (0 = all)</label><input type="number" id="poll-maxchoices" min="0" value="0"></div>
        <label class="sec-switch"><input type="checkbox" id="poll-anon"><span>Anonymous</span></label>
        <label class="sec-switch"><input type="checkbox" id="poll-hide"><span>Hide results until it ends</span></label>
      </div>
      <div class="card-grid">
        <div class="form-row"><label>Auto-end after (minutes, 0 = off)</label><input type="number" id="poll-duration" min="0" value="0"></div>
        <div class="form-row"><label>Start in (minutes, 0 = now)</label><input type="number" id="poll-schedule" min="0" value="0"></div>
        <div class="form-row"><label>Restrict voting to roles</label><div id="poll-roles"></div></div>
      </div>
      <div class="save-bar"><button class="btn btn-primary" onclick="createPoll()">Create &amp; Post</button>
        <span id="poll-create-msg" class="save-status"></span></div>
    </div>
    ${pollListCard('Active &amp; Scheduled', live, true)}
    ${past.length ? pollListCard('History', past, false) : ''}
    <div class="card">
      <h3>Poll Settings</h3>
      <div class="card-grid">
        <div class="form-row"><label>Default auto-end (minutes)</label><input type="number" id="pollcfg-duration" min="0" value="${cfg.defaultDurationMin}"></div>
        <div class="form-row"><label>Max options per poll</label><input type="number" id="pollcfg-maxopts" min="2" max="25" value="${cfg.maxOptions}"></div>
        <div class="form-row"><label>Results channel (optional)</label><select id="pollcfg-results"></select><span class="hint">A summary is posted here when a poll ends.</span></div>
      </div>
      <div class="form-row"><label>Roles allowed to create polls</label><div id="pollcfg-creators"></div>
        <span class="hint">Members with Manage Messages can always create polls.</span></div>
      <div class="save-bar"><button class="btn btn-primary" onclick="savePollConfig()">Save Settings</button>
        <span id="pollcfg-msg" class="save-status"></span></div>
    </div>`;

  fillSelect('poll-channel', state.guildData.textChannels, null, n => `#${n.name}`);
  fillSelect('pollcfg-results', state.guildData.textChannels, cfg.resultsChannelId, n => `#${n.name}`);
  msInit('poll-roles', roleItems(), []);
  msInit('pollcfg-creators', roleItems(), cfg.creatorRoleIds);
}

async function createPoll() {
  pollSyncOptions();
  const payload = {
    channelId: document.getElementById('poll-channel').value,
    question: document.getElementById('poll-question').value.trim(),
    options: state.pollOptions.map(s => s.trim()).filter(Boolean),
    multi: boolv('poll-multi'),
    maxChoices: numv('poll-maxchoices', 0),
    anonymous: boolv('poll-anon'),
    hideResults: boolv('poll-hide'),
    durationMin: numv('poll-duration', 0),
    scheduleMin: numv('poll-schedule', 0),
    allowedRoleIds: msValues('poll-roles')
  };
  const okMsg = (ok, text) => setStatus(document.getElementById('poll-create-msg'), ok ? 'ok' : 'err', text);
  if (!payload.channelId) return okMsg(false, '❌ Pick a channel.');
  if (!payload.question || payload.options.length < 2) return okMsg(false, '❌ Need a question and 2+ options.');
  try {
    await api('POST', `/api/guild/${state.guildId}/polls`, payload);
    state.pollOptions = ['', ''];
    await loadPolls();
    okMsg(true, '✅ Poll posted!');
  } catch (e) { okMsg(false, '❌ ' + e.message); }
}

async function savePollConfig() {
  const msg = document.getElementById('pollcfg-msg');
  const payload = {
    defaultDurationMin: numv('pollcfg-duration', 0),
    maxOptions: numv('pollcfg-maxopts', 25),
    resultsChannelId: document.getElementById('pollcfg-results').value || null,
    creatorRoleIds: msValues('pollcfg-creators')
  };
  try { const r = await api('PUT', `/api/guild/${state.guildId}/polls/config`, payload); state.pollConfig = r.config; setStatus(msg, 'ok', '✅ Saved!'); }
  catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

async function pollAction(id, op) {
  try { await api('POST', `/api/guild/${state.guildId}/polls/${id}/${op}`); await loadPolls(); } catch {}
}

// ── ALT DETECTION ─────────────────────────────────
const ALT_SIG_PARAMS = {
  youngAccount: [{ key: 'maxAgeDays', label: 'Max age (days)', min: 1 }],
  instantJoin:  [{ key: 'withinHours', label: 'Within (hours)', min: 1 }],
  joinBurst:    [{ key: 'joins', label: 'Joins', min: 2 }, { key: 'windowSec', label: 'Window (s)', min: 5 }]
};

async function loadAltDetect() {
  hide('alt-body'); hide('alt-save-bar');
  if (!state.guildId) { show('alt-no-guild'); return; }
  hide('alt-no-guild');
  await ensureGuildData();
  const data = await api('GET', `/api/guild/${state.guildId}/altdetect`);
  state.altdetect = data.config;
  state.altMeta = { signals: data.signals, presets: data.presets, actions: data.actions, flags: data.flags, pending: data.pending };
  renderAltDetect();
  show('alt-body'); show('alt-save-bar');
}

function altActionOptions(selected) {
  return state.altMeta.actions.map(a =>
    `<option value="${a.value}"${a.value === selected ? ' selected' : ''}>${esc(a.label)}</option>`).join('');
}

function altPresetButtons() {
  return Object.keys(state.altMeta.presets).map(name => {
    const on = state.altdetect.sensitivity === name ? ' btn-primary' : ' btn-secondary';
    return `<button class="btn${on}" style="text-transform:capitalize" onclick="applyAltPreset('${name}')">${name}</button>`;
  }).join('') + (state.altdetect.sensitivity === 'custom'
    ? '<span class="hint" style="align-self:center">Custom settings</span>' : '');
}

function altSignalCard(meta) {
  const c = state.altdetect.signals[meta.key];
  if (!c) return '';
  const params = (ALT_SIG_PARAMS[meta.key] || []).map(p =>
    `<div class="form-row"><label>${p.label}</label>
       <input type="number" id="alt-sig-${meta.key}-${p.key}" min="${p.min || 0}" value="${c[p.key]}"></div>`).join('');
  return `
    <div class="card">
      <label class="sec-switch sec-master"><input type="checkbox" id="alt-sig-${meta.key}-en" ${chk(c.enabled)}>
        <span><strong>${esc(meta.label)}</strong></span></label>
      <p class="hint" style="margin:6px 0 12px">${esc(meta.desc)}</p>
      <div class="card-grid">
        <div class="form-row"><label>Weight (points)</label>
          <input type="number" id="alt-sig-${meta.key}-w" min="0" max="100" value="${c.weight}"></div>
        ${params}
      </div>
    </div>`;
}

function altFlagsCard() {
  const flags = state.altMeta.flags || [];
  if (!flags.length) return `<div class="card"><h3>Recent Flags</h3><p class="hint">No accounts have been flagged yet.</p></div>`;
  const rows = flags.map(f => {
    const tone = f.level === 'high' ? 'l-error' : 'l-warn';
    const sigs = (f.signals || []).map(s => s.label).join(', ') || 'none';
    const clear = f.status === 'pending'
      ? `<button class="btn btn-secondary" onclick="clearAltFlag('${f.userId}')">Mark cleared</button>` : '';
    return `<div class="alt-flag-row">
      <span class="${tone}" style="font-weight:600">${f.score}/100</span>
      <div style="flex:1;min-width:160px">
        <div><code>${esc(f.tag || f.userId)}</code> · <span class="hint">${esc(f.status)}</span></div>
        <div class="hint">${esc(sigs)}</div>
      </div>${clear}</div>`;
  }).join('');
  return `<div class="card"><h3>Recent Flags <span class="hint">(${state.altMeta.pending} pending)</span></h3>
    <div class="alt-flags">${rows}</div></div>`;
}

function renderAltDetect() {
  const c = state.altdetect;
  document.getElementById('alt-body').innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master"><input type="checkbox" id="alt-enabled" ${chk(c.enabled)}>
        <span><strong>Enable Alt Detection</strong></span></label>
    </div>
    <div class="card">
      <h3>Sensitivity</h3>
      <p class="hint" style="margin-bottom:12px">Presets set the thresholds and account-age window below. Editing any value switches to Custom.</p>
      <div class="btn-row" id="alt-presets">${altPresetButtons()}</div>
      <div class="card-grid" style="margin-top:14px">
        <div class="form-row"><label>Flag at score ≥</label><input type="number" id="alt-th-flag" min="1" max="100" value="${c.thresholds.flag}"></div>
        <div class="form-row"><label>High risk at score ≥</label><input type="number" id="alt-th-high" min="1" max="100" value="${c.thresholds.high}"></div>
      </div>
    </div>
    <div class="card">
      <h3>Actions</h3>
      <p class="hint" style="margin-bottom:12px">What to do automatically when a member is flagged. "Flag for review" only posts to the review channel.</p>
      <div class="card-grid">
        <div class="form-row"><label>When flagged (Suspicious)</label><select id="alt-act-flag">${altActionOptions(c.actions.onFlag)}</select></div>
        <div class="form-row"><label>When high risk</label><select id="alt-act-high">${altActionOptions(c.actions.onHigh)}</select></div>
        <div class="form-row"><label>Review Channel</label><select id="alt-review-ch"></select><span class="hint">Where flag alerts and review buttons are posted.</span></div>
        <div class="form-row"><label>Quarantine Role</label><select id="alt-quarantine"></select><span class="hint">Added by the Quarantine action.</span></div>
      </div>
      <label class="sec-switch" style="margin-top:8px"><input type="checkbox" id="alt-dm" ${chk(c.dmOnAction)}>
        <span>DM members before kicking or banning them</span></label>
    </div>
    <div class="card">
      <h3>Exempt Roles</h3>
      <p class="hint" style="margin-bottom:10px">Members with any of these roles are never screened.</p>
      <div id="alt-exempt"></div>
    </div>
    <h3 style="margin:24px 4px 4px">Detection Signals</h3>
    <p class="hint" style="margin:0 4px 8px">Each enabled signal adds up to its weight in points. A member is flagged when the total reaches the threshold above.</p>
    ${state.altMeta.signals.map(altSignalCard).join('')}
    ${altFlagsCard()}`;

  fillSelect('alt-review-ch', state.guildData.textChannels, c.reviewChannelId, n => `#${n.name}`);
  fillSelect('alt-quarantine', state.guildData.roles, c.quarantineRoleId, n => `@${n.name}`);
  msInit('alt-exempt', roleItems(), c.exemptRoleIds);
}

function collectAltDetect() {
  const c = state.altdetect;
  c.enabled = boolv('alt-enabled');
  c.thresholds = { flag: numv('alt-th-flag', 50), high: numv('alt-th-high', 75) };
  c.actions = { onFlag: document.getElementById('alt-act-flag').value, onHigh: document.getElementById('alt-act-high').value };
  c.reviewChannelId = document.getElementById('alt-review-ch').value || null;
  c.quarantineRoleId = document.getElementById('alt-quarantine').value || null;
  c.dmOnAction = boolv('alt-dm');
  c.exemptRoleIds = msValues('alt-exempt');
  for (const meta of state.altMeta.signals) {
    const s = c.signals[meta.key];
    s.enabled = boolv(`alt-sig-${meta.key}-en`);
    s.weight = numv(`alt-sig-${meta.key}-w`, s.weight);
    for (const p of ALT_SIG_PARAMS[meta.key] || []) s[p.key] = numv(`alt-sig-${meta.key}-${p.key}`, s[p.key]);
  }
  return c;
}

function applyAltPreset(name) {
  collectAltDetect();
  const p = state.altMeta.presets[name];
  if (!p) return;
  state.altdetect.sensitivity = name;
  state.altdetect.thresholds = { ...p.thresholds };
  state.altdetect.signals.youngAccount.maxAgeDays = p.youngAccountDays;
  state.altdetect.signals.joinBurst.joins = p.burst.joins;
  state.altdetect.signals.joinBurst.windowSec = p.burst.windowSec;
  renderAltDetect();
}

async function saveAltDetect() {
  if (!state.guildId) return;
  const msg = document.getElementById('alt-save-msg');
  const payload = collectAltDetect();
  payload.sensitivity = state.altdetect.sensitivity; // server re-derives custom if values diverge
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/altdetect`, payload);
    state.altdetect = res.config;
    renderAltDetect();
    setStatus(msg, 'ok', '✅ Saved!');
  } catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

async function clearAltFlag(userId) {
  try {
    await api('POST', `/api/guild/${state.guildId}/altdetect/flags/${userId}`, { status: 'cleared' });
    const f = state.altMeta.flags.find(x => x.userId === userId);
    if (f) { f.status = 'cleared'; state.altMeta.pending = Math.max(0, state.altMeta.pending - 1); }
    renderAltDetect();
  } catch {}
}

// ── LEVELING ──────────────────────────────────────
async function loadLeveling() {
  hide('leveling-body'); hide('leveling-save-bar');
  if (!state.guildId) { show('leveling-no-guild'); return; }
  hide('leveling-no-guild');

  const [data, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/leveling`),
    ensureGuildData()
  ]);
  state.leveling = data.config;
  state.levelingMeta = { curves: data.curves, announceModes: data.announceModes };
  renderLeveling(guild);
  show('leveling-body'); show('leveling-save-bar');
}

function lvChannelOpts(sel) {
  return '<option value="">None</option>' + (state.guildData?.textChannels || [])
    .map(c => `<option value="${c.id}"${c.id === sel ? ' selected' : ''}>#${esc(c.name)}</option>`).join('');
}
function lvRoleOpts(sel) {
  return '<option value="">None</option>' + (state.guildData?.roles || [])
    .map(r => `<option value="${r.id}"${r.id === sel ? ' selected' : ''}>@${esc(r.name)}</option>`).join('');
}
const chk = b => b ? 'checked' : '';

function renderLeveling() {
  const c = state.leveling;
  const annOpts = state.levelingMeta.announceModes.map(v => `<option value="${v}"${c.announce.mode === v ? ' selected' : ''}>${ANN_LABELS[v] || v}</option>`).join('');

  // Friendly "speed" preset: maps to the standard curve + a multiplier. Falls back to Custom.
  const sp = (c.formula.curve === 'mee6' && [0.5, 1, 2].includes(c.multiplier)) ? String(c.multiplier) : 'custom';
  const speedOpt = (v, label) => `<option value="${v}"${sp === v ? ' selected' : ''}>${label}</option>`;
  const speedOpts = speedOpt('0.5', 'Slow (takes longer to level up)')
    + speedOpt('1', 'Normal (recommended)')
    + speedOpt('2', 'Fast (level up quickly)')
    // "Custom" only appears if this server already had hand-tuned values, so we
    // never silently overwrite them; new servers just see the three simple presets.
    + (sp === 'custom' ? speedOpt('custom', 'Custom (keep current settings)') : '');

  const rewardRows = c.roleRewards.map((r, i) => `
    <div class="lv-row" data-i="${i}">
      <span>Level</span>
      <input type="number" min="1" class="lv-rw-level" value="${r.level}" style="width:80px">
      <select class="lv-rw-role">${lvRoleOpts(r.roleId)}</select>
      <button class="btn btn-secondary lv-del" onclick="lvDel('roleRewards',${i})">${svg('x')}</button>
    </div>`).join('') || '<p class="lv-empty">No role rewards yet.</p>';

  const cboostRows = c.channelBoosts.map((b, i) => `
    <div class="lv-row" data-i="${i}">
      <select class="lv-cb-channel">${lvChannelOpts(b.id)}</select>
      <span>×</span>
      <input type="number" min="0" step="0.1" class="lv-cb-mult" value="${b.multiplier}" style="width:80px">
      <button class="btn btn-secondary lv-del" onclick="lvDel('channelBoosts',${i})">${svg('x')}</button>
    </div>`).join('') || '<p class="lv-empty">No channel boosts.</p>';

  const rboostRows = c.roleBoosts.map((b, i) => `
    <div class="lv-row" data-i="${i}">
      <select class="lv-rb-role">${lvRoleOpts(b.id)}</select>
      <span>×</span>
      <input type="number" min="0" step="0.1" class="lv-rb-mult" value="${b.multiplier}" style="width:80px">
      <button class="btn btn-secondary lv-del" onclick="lvDel('roleBoosts',${i})">${svg('x')}</button>
    </div>`).join('') || '<p class="lv-empty">No role boosts.</p>';

  document.getElementById('leveling-body').innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master"><input type="checkbox" id="lv-enabled" ${chk(c.enabled)}>
        <span><strong>Enable Leveling</strong>. When off, no XP is tracked or awarded.</span></label>
    </div>

    <div class="card">
      <h3>XP Sources</h3>
      <div class="card-grid">
        <div class="form-row"><label class="sec-switch"><input type="checkbox" id="lv-msg-enabled" ${chk(c.message.enabled)}><span>Message XP</span></label></div>
        <div></div>
        <div class="form-row"><label>Min XP / message</label><input type="number" id="lv-msg-min" min="0" value="${c.message.min}"></div>
        <div class="form-row"><label>Max XP / message</label><input type="number" id="lv-msg-max" min="0" value="${c.message.max}"></div>
        <div class="form-row"><label>Message cooldown (seconds)</label><input type="number" id="lv-msg-cd" min="0" value="${c.message.cooldown}"></div>
        <div></div>
        <div class="form-row"><label class="sec-switch"><input type="checkbox" id="lv-react-enabled" ${chk(c.reaction.enabled)}><span>Reaction XP</span></label></div>
        <div></div>
        <div class="form-row"><label>XP / reaction</label><input type="number" id="lv-react-xp" min="0" value="${c.reaction.xp}"></div>
        <div class="form-row"><label>Reaction cooldown (seconds)</label><input type="number" id="lv-react-cd" min="0" value="${c.reaction.cooldown}"></div>
      </div>
    </div>

    <div class="card">
      <h3>Voice XP</h3>
      <label class="sec-switch" style="margin-bottom:14px"><input type="checkbox" id="lv-voice-enabled" ${chk(c.voice.enabled)}><span>Enable voice XP</span></label>
      <div class="card-grid">
        <div class="form-row"><label>XP / minute</label><input type="number" id="lv-voice-xp" min="0" value="${c.voice.xpPerMinute}"></div>
        <div class="form-row"><label>Min users in channel</label><input type="number" id="lv-voice-min" min="1" value="${c.voice.minUsers}"></div>
      </div>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="lv-voice-afk" ${chk(c.voice.ignoreAfk)}><span>No XP in AFK channel</span></label>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="lv-voice-muted" ${chk(c.voice.ignoreMuted)}><span>No XP while muted</span></label>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="lv-voice-deaf" ${chk(c.voice.ignoreDeafened)}><span>No XP while deafened</span></label>
    </div>

    <div class="card">
      <h3>Leveling Speed &amp; Limits</h3>
      <div class="card-grid">
        <div class="form-row"><label>Leveling Speed</label><select id="lv-speed" onchange="lvApplySpeed()">${speedOpts}</select>
          <span class="hint">How quickly members earn levels. Pick one and you are done.</span></div>
        <div class="form-row"><label>Highest Level</label><input type="number" id="lv-maxlevel" min="0" value="${c.maxLevel}">
          <span class="hint">Members stop leveling past this. Leave at 0 for no limit.</span></div>
      </div>
    </div>

    <div class="card">
      <h3>Level-Up Announcements</h3>
      <div class="card-grid">
        <div class="form-row"><label>Where to announce</label><select id="lv-ann-mode">${annOpts}</select>
          <span class="hint">Send a message when someone levels up, and choose where it goes.</span></div>
        <div class="form-row"><label>Announcement Channel</label><select id="lv-ann-channel">${lvChannelOpts(c.announce.channelId)}</select>
          <span class="hint">Only used when "a specific channel" is chosen above.</span></div>
      </div>
      <div class="form-row"><label>Message</label><textarea id="lv-ann-msg">${esc(c.announce.message)}</textarea>
        <span class="hint">Placeholders: {user} {username} {level} {server}</span></div>
      <div class="form-row"><label class="sec-switch"><input type="checkbox" id="lv-ann-card" ${chk(c.announce.card)}><span>Attach the rank card image</span></label>
        <span class="hint">Posts the member's rank card alongside the level-up message (works for channel &amp; DM modes).</span></div>
    </div>

    <div class="card">
      <h3>Role Rewards</h3>
      <p class="hint" style="margin-bottom:12px">Grant roles at levels. Multiple rewards per level allowed.</p>
      <div id="lv-rewards">${rewardRows}</div>
      <div style="margin-top:10px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        ${gateCreateButton(premiumGate('levelingRewards', c.roleRewards.length), '+ Add Reward', "lvAdd('roleRewards')", 'levelingRewards', { className: 'btn-secondary' })}
        ${premiumGate('levelingRewards', c.roleRewards.length).hint}
      </div>
      <div style="margin-top:14px">
        <label class="sec-switch"><input type="checkbox" id="lv-stack" ${chk(c.stackRewards)}><span>Stack rewards (keep lower-level reward roles)</span></label>
        <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="lv-removereset" ${chk(c.removeRewardsOnReset)}><span>Remove reward roles when a member is reset</span></label>
      </div>
    </div>

    <div class="card">
      <h3>Boosts</h3>
      <div class="card-grid">
        <div>
          <label class="form-row" style="margin-bottom:8px">Channel Boosts</label>
          <div id="lv-cboosts">${cboostRows}</div>
          <button class="btn btn-secondary" style="margin-top:8px" onclick="lvAdd('channelBoosts')">+ Channel Boost</button>
        </div>
        <div>
          <label class="form-row" style="margin-bottom:8px">Role Boosts</label>
          <div id="lv-rboosts">${rboostRows}</div>
          <button class="btn btn-secondary" style="margin-top:8px" onclick="lvAdd('roleBoosts')">+ Role Boost</button>
        </div>
      </div>
    </div>

    <div class="card">
      <h3>No-XP Channels &amp; Roles</h3>
      <div class="card-grid">
        <div class="form-row"><label>No-XP Channels</label><div id="lv-noxp-channels"></div></div>
        <div class="form-row"><label>No-XP Roles</label><div id="lv-noxp-roles"></div></div>
      </div>
    </div>

    <div class="card">
      <h3>Leaderboards &amp; Rank Card</h3>
      <label class="sec-switch"><input type="checkbox" id="lv-lb-weekly" ${chk(c.leaderboard.weeklyEnabled)}><span>Weekly leaderboard</span></label>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="lv-lb-monthly" ${chk(c.leaderboard.monthlyEnabled)}><span>Monthly leaderboard</span></label>
      <div class="form-row" style="margin-top:14px"><label>Rank Card Accent</label>
        <div class="color-row"><input type="color" id="lv-accent" value="${c.rankCard.accent}"></div>
      </div>
    </div>`;

  msInit('lv-noxp-channels', channelItems(), c.noXpChannels);
  msInit('lv-noxp-roles', roleItems(), c.noXpRoles);
}

// Friendly labels for the announcement-mode select (raw values stay as-is for the backend).
const ANN_LABELS = {
  channel: 'A specific channel',
  current: 'The channel they were chatting in',
  dm:      'Direct message to the member',
  off:     'Do not announce'
};

// Speed preset maps to the standard mee6 curve plus an XP multiplier, written
// straight into state. "Custom" (only shown for servers with pre-existing tuned
// values) leaves the stored curve/multiplier untouched.
function lvApplySpeed() {
  const v = document.getElementById('lv-speed').value;
  if (v === 'custom') return;
  state.leveling.formula.curve = 'mee6';
  state.leveling.multiplier = Number(v);
  markDirty();
}

const lvDefaults = {
  roleRewards:   () => ({ level: 1, roleId: state.guildData?.roles?.[0]?.id || '' }),
  channelBoosts: () => ({ id: state.guildData?.textChannels?.[0]?.id || '', multiplier: 2 }),
  roleBoosts:    () => ({ id: state.guildData?.roles?.[0]?.id || '', multiplier: 2 })
};

function lvAdd(key) {
  collectLeveling();
  if (key === 'roleRewards') {
    const gate = premiumGate('levelingRewards', state.leveling.roleRewards.length);
    if (gate.atCap) { if (!gate.isPrem) premiumNudge('levelingRewards'); return; }
  }
  state.leveling[key].push(lvDefaults[key]()); renderLeveling();
}
function lvDel(key, i) { collectLeveling(); state.leveling[key].splice(i, 1); renderLeveling(); }

const numv = (id, d) => { const n = Number(document.getElementById(id).value); return Number.isFinite(n) ? n : d; };
const boolv = id => document.getElementById(id).checked;

function collectLeveling() {
  const c = state.leveling;
  c.enabled = boolv('lv-enabled');
  c.message = { enabled: boolv('lv-msg-enabled'), min: numv('lv-msg-min', 15), max: numv('lv-msg-max', 25), cooldown: numv('lv-msg-cd', 60) };
  c.reaction = { enabled: boolv('lv-react-enabled'), xp: numv('lv-react-xp', 5), cooldown: numv('lv-react-cd', 60) };
  c.voice = { enabled: boolv('lv-voice-enabled'), xpPerMinute: numv('lv-voice-xp', 10), minUsers: numv('lv-voice-min', 2),
              ignoreAfk: boolv('lv-voice-afk'), ignoreMuted: boolv('lv-voice-muted'), ignoreDeafened: boolv('lv-voice-deaf') };
  // c.formula and c.multiplier are driven by the Speed preset (see lvApplySpeed)
  // and kept as-is here, so removing the advanced inputs never wipes them.
  c.maxLevel = numv('lv-maxlevel', 0);
  c.announce = { mode: document.getElementById('lv-ann-mode').value, channelId: document.getElementById('lv-ann-channel').value || null,
                 message: document.getElementById('lv-ann-msg').value, card: boolv('lv-ann-card') };
  c.stackRewards = boolv('lv-stack');
  c.removeRewardsOnReset = boolv('lv-removereset');
  c.leaderboard = { weeklyEnabled: boolv('lv-lb-weekly'), monthlyEnabled: boolv('lv-lb-monthly') };
  c.rankCard = { accent: document.getElementById('lv-accent').value };
  c.noXpChannels = msValues('lv-noxp-channels');
  c.noXpRoles = msValues('lv-noxp-roles');

  c.roleRewards = [...document.querySelectorAll('#lv-rewards .lv-row')].map(row => ({
    level: Number(row.querySelector('.lv-rw-level').value) || 1,
    roleId: row.querySelector('.lv-rw-role').value
  })).filter(r => r.roleId);
  c.channelBoosts = [...document.querySelectorAll('#lv-cboosts .lv-row')].map(row => ({
    id: row.querySelector('.lv-cb-channel').value,
    multiplier: Number(row.querySelector('.lv-cb-mult').value) || 1
  })).filter(b => b.id);
  c.roleBoosts = [...document.querySelectorAll('#lv-rboosts .lv-row')].map(row => ({
    id: row.querySelector('.lv-rb-role').value,
    multiplier: Number(row.querySelector('.lv-rb-mult').value) || 1
  })).filter(b => b.id);
  return c;
}

async function saveLeveling() {
  if (!state.guildId) return;
  const msg = document.getElementById('leveling-save-msg');
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/leveling`, collectLeveling());
    state.leveling = res.config;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch {
    setStatus(msg, 'err', '❌ Failed to save.');
  }
}

// ── MODERATORS ────────────────────────────────────
async function loadModerators() {
  hide('mods-body');
  if (!state.guildId) { show('mods-no-guild'); return; }
  hide('mods-no-guild');

  const [config, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/moderators`),
    ensureGuildData()
  ]);

  msInit('mods-roles', roleItems(), config.roles || []);
  document.getElementById('mods-users').value = (config.users || []).join('\n');
  show('mods-body');
}

async function saveModerators() {
  if (!state.guildId) return;
  const msg = document.getElementById('mods-save-msg');
  const roles = msValues('mods-roles');
  const users = (document.getElementById('mods-users').value.match(/\d{16,20}/g)) || [];
  try {
    await api('PUT', `/api/guild/${state.guildId}/moderators`, { roles, users });
    setStatus(msg, 'ok', '✅ Saved!');
  } catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

// ── SETTINGS ──────────────────────────────────────
async function loadSettings() {
  hide('settings-body');
  if (!state.guildId) { show('settings-no-guild'); return; }
  hide('settings-no-guild');

  const data = await api('GET', `/api/guild/${state.guildId}/prefix`);
  const input = document.getElementById('set-prefix');
  input.value = data.prefix;
  input.placeholder = data.defaultPrefix;
  show('settings-body');
}

async function saveSettings() {
  if (!state.guildId) return;
  const msg = document.getElementById('settings-save-msg');
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/prefix`, { prefix: document.getElementById('set-prefix').value });
    document.getElementById('set-prefix').value = res.prefix;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch (e) {
    setStatus(msg, 'err', `❌ ${e.message || 'Failed to save.'}`);
  }
}

// ── ACTIVITY ──────────────────────────────────────
async function loadActivity() {
  hide('activity-body'); hide('activity-save-bar');
  if (!state.guildId) { show('activity-no-guild'); return; }
  hide('activity-no-guild');

  const [data, guild] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/activity`),
    ensureGuildData()
  ]);
  state.activity = data.config;
  renderActivity(guild);
  show('activity-body'); show('activity-save-bar');
}

function renderActivity() {
  const c = state.activity;

  document.getElementById('activity-body').innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master"><input type="checkbox" id="act-enabled" ${chk(c.enabled)}>
        <span><strong>Enable Activity Tracking</strong></span></label>
    </div>
    <div class="card">
      <h3>Score Weights</h3>
      <p class="hint" style="margin-bottom:14px">Set how much each action counts toward a member's activity score. Higher numbers are worth more.</p>
      <div class="card-grid">
        <div class="form-row"><label>Per Message</label><input type="number" id="act-w-msg" min="0" step="0.1" value="${c.weights.message}"></div>
        <div class="form-row"><label>Per Voice Minute</label><input type="number" id="act-w-voice" min="0" step="0.1" value="${c.weights.voicePerMinute}"></div>
        <div class="form-row"><label>Per Reaction</label><input type="number" id="act-w-react" min="0" step="0.1" value="${c.weights.reaction}"></div>
      </div>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="act-bots" ${chk(c.countBots)}><span>Count bot activity</span></label>
    </div>
    <div class="card">
      <h3>Ignored Channels &amp; Roles</h3>
      <div class="card-grid">
        <div class="form-row"><label>Ignored Channels</label><div id="act-ig-channels"></div></div>
        <div class="form-row"><label>Ignored Roles</label><div id="act-ig-roles"></div></div>
      </div>
    </div>
    <div class="card">
      <h3>Leaderboards</h3>
      <label class="sec-switch"><input type="checkbox" id="act-lb-weekly" ${chk(c.leaderboard.weeklyEnabled)}><span>Weekly activity leaderboard</span></label>
      <label class="sec-switch" style="margin-top:6px"><input type="checkbox" id="act-lb-monthly" ${chk(c.leaderboard.monthlyEnabled)}><span>Monthly activity leaderboard</span></label>
    </div>`;

  msInit('act-ig-channels', channelItems(), c.ignoredChannels);
  msInit('act-ig-roles', roleItems(), c.ignoredRoles);
}

async function saveActivity() {
  if (!state.guildId) return;
  const msg = document.getElementById('activity-save-msg');
  const payload = {
    enabled: boolv('act-enabled'),
    weights: { message: numv('act-w-msg', 1), voicePerMinute: numv('act-w-voice', 2), reaction: numv('act-w-react', 1) },
    countBots: boolv('act-bots'),
    ignoredChannels: msValues('act-ig-channels'),
    ignoredRoles: msValues('act-ig-roles'),
    leaderboard: { weeklyEnabled: boolv('act-lb-weekly'), monthlyEnabled: boolv('act-lb-monthly') }
  };
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/activity`, payload);
    state.activity = res.config;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

// ── TRUST SCORE ───────────────────────────────────
async function loadTrust() {
  hide('trust-body'); hide('trust-save-bar');
  if (!state.guildId) { show('trust-no-guild'); return; }
  hide('trust-no-guild');
  const { config } = await api('GET', `/api/guild/${state.guildId}/trust`);
  state.trust = config;
  renderTrust();
  show('trust-body'); show('trust-save-bar');
}

function renderTrust() {
  const c = state.trust;
  const tierRows = c.tiers.map((t, i) => `
    <div class="lv-row" data-i="${i}">
      <input type="text" class="tr-tier-name" placeholder="Tier name" value="${esc(t.name)}" style="flex:1;min-width:140px">
      <span>at score ≥</span>
      <input type="number" class="tr-tier-min" min="0" max="100" value="${t.min}" style="width:80px">
      <button class="btn btn-secondary lv-del" onclick="trustDelTier(${i})">${svg('x')}</button>
    </div>`).join('') || '<p class="lv-empty">No tiers.</p>';

  document.getElementById('trust-body').innerHTML = `
    <div class="card">
      <label class="sec-switch sec-master"><input type="checkbox" id="tr-enabled" ${chk(c.enabled)}>
        <span><strong>Enable Trust Score</strong></span></label>
    </div>
    <div class="card">
      <h3>Signal Weights</h3>
      <p class="hint" style="margin-bottom:14px">Relative importance of each positive signal (0 disables it).</p>
      <div class="card-grid">
        <div class="form-row"><label>Account Age</label><input type="number" id="tr-w-age" min="0" step="0.5" value="${c.weights.accountAge}"></div>
        <div class="form-row"><label>Server Tenure</label><input type="number" id="tr-w-tenure" min="0" step="0.5" value="${c.weights.tenure}"></div>
        <div class="form-row"><label>Activity</label><input type="number" id="tr-w-activity" min="0" step="0.5" value="${c.weights.activity}"></div>
        <div class="form-row"><label>Level</label><input type="number" id="tr-w-level" min="0" step="0.5" value="${c.weights.level}"></div>
        <div class="form-row"><label>Verified</label><input type="number" id="tr-w-verified" min="0" step="0.5" value="${c.weights.verified}"></div>
      </div>
    </div>
    <div class="card">
      <h3>Caps &amp; Penalties</h3>
      <div class="card-grid">
        <div class="form-row"><label>Activity score for full marks</label><input type="number" id="tr-cap-activity" min="1" value="${c.caps.activity}"></div>
        <div class="form-row"><label>Level for full marks</label><input type="number" id="tr-cap-level" min="1" value="${c.caps.level}"></div>
        <div class="form-row"><label>Points lost per warning</label><input type="number" id="tr-warnpen" min="0" max="100" value="${c.warningPenalty}"></div>
      </div>
    </div>
    <div class="card">
      <h3>Tiers</h3>
      <p class="hint" style="margin-bottom:12px">Named bands shown on the trust card, by minimum score.</p>
      <div id="tr-tiers">${tierRows}</div>
      <button class="btn btn-secondary" style="margin-top:10px" onclick="trustAddTier()">+ Add Tier</button>
    </div>`;
}

function collectTrust() {
  const c = state.trust;
  c.enabled = boolv('tr-enabled');
  c.weights = {
    accountAge: numv('tr-w-age', 1), tenure: numv('tr-w-tenure', 1), activity: numv('tr-w-activity', 2),
    level: numv('tr-w-level', 1), verified: numv('tr-w-verified', 1)
  };
  c.caps = { activity: numv('tr-cap-activity', 5000), level: numv('tr-cap-level', 30) };
  c.warningPenalty = numv('tr-warnpen', 10);
  c.tiers = [...document.querySelectorAll('#tr-tiers .lv-row')].map(r => ({
    name: r.querySelector('.tr-tier-name').value.trim(),
    min:  Number(r.querySelector('.tr-tier-min').value) || 0
  })).filter(t => t.name);
  return c;
}

function trustAddTier() { collectTrust(); state.trust.tiers.push({ name: 'New Tier', min: 0 }); renderTrust(); }
function trustDelTier(i) { collectTrust(); state.trust.tiers.splice(i, 1); renderTrust(); }

async function saveTrust() {
  if (!state.guildId) return;
  const msg = document.getElementById('trust-save-msg');
  try {
    const res = await api('PUT', `/api/guild/${state.guildId}/trust`, collectTrust());
    state.trust = res.config;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

// ── AUTOROLES ─────────────────────────────────────
async function loadAutorole() {
  hide('autorole-body'); hide('autorole-save-bar');
  if (!state.guildId) { show('autorole-no-guild'); return; }
  hide('autorole-no-guild');

  const [{ config }] = await Promise.all([
    api('GET', `/api/guild/${state.guildId}/autorole`),
    ensureGuildData()
  ]);
  state.autorole = config;
  document.getElementById('ar-enabled').checked = !!config.enabled;
  msInit('ar-roles', roleItems(), config.roleIds);
  msInit('ar-bot-roles', roleItems(), config.botRoleIds);
  const used = (config.roleIds?.length || 0) + (config.botRoleIds?.length || 0);
  const gate = premiumGate('autoroleRoles', used);
  document.getElementById('ar-limit-hint').innerHTML =
    `Roles given on join (people + bots combined): <strong>${used}</strong> &nbsp; ${gate.hint}`;
  show('autorole-body'); show('autorole-save-bar');
}

async function saveAutorole() {
  if (!state.guildId) return;
  const msg = document.getElementById('autorole-save-msg');
  const payload = {
    enabled:    boolv('ar-enabled'),
    roleIds:    msValues('ar-roles'),
    botRoleIds: msValues('ar-bot-roles')
  };
  try {
    const r = await api('PUT', `/api/guild/${state.guildId}/autorole`, payload);
    state.autorole = r.config;
    setStatus(msg, 'ok', '✅ Saved!');
  } catch { setStatus(msg, 'err', '❌ Failed to save.'); }
}

// ── REACTION ROLES ────────────────────────────────
async function loadReactionRoles() {
  hide('rr-body');
  if (!state.guildId) { show('rr-no-guild'); return; }
  hide('rr-no-guild');
  await ensureGuildData();
  const data = await api('GET', `/api/guild/${state.guildId}/reactionroles`);
  state.reactionMenus = data.menus;
  state.reactionModes = data.modes;
  renderReactionRoles();
  show('rr-body');
}

function rrModeOpts(sel) {
  return state.reactionModes.map(m =>
    `<option value="${m.value}"${m.value === sel ? ' selected' : ''}>${esc(m.label)}</option>`).join('');
}

function rrMapRow(menuId, m) {
  return `
    <div class="rr-map-row lv-row">
      <input class="rr-emoji" placeholder="👍 or :custom:" value="${esc(m?.emoji || '')}" style="width:140px">
      <span>→</span>
      <select class="rr-role">${lvRoleOpts(m?.roleId || '')}</select>
      <button class="btn btn-secondary lv-del" onclick="rrDelMap(this)">${svg('x')}</button>
    </div>`;
}
function rrDelMap(btn) { btn.closest('.rr-map-row')?.remove(); markDirty(); }
function rrMapHint() { return premiumGate('reactionMappings', 0).hint; }
function rrAddMap(containerId) {
  const gate = premiumGate('reactionMappings', document.querySelectorAll(`#${containerId} .rr-map-row`).length);
  if (gate.atCap) {
    if (gate.isPrem) alert(`Maximum of ${gate.cap} roles per panel reached.`);
    else premiumNudge('reactionMappings');
    return;
  }
  document.getElementById(containerId).insertAdjacentHTML('beforeend', rrMapRow(containerId.replace(/^rr-|-maps$/g, '')));
}
function rrCollectMaps(containerId) {
  return [...document.querySelectorAll(`#${containerId} .rr-map-row`)].map(r => ({
    emoji:  r.querySelector('.rr-emoji').value.trim(),
    roleId: r.querySelector('.rr-role').value
  })).filter(m => m.emoji && m.roleId);
}

function rrMenuCard(menu) {
  const link = menu.messageId
    ? `<a href="https://discord.com/channels/${state.guildId}/${menu.channelId}/${menu.messageId}" target="_blank">Jump to message</a>`
    : 'Not posted yet';
  const managedFields = menu.managed ? `
    <div class="form-row"><label>Title</label><input type="text" id="rr-${menu.id}-title" value="${esc(menu.title || '')}"></div>
    <div class="form-row"><label>Description</label><textarea id="rr-${menu.id}-desc">${esc(menu.description || '')}</textarea></div>` : '';
  const colorField = menu.managed
    ? `<div class="form-row"><label>Color</label><div class="color-row"><input type="color" id="rr-${menu.id}-color" value="${menu.color}"></div></div>` : '<div></div>';
  const rows = menu.mappings.map(m => rrMapRow(menu.id, m)).join('') || rrMapRow(menu.id);

  return `
    <div class="card">
      <h3>Panel <code>${esc(menu.id)}</code> ${menu.managed ? '' : '<span class="hint">· existing message</span>'}</h3>
      <p class="hint" style="margin-bottom:12px">#${esc(channelName(menu.channelId))} · ${link}</p>
      <div class="card-grid">
        <div class="form-row"><label>Mode</label><select id="rr-${menu.id}-mode">${rrModeOpts(menu.mode)}</select></div>
        ${colorField}
      </div>
      ${managedFields}
      <div class="form-row"><label>Emoji → Role pairs</label>
        <div id="rr-${menu.id}-maps">${rows}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="rrAddMap('rr-${menu.id}-maps')">+ Add pair</button>${rrMapHint()}
        </div>
        <span class="hint" style="display:block;margin-top:6px">Use a normal emoji or a custom one from this server (type <code>:name:</code> and pick it, then copy it here).</span>
      </div>
      <div class="btn-row" style="margin-top:14px;align-items:center">
        <button class="btn btn-primary" onclick="rrSave('${menu.id}')">Save Panel</button>
        <button class="btn btn-secondary" onclick="rrDelete('${menu.id}')">Delete</button>
        <span id="rr-${menu.id}-msg" class="save-status"></span>
      </div>
    </div>`;
}

function renderReactionRoles() {
  const existing = state.reactionMenus.map(rrMenuCard).join('');
  const panelGate = premiumGate('reactionPanels', state.reactionMenus.length);
  const createBtn = gateCreateButton(panelGate, 'Create Panel', 'rrCreate()', 'reactionPanels');
  const limitNote = panelGate.atCap && panelGate.isPrem
    ? `<span class="hint">Limit reached: this server is using all ${panelGate.cap} reaction-role panels.</span>`
    : '';
  document.getElementById('rr-body').innerHTML = `
    <div class="card">
      <h3>Create a Panel &nbsp; ${panelGate.hint} ${limitNote}</h3>
      <div class="card-grid">
        <div class="form-row"><label>Channel</label><select id="rr-new-channel">${lvChannelOpts('')}</select></div>
        <div class="form-row"><label>Mode</label><select id="rr-new-mode">${rrModeOpts('normal')}</select></div>
        <div class="form-row"><label>Source</label>
          <select id="rr-new-source" onchange="rrToggleSource()">
            <option value="bot">Bot posts a new message</option>
            <option value="existing">Use an existing message</option>
          </select></div>
      </div>
      <div id="rr-new-bot-fields">
        <div class="card-grid">
          <label class="sec-switch"><input type="checkbox" id="rr-new-embed" checked><span>Post as an embed</span></label>
          <div class="form-row"><label>Color</label><div class="color-row"><input type="color" id="rr-new-color" value="#5865F2"></div></div>
        </div>
        <div class="form-row"><label>Title</label><input type="text" id="rr-new-title" placeholder="Reaction Roles"></div>
        <div class="form-row"><label>Description</label><textarea id="rr-new-desc" placeholder="React below to get your roles!"></textarea></div>
      </div>
      <div id="rr-new-existing-fields" class="hidden">
        <div class="form-row"><label>Existing Message ID</label>
          <input type="text" id="rr-new-msgid" placeholder="123456789012345678">
          <span class="hint">Enable Developer Mode in Discord, right-click the message → Copy Message ID. The message must be in the channel above.</span>
        </div>
      </div>
      <div class="form-row"><label>Emoji → Role pairs</label>
        <div id="rr-new-maps">${rrMapRow('new')}</div>
        <div style="margin-top:8px;display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <button class="btn btn-secondary" onclick="rrAddMap('rr-new-maps')">+ Add pair</button>${rrMapHint()}
        </div>
      </div>
      <div class="btn-row" style="margin-top:14px;align-items:center">
        ${createBtn}
        <span id="rr-new-msg" class="save-status"></span>
      </div>
    </div>
    ${existing}`;
  rrToggleSource();
}

function rrToggleSource() {
  const src = document.getElementById('rr-new-source').value;
  document.getElementById('rr-new-bot-fields').classList.toggle('hidden', src !== 'bot');
  document.getElementById('rr-new-existing-fields').classList.toggle('hidden', src !== 'existing');
}

async function rrCreate() {
  const msg = document.getElementById('rr-new-msg');
  const source = document.getElementById('rr-new-source').value;
  const payload = {
    channelId: document.getElementById('rr-new-channel').value,
    mode:      document.getElementById('rr-new-mode').value,
    managed:   source === 'bot',
    mappings:  rrCollectMaps('rr-new-maps')
  };
  if (!payload.channelId) return setStatus(msg, 'err', '❌ Pick a channel.');
  if (source === 'bot') {
    payload.embed = boolv('rr-new-embed');
    payload.title = document.getElementById('rr-new-title').value.trim() || null;
    payload.description = document.getElementById('rr-new-desc').value.trim() || null;
    payload.color = document.getElementById('rr-new-color').value;
  } else {
    payload.messageId = document.getElementById('rr-new-msgid').value.trim();
    if (!payload.messageId) return setStatus(msg, 'err', '❌ Enter the message ID.');
  }
  try {
    await api('POST', `/api/guild/${state.guildId}/reactionroles`, payload);
    await loadReactionRoles();
  } catch (e) { setStatus(document.getElementById('rr-new-msg'), 'err', '❌ ' + e.message); }
}

async function rrSave(id) {
  const menu = state.reactionMenus.find(m => m.id === id);
  if (!menu) return;
  const msg = document.getElementById(`rr-${id}-msg`);
  const payload = {
    mode:     document.getElementById(`rr-${id}-mode`).value,
    mappings: rrCollectMaps(`rr-${id}-maps`)
  };
  if (menu.managed) {
    payload.embed = menu.embed;
    payload.title = document.getElementById(`rr-${id}-title`).value.trim() || null;
    payload.description = document.getElementById(`rr-${id}-desc`).value.trim() || null;
    payload.color = document.getElementById(`rr-${id}-color`).value;
  }
  try {
    await api('PUT', `/api/guild/${state.guildId}/reactionroles/${id}`, payload);
    setStatus(msg, 'ok', '✅ Saved!');
    await loadReactionRoles();
  } catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

async function rrDelete(id) {
  if (!confirm('Delete this reaction-role panel? If the bot posted the message, it will be deleted too.')) return;
  try { await api('DELETE', `/api/guild/${state.guildId}/reactionroles/${id}`); await loadReactionRoles(); }
  catch (e) { alert('Failed to delete: ' + e.message); }
}

// ── AUTO RESPONSES ────────────────────────────────
const ARSP_MATCH_LABELS = { exact: 'Exact match', contains: 'Contains', starts: 'Starts with', ends: 'Ends with' };

async function loadAutoResponses() {
  hide('arsp-body');
  if (!state.guildId) { show('arsp-no-guild'); return; }
  hide('arsp-no-guild');
  await ensureGuildData();
  const data = await api('GET', `/api/guild/${state.guildId}/autoresponses`);
  state.arspRules = data.rules || [];
  state.arspMeta  = data.meta || { matchModes: [], responseTypes: ['text', 'embed'] };
  state.arspEditing = null;
  renderAutoResponses();
  show('arsp-body');
}

function arspBlankRule() {
  return {
    id: null, enabled: true, name: '', trigger: '', match: 'contains', caseSensitive: false,
    responseType: 'text', text: '', reply: true, deleteTrigger: false, cooldownSec: 0,
    channelIds: [], ignoreRoleIds: [],
    embed: { author: { name: '', iconUrl: '', url: '' }, title: '', url: '', description: '',
      color: '#5865F2', fields: [], image: { url: '' }, thumbnail: { url: '' },
      footer: { text: '', iconUrl: '' }, timestamp: false }
  };
}

function renderAutoResponses() {
  if (state.arspEditing) return renderArspEditor();
  const gate = premiumGate('autoResponses', state.arspRules.length);
  const newBtn = gateCreateButton(gate, 'New Response', 'arspNew()', 'autoResponses', { icon: svg('plus') });

  const rows = state.arspRules.length
    ? state.arspRules.map(arspRuleCard).join('')
    : '<p class="hint" style="padding:16px">No auto responses yet. Create one to reply automatically when a message matches a trigger.</p>';

  document.getElementById('arsp-body').innerHTML = `
    <div class="card" style="display:flex;align-items:center;gap:12px;flex-wrap:wrap">
      <div style="flex:1;min-width:200px"><strong>${state.arspRules.length}</strong> auto response${state.arspRules.length === 1 ? '' : 's'} configured. ${gate.hint}</div>
      ${newBtn}
    </div>
    <div class="arsp-list">${rows}</div>`;
}

function arspRuleCard(r) {
  const typeTag = r.responseType === 'embed' ? 'Embed' : 'Text';
  const summary = r.responseType === 'embed'
    ? (r.embed.title || r.embed.description || 'Rich embed').slice(0, 80)
    : (r.text || '').slice(0, 80);
  return `<div class="card arsp-rule">
    <div class="arsp-rule-head">
      <div class="arsp-rule-meta">
        <label class="sec-switch" title="Enable or disable this response">
          <input type="checkbox" ${chk(r.enabled)} onchange="arspToggle('${r.id}', this.checked)"><span></span>
        </label>
        <div>
          <div class="arsp-rule-title">${esc(r.name || r.trigger || 'Untitled')}</div>
          <div class="hint">${ARSP_MATCH_LABELS[r.match] || r.match}${r.caseSensitive ? ', case sensitive' : ''} · ${typeTag}</div>
        </div>
      </div>
      <div class="btn-row">
        <button class="btn btn-secondary" onclick="arspEdit('${r.id}')">Edit</button>
        <button class="btn btn-secondary" onclick="arspDelete('${r.id}')">Delete</button>
      </div>
    </div>
    <div class="arsp-rule-body">
      <div><span class="hint">Trigger</span><div class="arsp-trigger">${esc(r.trigger || '(none)')}</div></div>
      <div><span class="hint">Responds with</span><div>${esc(summary) || '<span class="hint">(empty)</span>'}</div></div>
    </div>
  </div>`;
}

function arspNew() {
  const gate = premiumGate('autoResponses', state.arspRules.length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('autoResponses'); return; }
  state.arspEditing = arspBlankRule();
  renderAutoResponses();
}

function arspEdit(id) {
  const r = state.arspRules.find(x => x.id === id);
  if (!r) return;
  // Deep copy so edits are discardable until saved.
  state.arspEditing = JSON.parse(JSON.stringify({ ...arspBlankRule(), ...r, embed: { ...arspBlankRule().embed, ...(r.embed || {}) } }));
  renderAutoResponses();
}

function arspCancel() { state.arspEditing = null; renderAutoResponses(); }

function renderArspEditor() {
  const r = state.arspEditing;
  const isEmbed = r.responseType === 'embed';
  const matchOpts = (state.arspMeta.matchModes || []).map(m =>
    `<option value="${m.value}" ${r.match === m.value ? 'selected' : ''}>${esc(m.label)}</option>`).join('');

  document.getElementById('arsp-body').innerHTML = `
    <div class="arsp-editor">
      <div class="arsp-editor-main">
        <div class="card">
          <h3>${r.id ? 'Edit Auto Response' : 'New Auto Response'}</h3>
          <div class="card-grid">
            <div class="form-row"><label>Name (optional)</label>
              <input type="text" id="arsp-name" maxlength="80" value="${esc(r.name)}" placeholder="Internal label" oninput="arspCollect()"></div>
            <div class="form-row"><label>Match type</label>
              <select id="arsp-match" onchange="arspCollect()">${matchOpts}</select></div>
          </div>
          <div class="form-row"><label>Trigger phrase</label>
            <input type="text" id="arsp-trigger" maxlength="200" value="${esc(r.trigger)}" placeholder="e.g. how do I open a ticket" oninput="arspCollect()"></div>
          <label class="sec-switch"><input type="checkbox" id="arsp-case" ${chk(r.caseSensitive)} onchange="arspCollect()"><span>Case sensitive</span></label>
        </div>

        <div class="card">
          <div class="arsp-type-tabs">
            <button class="arsp-tab ${isEmbed ? '' : 'active'}" onclick="arspSetType('text')">Plain text</button>
            <button class="arsp-tab ${isEmbed ? 'active' : ''}" onclick="arspSetType('embed')">Rich embed</button>
          </div>
          ${isEmbed ? arspEmbedEditorHtml(r) : arspTextEditorHtml(r)}
        </div>

        <div class="card">
          <h3>Behaviour</h3>
          <div class="card-grid">
            <label class="sec-switch"><input type="checkbox" id="arsp-reply" ${chk(r.reply)} onchange="arspCollect()"><span>Reply to the triggering message</span></label>
            <label class="sec-switch"><input type="checkbox" id="arsp-delete" ${chk(r.deleteTrigger)} onchange="arspCollect()"><span>Delete the triggering message</span></label>
          </div>
          <div class="card-grid">
            <div class="form-row"><label>Cooldown (seconds)</label>
              <input type="number" id="arsp-cooldown" min="0" max="3600" value="${r.cooldownSec || 0}" oninput="arspCollect()">
              <span class="hint">Minimum time between responses for this rule. 0 means no cooldown.</span></div>
          </div>
          <div class="card-grid">
            <div class="form-row"><label>Only in these channels (optional)</label><div id="arsp-channels"></div></div>
            <div class="form-row"><label>Ignore these roles (optional)</label><div id="arsp-ignoreroles"></div></div>
          </div>
        </div>

        <div class="btn-row" style="margin-top:14px;align-items:center">
          <button class="btn btn-primary" onclick="arspSave()">${r.id ? 'Save Changes' : 'Create Response'}</button>
          <button class="btn btn-secondary" onclick="arspCancel()">Cancel</button>
          <span id="arsp-save-msg" class="save-status"></span>
        </div>
      </div>

      <div class="arsp-editor-side">
        <div class="card">
          <h3>Live preview</h3>
          <div id="arsp-preview" class="arsp-preview"></div>
          <span class="hint">Placeholders: {user} {username} {server} {channel} {memberCount}</span>
        </div>
      </div>
    </div>`;

  msInit('arsp-channels', channelItems(), r.channelIds || []);
  msInit('arsp-ignoreroles', roleItems(), r.ignoreRoleIds || []);
  arspRefreshPreview();
}

function arspTextEditorHtml(r) {
  return `<div class="form-row"><label>Response text</label>
    <textarea id="arsp-text" rows="4" maxlength="2000" placeholder="What the bot should say" oninput="arspCollect()">${esc(r.text)}</textarea></div>`;
}

function arspEmbedEditorHtml(r) {
  const e = r.embed;
  const fieldRows = (e.fields || []).map((f, i) => `
    <div class="arsp-field-row" data-i="${i}">
      <input type="text" class="arsp-f-name" maxlength="256" placeholder="Field name" value="${esc(f.name)}" oninput="arspCollect()">
      <input type="text" class="arsp-f-value" maxlength="1024" placeholder="Field value" value="${esc(f.value)}" oninput="arspCollect()">
      <label class="arsp-f-inline"><input type="checkbox" class="arsp-f-inlinecb" ${chk(f.inline)} onchange="arspCollect()"> Inline</label>
      <button class="btn btn-secondary" onclick="arspRemoveField(${i})">${svg('x')}</button>
    </div>`).join('') || '<p class="hint">No fields yet.</p>';

  return `
    <div class="card-grid">
      <div class="form-row"><label>Author name</label><input type="text" id="arsp-e-author" maxlength="256" value="${esc(e.author.name)}" oninput="arspCollect()"></div>
      <div class="form-row"><label>Author icon URL</label><input type="text" id="arsp-e-authoricon" value="${esc(e.author.iconUrl)}" placeholder="https://" oninput="arspCollect()"></div>
    </div>
    <div class="form-row"><label>Title</label><input type="text" id="arsp-e-title" maxlength="256" value="${esc(e.title)}" oninput="arspCollect()"></div>
    <div class="form-row"><label>Title link URL (optional)</label><input type="text" id="arsp-e-url" value="${esc(e.url)}" placeholder="https://" oninput="arspCollect()"></div>
    <div class="form-row"><label>Description</label><textarea id="arsp-e-desc" rows="4" maxlength="4000" oninput="arspCollect()">${esc(e.description)}</textarea></div>
    <div class="card-grid">
      <div class="form-row"><label>Color</label>
        <div class="color-row"><input type="color" id="arsp-e-color" value="${/^#[0-9a-fA-F]{6}$/.test(e.color) ? e.color : '#5865F2'}" oninput="arspCollect()"></div></div>
      <div class="form-row"><label>Thumbnail URL</label><input type="text" id="arsp-e-thumb" value="${esc(e.thumbnail.url)}" placeholder="https://" oninput="arspCollect()"></div>
    </div>
    <div class="form-row"><label>Image URL</label><input type="text" id="arsp-e-image" value="${esc(e.image.url)}" placeholder="https://" oninput="arspCollect()"></div>
    <div class="form-row"><label>Fields</label><div id="arsp-fields">${fieldRows}</div>
      <div style="margin-top:8px"><button class="btn btn-secondary" onclick="arspAddField()">+ Add field</button></div></div>
    <div class="card-grid">
      <div class="form-row"><label>Footer text</label><input type="text" id="arsp-e-footer" maxlength="2048" value="${esc(e.footer.text)}" oninput="arspCollect()"></div>
      <div class="form-row"><label>Footer icon URL</label><input type="text" id="arsp-e-footericon" value="${esc(e.footer.iconUrl)}" placeholder="https://" oninput="arspCollect()"></div>
    </div>
    <label class="sec-switch"><input type="checkbox" id="arsp-e-timestamp" ${chk(e.timestamp)} onchange="arspCollect()"><span>Show current timestamp</span></label>`;
}

// Reads editor DOM into state.arspEditing without re-rendering inputs (keeps focus).
function arspCollect() {
  const r = state.arspEditing;
  if (!r) return;
  const v = id => document.getElementById(id)?.value ?? '';
  const c = id => document.getElementById(id)?.checked ?? false;
  r.name = v('arsp-name'); r.match = v('arsp-match'); r.trigger = v('arsp-trigger');
  r.caseSensitive = c('arsp-case');
  r.reply = c('arsp-reply'); r.deleteTrigger = c('arsp-delete');
  r.cooldownSec = parseInt(v('arsp-cooldown'), 10) || 0;
  r.channelIds = msValues('arsp-channels');
  r.ignoreRoleIds = msValues('arsp-ignoreroles');

  if (r.responseType === 'text') {
    r.text = v('arsp-text');
  } else {
    const e = r.embed;
    e.author.name = v('arsp-e-author'); e.author.iconUrl = v('arsp-e-authoricon');
    e.title = v('arsp-e-title'); e.url = v('arsp-e-url'); e.description = v('arsp-e-desc');
    e.color = v('arsp-e-color') || '#5865F2';
    e.thumbnail.url = v('arsp-e-thumb'); e.image.url = v('arsp-e-image');
    e.footer.text = v('arsp-e-footer'); e.footer.iconUrl = v('arsp-e-footericon');
    e.timestamp = c('arsp-e-timestamp');
    e.fields = [...document.querySelectorAll('#arsp-fields .arsp-field-row')].map(row => ({
      name:  row.querySelector('.arsp-f-name').value,
      value: row.querySelector('.arsp-f-value').value,
      inline: row.querySelector('.arsp-f-inlinecb').checked
    }));
  }
  arspRefreshPreview();
}

function arspSetType(type) {
  arspCollect();
  state.arspEditing.responseType = type;
  renderAutoResponses();
}

function arspAddField() {
  arspCollect();
  if (state.arspEditing.embed.fields.length >= 25) return;
  state.arspEditing.embed.fields.push({ name: '', value: '', inline: false });
  renderAutoResponses();
}

function arspRemoveField(i) {
  arspCollect();
  state.arspEditing.embed.fields.splice(i, 1);
  renderAutoResponses();
}

function arspRefreshPreview() {
  const node = document.getElementById('arsp-preview');
  if (node) node.innerHTML = arspPreviewHtml(state.arspEditing);
}

// Renders a Discord-like preview of the response. Placeholders are shown verbatim.
function arspPreviewHtml(r) {
  if (r.responseType === 'text') {
    const t = (r.text || '').trim();
    return t ? `<div class="arsp-preview-text">${esc(t).replace(/\n/g, '<br>')}</div>`
             : '<span class="hint">Nothing to preview yet.</span>';
  }
  const e = r.embed;
  const has = e.title || e.description || e.author.name || e.footer.text || e.image.url || e.thumbnail.url || (e.fields || []).some(f => f.name || f.value);
  if (!has) return '<span class="hint">Nothing to preview yet.</span>';
  const color = /^#[0-9a-fA-F]{6}$/.test(e.color) ? e.color : '#5865F2';
  const fieldsHtml = (e.fields || []).filter(f => f.name || f.value).map(f =>
    `<div class="arsp-pv-field${f.inline ? ' inline' : ''}"><div class="arsp-pv-fname">${esc(f.name) || '​'}</div><div class="arsp-pv-fval">${esc(f.value).replace(/\n/g, '<br>') || '​'}</div></div>`).join('');
  const titleHtml = e.url
    ? `<a class="arsp-pv-title arsp-pv-link" href="${esc(e.url)}" target="_blank" rel="noopener">${esc(e.title)}</a>`
    : (e.title ? `<div class="arsp-pv-title">${esc(e.title)}</div>` : '');
  return `<div class="arsp-pv-embed" style="border-left-color:${color}">
    ${e.author.name ? `<div class="arsp-pv-author">${e.author.iconUrl ? `<img src="${esc(e.author.iconUrl)}" alt="">` : ''}<span>${esc(e.author.name)}</span></div>` : ''}
    <div class="arsp-pv-main">
      <div class="arsp-pv-content">
        ${titleHtml}
        ${e.description ? `<div class="arsp-pv-desc">${esc(e.description).replace(/\n/g, '<br>')}</div>` : ''}
        ${fieldsHtml ? `<div class="arsp-pv-fields">${fieldsHtml}</div>` : ''}
        ${e.image.url ? `<img class="arsp-pv-image" src="${esc(e.image.url)}" alt="">` : ''}
        ${e.footer.text || e.timestamp ? `<div class="arsp-pv-footer">${e.footer.iconUrl ? `<img src="${esc(e.footer.iconUrl)}" alt="">` : ''}<span>${esc(e.footer.text)}${e.footer.text && e.timestamp ? ' • ' : ''}${e.timestamp ? new Date().toLocaleString() : ''}</span></div>` : ''}
      </div>
      ${e.thumbnail.url ? `<img class="arsp-pv-thumb" src="${esc(e.thumbnail.url)}" alt="">` : ''}
    </div>
  </div>`;
}

async function arspSave() {
  arspCollect();
  const r = state.arspEditing;
  const msg = document.getElementById('arsp-save-msg');
  if (!r.trigger.trim()) return setStatus(msg, 'err', 'A trigger phrase is required.');
  if (r.responseType === 'text' && !r.text.trim()) return setStatus(msg, 'err', 'Add the text this response should send.');
  try {
    if (r.id) await api('PUT', `/api/guild/${state.guildId}/autoresponses/${r.id}`, r);
    else      await api('POST', `/api/guild/${state.guildId}/autoresponses`, r);
    await loadAutoResponses();
  } catch (e) { setStatus(msg, 'err', e.message); }
}

async function arspToggle(id, enabled) {
  try {
    await api('PUT', `/api/guild/${state.guildId}/autoresponses/${id}`, { enabled });
    const r = state.arspRules.find(x => x.id === id); if (r) r.enabled = enabled;
  } catch { renderAutoResponses(); }
}

async function arspDelete(id) {
  if (!confirm('Delete this auto response?')) return;
  try { await api('DELETE', `/api/guild/${state.guildId}/autoresponses/${id}`); await loadAutoResponses(); }
  catch (e) { alert('Failed to delete: ' + e.message); }
}

// ── BOT LOGS ──────────────────────────────────────
async function loadBotLogs() {
  const file   = document.getElementById('log-file-select').value;
  const viewer = document.getElementById('log-viewer');
  viewer.textContent = 'Loading…';
  try {
    const { lines } = await api('GET', `/api/logs/${file}`);
    if (!lines.length) { viewer.textContent = 'No entries found.'; return; }
    viewer.innerHTML = lines.map(colorLine).join('\n');
  } catch {
    viewer.textContent = 'Failed to load logs.';
  }
}

function colorLine(line) {
  const s = line.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  if (/error|exception|fail/i.test(s))       return `<span class="l-error">${s}</span>`;
  if (/warn/i.test(s))                        return `<span class="l-warn">${s}</span>`;
  if (/info|start|ready|logged in/i.test(s)) return `<span class="l-info">${s}</span>`;
  return s;
}

// ── LIVE CHAT (Socket.IO) ─────────────────────────
let chatSocket = null;
let chatTypingTimer = null;
let typingClearTimer = null;

function ensureSocket() {
  if (chatSocket) return chatSocket;
  chatSocket = io({ path: '/socket.io' });

  chatSocket.on('history', msgs => {
    const box = document.getElementById('chat-messages');
    box.innerHTML = msgs.map(chatMsgHtml).join('');
    box.scrollTop = box.scrollHeight;
  });
  chatSocket.on('message', m => appendChatMessage(m));
  chatSocket.on('typing', ({ name }) => showTyping(name));
  chatSocket.on('chat_error', msg => {
    document.getElementById('chat-messages').innerHTML =
      `<div class="chat-sys">${esc(msg)}</div>`;
  });
  return chatSocket;
}

function openChat(channelId, channelName) {
  ensureSocket();
  document.getElementById('chat-title').textContent = `#${channelName}`;
  document.getElementById('chat-messages').innerHTML = '<div class="chat-sys">Loading…</div>';
  document.getElementById('chat-typing').textContent = '';
  show('chat-overlay');
  chatSocket.emit('join', { guildId: state.guildId, channelId });
  document.getElementById('chat-input').focus();
}

function closeChat() {
  if (chatSocket) chatSocket.emit('leave');
  hide('chat-overlay');
}

function sendChat() {
  const input = document.getElementById('chat-input');
  const content = input.value.trim();
  if (!content || !chatSocket) return;
  chatSocket.emit('staff_message', { content });
  input.value = '';
}

function chatTyping() {
  if (!chatSocket) return;
  if (chatTypingTimer) return;
  chatSocket.emit('typing');
  chatTypingTimer = setTimeout(() => { chatTypingTimer = null; }, 1500);
}

function showTyping(name) {
  const el = document.getElementById('chat-typing');
  el.textContent = `${name} is typing…`;
  clearTimeout(typingClearTimer);
  typingClearTimer = setTimeout(() => el.textContent = '', 3000);
}

function appendChatMessage(m) {
  const box = document.getElementById('chat-messages');
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.insertAdjacentHTML('beforeend', chatMsgHtml(m));
  if (atBottom) box.scrollTop = box.scrollHeight;
}

function chatMsgHtml(m) {
  const time = new Date(m.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const atts = (m.attachments || []).map(a => {
    const img = a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/i.test(a.name || '');
    return img
      ? `<a href="${esc(a.url)}" target="_blank"><img class="chat-img" src="${esc(a.url)}" alt=""></a>`
      : `<a href="${esc(a.url)}" target="_blank" class="msg-file">${svg('paperclip')} ${esc(a.name || 'file')}</a>`;
  }).join('');
  return `<div class="chat-msg${m.bot ? ' chat-bot' : ''}">
    <div class="chat-msg-head"><span class="chat-author">${esc(m.authorTag)}</span>
    ${m.bot ? '<span class="bot-tag">APP</span>' : ''}<span class="chat-ts">${time}</span></div>
    ${m.content ? `<div class="chat-text">${esc(m.content)}</div>` : ''}${atts}
  </div>`;
}

// ── Helpers ───────────────────────────────────────
async function api(method, url, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res  = await fetch(url, opts);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

function show(id) { document.getElementById(id).classList.remove('hidden'); }
function hide(id) { document.getElementById(id).classList.add('hidden'); }
function esc(s)   { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }

function setStatus(el, type, msg) {
  // Strip any leading emoji/symbols from the message; we render a clean SVG instead.
  const clean = String(msg).replace(/^[\s️←-⇿⌀-➿⬀-⯿\u{1F000}-\u{1FAFF}]+/u, '').trim();
  const ico = type === 'ok' ? svg('check') : type === 'err' ? svg('x') : '';
  el.className = `save-status ${type}`;
  el.innerHTML = `${ico} ${esc(clean)}`;
  if (type === 'ok') { const bar = el.closest('.save-bar'); if (bar) bar.classList.remove('dirty'); }
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}

function timeAgo(ts) {
  const d = Date.now() - ts;
  if (d < 60000)   return `${Math.floor(d/1000)}s ago`;
  if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
  return `${Math.floor(d/3600000)}h ago`;
}

// ═══════════════════════════════════════
//  TRANSCRIPTS
// ═══════════════════════════════════════
async function loadTranscripts() {
  const listWrap = document.getElementById('tx-list');
  const noGuild  = document.getElementById('tx-no-guild');

  // Reset to list view whenever we (re)load
  show('tx-list-view');
  hide('tx-viewer');

  if (!state.guildId) { show('tx-no-guild'); hide('tx-list'); return; }
  hide('tx-no-guild');

  const list = await api('GET', `/api/guild/${state.guildId}/transcripts`);
  const tbody = document.getElementById('tx-rows');

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px">No transcripts saved yet. Close a ticket to generate one.</td></tr>`;
  } else {
    const badgeCls = p => ({ Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' }[p] || '');
    tbody.innerHTML = list.map(t => `
      <tr>
        <td><span class="log-key">#${esc(t.number || '?')}</span></td>
        <td style="font-size:13px">${esc(t.channelName || '')}</td>
        <td>${esc(t.type || '')}</td>
        <td><span class="badge ${badgeCls(t.priority)}">${esc(t.priority || '')}</span></td>
        <td style="font-size:13px">${esc(t.closedBy?.tag || 'Unknown')}</td>
        <td style="font-size:12px;color:var(--muted)">${t.closedAt ? new Date(t.closedAt).toLocaleString() : '…'}</td>
        <td style="color:var(--muted)">${t.messageCount}</td>
        <td><button class="btn btn-secondary" style="padding:5px 12px;font-size:12px" onclick="viewTranscript('${esc(t.filename)}')">View</button></td>
      </tr>`).join('');
  }

  show('tx-list');
}

async function viewTranscript(filename) {
  let data;
  try { data = await api('GET', `/api/transcript/${encodeURIComponent(filename)}`); }
  catch { return alert('Failed to load transcript.'); }

  // Switch to viewer
  hide('tx-list-view');
  show('tx-viewer');

  // Header metadata
  const badgeCls = p => ({ Low: 'badge-low', Medium: 'badge-medium', High: 'badge-high' }[p] || '');
  document.getElementById('tx-meta').innerHTML =
    `<strong>#${esc(data.number || '?')} · ${esc(data.channelName)}</strong>
     <span class="muted"> &nbsp;|&nbsp; Type: ${esc(data.type)}
     &nbsp;|&nbsp; <span class="badge ${badgeCls(data.priority)}" style="font-size:11px">${esc(data.priority)}</span>
     &nbsp;|&nbsp; Closed by ${esc(data.closedBy?.tag || '?')}
     &nbsp;|&nbsp; ${data.messages?.length || 0} messages
     ${data.closedAt ? `&nbsp;|&nbsp; ${new Date(data.closedAt).toLocaleString()}` : ''}</span>`;

  // Render messages
  const container = document.getElementById('tx-messages');
  if (!data.messages?.length) {
    container.innerHTML = '<p style="text-align:center;color:var(--muted);padding:40px">No messages recorded.</p>';
    return;
  }

  let html = '';
  let lastDate = null;

  for (const m of data.messages) {
    const msgDate = new Date(m.timestamp).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    if (msgDate !== lastDate) {
      html += `<div class="msg-date-sep"><span>${msgDate}</span></div>`;
      lastDate = msgDate;
    }
    html += renderMessage(m);
  }

  container.innerHTML = html;
  container.scrollTop = 0;
}

function closeTranscript() {
  hide('tx-viewer');
  show('tx-list-view');
}

function renderMessage(m) {
  const time = new Date(m.timestamp).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

  // authorTag is an attacker-controlled Discord username. Strip any character
  // that could break out of the HTML attribute / inline JS string, then escape.
  const initial = ((m.authorTag || '?').charAt(0).toUpperCase().replace(/['"<>&\\]/g, '') || '?');
  const avatar = m.authorAvatar
    ? `<img src="${esc(m.authorAvatar)}" class="msg-avatar" alt="" onerror="this.outerHTML='<div class=\\'msg-avatar-fallback\\'>${esc(initial)}</div>'">`
    : `<div class="msg-avatar-fallback">${esc(initial)}</div>`;

  const content = m.content
    ? `<div class="msg-text">${renderMarkdown(m.content)}</div>`
    : '';

  const attachments = (m.attachments || []).map(a => {
    const isImg = a.contentType?.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(a.name || '');
    if (isImg) {
      const src = esc(a.proxyUrl || a.url);
      return `<div class="msg-img-wrap">
        <a href="${esc(a.url)}" target="_blank" rel="noopener">
          <img src="${src}" class="msg-img" alt="${esc(a.name || 'image')}"
               onerror="this.closest('.msg-img-wrap').innerHTML='<span class=\\'img-expired\\'>Image (link expired)</span>'">
        </a>
      </div>`;
    }
    return `<a href="${esc(a.url)}" target="_blank" rel="noopener" class="msg-file">${svg('paperclip')} ${esc(a.name || 'file')}</a>`;
  }).join('');

  const embeds = (m.embeds || []).filter(e => e.title || e.description || e.fields?.length).map(e => {
    const borderColor = e.color ? `#${e.color.toString(16).padStart(6, '0')}` : '#5865F2';
    const fields = (e.fields || []).map(f =>
      `<div class="embed-field"><strong>${esc(f.name)}</strong><br>${esc(f.value)}</div>`
    ).join('');
    const img = e.image   ? `<img src="${esc(e.image)}"     class="embed-img" alt="">` : '';
    const thu = e.thumbnail ? `<img src="${esc(e.thumbnail)}" class="embed-img" style="max-width:80px;float:right;margin-left:8px" alt="">` : '';
    return `<div class="msg-embed" style="border-left-color:${borderColor}">
      ${thu}
      ${e.title       ? `<div class="embed-title">${esc(e.title)}</div>` : ''}
      ${e.description ? `<div class="embed-desc">${esc(e.description)}</div>` : ''}
      ${fields}${img}
      <div style="clear:both"></div>
    </div>`;
  }).join('');

  return `<div class="msg-row${m.authorBot ? ' msg-bot' : ''}">
    <div class="msg-avatar-wrap">${avatar}</div>
    <div class="msg-body">
      <div class="msg-meta">
        <span class="msg-author">${esc(m.authorTag)}</span>
        ${m.authorBot ? '<span class="bot-tag">APP</span>' : ''}
        <span class="msg-ts">${time}</span>
      </div>
      ${content}${attachments}${embeds}
    </div>
  </div>`;
}

function renderMarkdown(text) {
  return esc(text)
    .replace(/```([\s\S]*?)```/g, '<pre>$1</pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/~~(.*?)~~/g, '<s>$1</s>')
    .replace(/\n/g, '<br>');
}

// ═══════════════════════════════════════
//  APPLICATIONS
// ═══════════════════════════════════════
const APP_STATUS_FALLBACK = { label: 'Unknown', emoji: '•', color: 0x99aab5 };
const QTYPE_LABEL = { short: 'Short Text', paragraph: 'Paragraph', multiple_choice: 'Multiple Choice', dropdown: 'Dropdown' };
function appStatusMeta(s) { return (state.appsMeta?.statusMeta || {})[s] || APP_STATUS_FALLBACK; }
function hex6(n) { return '#' + (Number(n) || 0).toString(16).padStart(6, '0'); }

async function loadApplications() {
  hide('apps-body');
  if (!state.guildId) { show('apps-no-guild'); return; }
  hide('apps-no-guild');
  try {
    const data = await api('GET', `/api/guild/${state.guildId}/applications/forms`);
    state.appsForms  = data.forms || [];
    state.appsConfig = data.config;
    state.appsMeta   = data.meta;
  } catch { state.appsForms = []; }
  state.appsEditing = null;
  show('apps-body');
  appsTab(state.appsTabCur || 'forms');
}

function appsTab(name) {
  state.appsTabCur = name;
  document.querySelectorAll('.apps-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === name));
  ['forms', 'submissions', 'settings'].forEach(t =>
    document.getElementById(`apps-tab-${t}`).classList.toggle('hidden', t !== name));
  if (name === 'forms') renderFormsTab();
  if (name === 'submissions') { renderSubmissionsShell(); loadSubmissions(); }
  if (name === 'settings') renderAppsSettings();
}

// ── Forms tab (list + builder) ────────────────────
function renderFormsTab() {
  const box = document.getElementById('apps-tab-forms');
  if (state.appsEditing) return renderFormBuilder(box);

  const rows = state.appsForms.length ? state.appsForms.map((f, i) => `
    <div class="apps-form-row" draggable="true" data-i="${i}"
         ondragstart="appsFormDragStart(event,${i})" ondragover="event.preventDefault()" ondrop="appsFormDrop(event,${i})">
      <span class="apps-drag" title="Drag to reorder">⋮⋮</span>
      <div class="apps-form-info">
        <div class="apps-form-name">${esc(f.name)} ${f.enabled ? '<span class="badge badge-low">Enabled</span>' : '<span class="badge">Disabled</span>'}</div>
        <div class="hint">${f.questions.length} question${f.questions.length === 1 ? '' : 's'}${f.description ? ` · ${esc(f.description)}` : ''}</div>
      </div>
      <div class="apps-form-actions">
        <label class="cmd-switch" title="${f.enabled ? 'Enabled' : 'Disabled'}">
          <input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="appsToggleForm('${esc(f.id)}',this.checked)"><span class="cmd-slider"></span>
        </label>
        <button class="btn btn-secondary" onclick="appsEditForm('${esc(f.id)}')">Edit</button>
        <button class="btn btn-secondary" onclick="appsDuplicateForm('${esc(f.id)}')">Duplicate</button>
        <button class="btn btn-secondary" onclick="appsDeleteForm('${esc(f.id)}')">Delete</button>
      </div>
    </div>`).join('') : '<p class="hint" style="padding:16px">No forms yet. Create your first application form.</p>';

  const gate = premiumGate('applicationForms', state.appsForms.length);
  const newBtn = gateCreateButton(gate, 'New Form', 'appsNewForm()', 'applicationForms', { icon: svg('plus') });
  box.innerHTML = `
    <div class="btn-row" style="margin-bottom:14px;align-items:center">${newBtn} ${gate.hint}</div>
    <div class="apps-form-list">${rows}</div>`;
}

let appsFormDragIdx = null;
function appsFormDragStart(e, i) { appsFormDragIdx = i; e.dataTransfer.effectAllowed = 'move'; }
function appsFormDrop(e, i) {
  e.preventDefault();
  if (appsFormDragIdx === null || appsFormDragIdx === i) return;
  const arr = state.appsForms;
  const [m] = arr.splice(appsFormDragIdx, 1);
  arr.splice(i, 0, m);
  appsFormDragIdx = null;
  renderFormsTab();
  api('PUT', `/api/guild/${state.guildId}/applications/forms-order`, { order: arr.map(f => f.id) }).catch(() => {});
}

function appsNewForm() {
  const gate = premiumGate('applicationForms', state.appsForms.length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('applicationForms'); return; }
  state.appsEditing = { id: null, name: '', description: '', enabled: true, questions: [] }; renderFormsTab();
}
function appsEditForm(id) { const f = state.appsForms.find(x => x.id === id); if (f) { state.appsEditing = JSON.parse(JSON.stringify(f)); renderFormsTab(); } }
function appsCancelEdit() { state.appsEditing = null; renderFormsTab(); }

async function appsToggleForm(id, enabled) {
  try { await api('PUT', `/api/guild/${state.guildId}/applications/forms/${id}`, { enabled }); const f = state.appsForms.find(x => x.id === id); if (f) f.enabled = enabled; }
  catch {} renderFormsTab();
}
async function appsDuplicateForm(id) {
  const gate = premiumGate('applicationForms', state.appsForms.length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('applicationForms'); return; }
  try { const r = await api('POST', `/api/guild/${state.guildId}/applications/forms/${id}/duplicate`); state.appsForms.push(r.form); } catch {}
  renderFormsTab();
}
async function appsDeleteForm(id) {
  if (!confirm('Delete this form? Existing submissions are kept.')) return;
  try { await api('DELETE', `/api/guild/${state.guildId}/applications/forms/${id}`); state.appsForms = state.appsForms.filter(x => x.id !== id); } catch {}
  renderFormsTab();
}

function renderFormBuilder(box) {
  const f = state.appsEditing;
  const qhtml = f.questions.map((q, i) => renderQuestionEditor(q, i)).join('') || '<p class="hint">No questions yet. Add one below.</p>';
  box.innerHTML = `
    <div class="card">
      <div class="btn-row" style="justify-content:space-between;align-items:center;margin-bottom:10px">
        <h3 style="margin:0">${f.id ? 'Edit Form' : 'New Form'}</h3>
        <button class="btn btn-secondary" onclick="appsCancelEdit()">← Back to list</button>
      </div>
      <div class="card-grid">
        <div class="form-row"><label>Form Name</label>
          <input type="text" maxlength="100" value="${esc(f.name)}" oninput="state.appsEditing.name=this.value"></div>
        <div class="form-row"><label>Enabled</label>
          <label class="cmd-switch"><input type="checkbox" ${f.enabled ? 'checked' : ''} onchange="state.appsEditing.enabled=this.checked"><span class="cmd-slider"></span></label></div>
      </div>
      <div class="form-row"><label>Description (optional)</label>
        <input type="text" maxlength="500" value="${esc(f.description || '')}" oninput="state.appsEditing.description=this.value"></div>
    </div>
    <div class="card">
      <h3>Questions <span class="hint">· drag ⋮⋮ to reorder</span></h3>
      <div id="apps-q-list">${qhtml}</div>
      ${(() => {
        const g = premiumGate('applicationQuestions', f.questions.length);
        const buttons = (g.atCap && !g.isPrem)
          ? premiumLockedBtn('Add Question', 'applicationQuestions')
          : `<button class="btn btn-secondary" onclick="appsAddQuestion('short')">+ Short Text</button>
             <button class="btn btn-secondary" onclick="appsAddQuestion('paragraph')">+ Paragraph</button>
             <button class="btn btn-secondary" onclick="appsAddQuestion('multiple_choice')">+ Multiple Choice</button>
             <button class="btn btn-secondary" onclick="appsAddQuestion('dropdown')">+ Dropdown</button>`;
        return `<div class="btn-row" style="margin-top:12px;flex-wrap:wrap;align-items:center">${buttons} ${g.hint}</div>`;
      })()}
    </div>
    <div class="save-bar dirty">
      <button class="btn btn-primary" onclick="appsSaveForm()">Save Form</button>
      <button class="btn btn-secondary" onclick="appsPreviewForm()">${svg('eye')} Preview</button>
      <button class="btn btn-secondary" onclick="appsCancelEdit()">Cancel</button>
      <span id="apps-form-msg" class="save-status"></span>
    </div>`;
}

function renderQuestionEditor(q, i) {
  const isChoice = q.type === 'multiple_choice' || q.type === 'dropdown';
  return `<div class="apps-q" draggable="true" data-i="${i}"
      ondragstart="appsQDragStart(event,${i})" ondragover="event.preventDefault()" ondrop="appsQDrop(event,${i})">
    <div class="apps-q-head">
      <span class="apps-drag" title="Drag to reorder">⋮⋮</span>
      <span class="apps-q-type">${QTYPE_LABEL[q.type] || q.type}</span>
      <label class="apps-q-req"><input type="checkbox" ${q.required ? 'checked' : ''} onchange="appsQEdit(${i},'required',this.checked)"> Required</label>
      <button class="btn btn-secondary apps-q-del" onclick="appsRemoveQuestion(${i})">${svg('x')}</button>
    </div>
    <input type="text" placeholder="Question / prompt" maxlength="200" value="${esc(q.label)}" oninput="appsQEdit(${i},'label',this.value)">
    <input type="text" placeholder="Placeholder (optional)" maxlength="100" value="${esc(q.placeholder || '')}" oninput="appsQEdit(${i},'placeholder',this.value)">
    ${isChoice ? `<textarea placeholder="One option per line" rows="3" oninput="appsQEditOptions(${i},this.value)">${esc((q.options || []).join('\n'))}</textarea>` : ''}
  </div>`;
}

function appsQEdit(i, field, val) { if (state.appsEditing?.questions[i]) state.appsEditing.questions[i][field] = val; }
function appsQEditOptions(i, val) { if (state.appsEditing?.questions[i]) state.appsEditing.questions[i].options = val.split('\n').map(s => s.trim()).filter(Boolean); }
function appsAddQuestion(type) {
  const gate = premiumGate('applicationQuestions', state.appsEditing.questions.length);
  if (gate.atCap) { if (!gate.isPrem) premiumNudge('applicationQuestions'); return; }
  const isChoice = type === 'multiple_choice' || type === 'dropdown';
  state.appsEditing.questions.push({ type, label: '', placeholder: '', required: true, options: isChoice ? [''] : [] });
  renderFormsTab();
}
function appsRemoveQuestion(i) { state.appsEditing.questions.splice(i, 1); renderFormsTab(); }
let appsQDragIdx = null;
function appsQDragStart(e, i) { appsQDragIdx = i; e.dataTransfer.effectAllowed = 'move'; }
function appsQDrop(e, i) {
  e.preventDefault();
  if (appsQDragIdx === null || appsQDragIdx === i) return;
  const a = state.appsEditing.questions;
  const [m] = a.splice(appsQDragIdx, 1);
  a.splice(i, 0, m);
  appsQDragIdx = null;
  renderFormsTab();
}

async function appsSaveForm() {
  const f = state.appsEditing, msg = document.getElementById('apps-form-msg');
  if (!f.name.trim()) return setStatus(msg, 'err', '❌ The form needs a name.');
  for (const q of f.questions) {
    if (!String(q.label || '').trim()) return setStatus(msg, 'err', '❌ Every question needs a prompt.');
    if ((q.type === 'multiple_choice' || q.type === 'dropdown') && !(q.options || []).filter(Boolean).length)
      return setStatus(msg, 'err', '❌ Choice questions need at least one option.');
  }
  const payload = { name: f.name, description: f.description, enabled: f.enabled, questions: f.questions };
  try {
    if (f.id) await api('PUT', `/api/guild/${state.guildId}/applications/forms/${f.id}`, payload);
    else      await api('POST', `/api/guild/${state.guildId}/applications/forms`, payload);
    const data = await api('GET', `/api/guild/${state.guildId}/applications/forms`);
    state.appsForms = data.forms; state.appsConfig = data.config; state.appsMeta = data.meta;
    state.appsEditing = null;
    renderFormsTab();
  } catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

function appsPreviewForm() {
  const f = state.appsEditing;
  const qs = f.questions.map((q, i) => {
    const req = q.required ? '<span style="color:var(--red)">*</span>' : '';
    let field = '';
    if (q.type === 'short') field = `<input type="text" disabled placeholder="${esc(q.placeholder || '')}">`;
    else if (q.type === 'paragraph') field = `<textarea disabled rows="3" placeholder="${esc(q.placeholder || '')}"></textarea>`;
    else if (q.type === 'multiple_choice') field = (q.options || []).map(o => `<label class="apps-prev-opt"><input type="radio" disabled> ${esc(o)}</label>`).join('');
    else if (q.type === 'dropdown') field = `<select disabled><option>Choose…</option>${(q.options || []).map(o => `<option>${esc(o)}</option>`).join('')}</select>`;
    return `<div class="form-row"><label>${i + 1}. ${esc(q.label || '(no prompt)')} ${req}</label>${field}</div>`;
  }).join('') || '<p class="hint">No questions yet.</p>';
  openAppsModal(`<h3>${esc(f.name || 'Untitled Form')}</h3>${f.description ? `<p class="hint">${esc(f.description)}</p>` : ''}<div style="margin-top:12px">${qs}</div>`);
}

function openAppsModal(html) { document.getElementById('apps-modal-content').innerHTML = html; show('apps-modal'); }
function closeAppsModal() { hide('apps-modal'); }

// ── Submissions tab ───────────────────────────────
// Shell (filters) renders once per tab entry so the search box keeps focus;
// only the chips + results refresh on filter changes.
function renderSubmissionsShell() {
  const box = document.getElementById('apps-tab-submissions');
  const formOpts = `<option value="">All forms</option>` +
    state.appsForms.map(f => `<option value="${esc(f.id)}" ${state.appsFilter.formId === f.id ? 'selected' : ''}>${esc(f.name)}</option>`).join('');
  const exp = fmt => `/api/guild/${state.guildId}/applications/export?format=${fmt}` +
    (state.appsFilter.status ? `&status=${state.appsFilter.status}` : '') +
    (state.appsFilter.formId ? `&formId=${state.appsFilter.formId}` : '');
  box.innerHTML = `
    <div class="apps-filters">
      <div class="cmd-chips" id="apps-sub-chips"></div>
      <div class="btn-row" style="margin-top:10px;flex-wrap:wrap">
        <select onchange="appsSetForm(this.value)" style="max-width:220px">${formOpts}</select>
        <input type="text" placeholder="Search applicant / answers…" value="${esc(state.appsFilter.search)}" oninput="appsSearchDebounced(this.value)" style="flex:1;min-width:180px">
        <a class="btn btn-secondary" href="${exp('csv')}" target="_blank">${svg('download')} CSV</a>
        <a class="btn btn-secondary" href="${exp('json')}" target="_blank">${svg('download')} JSON</a>
      </div>
    </div>
    <div class="log-table-wrap" style="margin-top:14px"><table class="log-table">
      <thead><tr><th>Form</th><th>Applicant</th><th>Status</th><th>Submitted</th></tr></thead>
      <tbody id="apps-sub-rows"></tbody></table></div>`;
}

async function loadSubmissions() {
  const qp = new URLSearchParams();
  if (state.appsFilter.status) qp.set('status', state.appsFilter.status);
  if (state.appsFilter.formId) qp.set('formId', state.appsFilter.formId);
  if (state.appsFilter.search) qp.set('search', state.appsFilter.search);
  try {
    const data = await api('GET', `/api/guild/${state.guildId}/applications?${qp}`);
    state.appsSubs = data.applications; state.appsCounts = data.counts || {};
  } catch { state.appsSubs = []; }
  renderSubChips();
  renderSubRows();
}

function renderSubChips() {
  const el = document.getElementById('apps-sub-chips');
  if (!el) return;
  const counts = state.appsCounts || {};
  const statuses = state.appsMeta?.statuses || [];
  const chip = (val, label, count) =>
    `<button class="cmd-chip${state.appsFilter.status === val ? ' active' : ''}" onclick="appsSetStatus('${val}')">${label}${count != null ? ` (${count})` : ''}</button>`;
  el.innerHTML = chip('', 'All', counts.total || 0) +
    statuses.map(s => chip(s, `${appStatusMeta(s).emoji} ${appStatusMeta(s).label}`, counts[s] || 0)).join('');
}

function renderSubRows() {
  const el = document.getElementById('apps-sub-rows');
  if (!el) return;
  el.innerHTML = state.appsSubs.length ? state.appsSubs.map(a => {
    const m = appStatusMeta(a.status);
    return `<tr style="cursor:pointer" onclick="appsOpen('${esc(a.id)}')">
      <td>${esc(a.formName)}</td>
      <td>${esc(a.userTag)}</td>
      <td><span class="badge" style="background:${hex6(m.color)}26;color:${hex6(m.color)}">${m.emoji} ${m.label}</span></td>
      <td class="hint">${new Date(a.createdAt).toLocaleString()}</td>
    </tr>`;
  }).join('') : `<tr><td colspan="4" class="hint" style="text-align:center;padding:24px">No applications match.</td></tr>`;
}

function appsSetStatus(s) { state.appsFilter.status = s; loadSubmissions(); }
function appsSetForm(id) { state.appsFilter.formId = id; loadSubmissions(); }
let appsSearchTimer = null;
function appsSearchDebounced(v) { state.appsFilter.search = v; clearTimeout(appsSearchTimer); appsSearchTimer = setTimeout(loadSubmissions, 350); }

async function appsOpen(id) {
  let appData;
  try { appData = await api('GET', `/api/guild/${state.guildId}/applications/${id}`); } catch { return; }
  const m = appStatusMeta(appData.status);
  const answers = (appData.answers || []).map(a =>
    `<div class="form-row"><label>${esc(a.label)}</label><div class="apps-answer">${esc(a.value || '—')}</div></div>`).join('') || '<p class="hint">No answers.</p>';
  const history = (appData.actions || []).map(ac =>
    `<div class="apps-action-log"><strong>${esc(ac.reviewerTag || 'System')}</strong> · ${esc(ac.action)}${ac.note ? ` — ${esc(ac.note)}` : ''} <span class="hint">${new Date(ac.createdAt).toLocaleString()}</span></div>`).join('') || '<p class="hint">No actions yet.</p>';
  openAppsModal(`
    <h3>${m.emoji} ${esc(appData.formName)}</h3>
    <p class="hint">Applicant: ${esc(appData.userTag)} (${esc(appData.userId)}) · ${new Date(appData.createdAt).toLocaleString()}</p>
    <p>Status: <strong style="color:${hex6(m.color)}">${m.label}</strong></p>
    <div style="margin:12px 0">${answers}</div>
    <div class="btn-row" style="flex-wrap:wrap">
      <button class="btn btn-primary" onclick="appsAction('${esc(appData.id)}','accept')">${svg('check')} Accept</button>
      <button class="btn btn-secondary" onclick="appsAction('${esc(appData.id)}','hold')">${svg('pause')} Hold</button>
      <button class="btn btn-secondary" onclick="appsAction('${esc(appData.id)}','deny',true)">${svg('x')} Deny</button>
      <button class="btn btn-secondary" onclick="appsAction('${esc(appData.id)}','info',true)">${svg('envelope')} Request Info</button>
      <button class="btn btn-secondary" onclick="appsAction('${esc(appData.id)}','note',true)">${svg('clipboard')} Add Note</button>
    </div>
    <h4 style="margin-top:16px">History</h4>${history}`);
}

async function appsAction(id, action, needNote) {
  let note = null;
  if (needNote) {
    const prompts = { note: 'Internal note (not sent to the applicant):', deny: 'Reason for denial (sent to the applicant):', info: 'What information is needed? (sent to the applicant):' };
    note = prompt(prompts[action] || 'Message:');
    if (note === null) return;
    if ((action === 'deny' || action === 'info') && !note.trim()) return alert('A message is required for this action.');
  }
  try { await api('POST', `/api/guild/${state.guildId}/applications/${id}/action`, { action, note }); }
  catch (e) { return alert('Failed: ' + e.message); }
  closeAppsModal();
  loadSubmissions();
}

// ── Settings tab ──────────────────────────────────
async function renderAppsSettings() {
  await ensureGuildData();
  const c  = state.appsConfig || {};
  const sm = state.appsMeta?.statusMeta || {};
  const roleStatuses = state.appsMeta?.roleStatuses || ['accepted', 'denied', 'hold', 'info_requested'];
  const styles       = state.appsMeta?.buttonStyles || ['Primary', 'Success', 'Danger', 'Secondary'];
  const panel = c.panel || {};
  const pColor = Number.isFinite(panel.color) ? panel.color : 0x5865f2;
  const colorHex = '#' + pColor.toString(16).padStart(6, '0');

  const roleRows = roleStatuses.map(st => `
    <div class="form-row">
      <label>${esc((sm[st]?.emoji || '') + ' ' + (sm[st]?.label || st))}</label>
      <select id="apps-role-${st}"></select>
    </div>`).join('');

  const styleOpts = styles.map(s =>
    `<option value="${s}"${(panel.buttonStyle || 'Primary') === s ? ' selected' : ''}>${s}</option>`).join('');

  const box = document.getElementById('apps-tab-settings');
  box.innerHTML = `
    <div class="card">
      <h3>Channels</h3>
      <div class="card-grid">
        <div class="form-row"><label>Pending / Review Channel</label><select id="apps-review-ch"></select>
          <span class="hint">New submissions land here with the review buttons.</span></div>
        <div class="form-row"><label>Accepted Channel</label><select id="apps-accepted-ch"></select>
          <span class="hint">Accepting an application moves it straight here. Leave as <em>None</em> to keep it in the review channel.</span></div>
        <div class="form-row"><label>Denied Channel</label><select id="apps-denied-ch"></select>
          <span class="hint">Denying an application moves it straight here.</span></div>
        <div class="form-row"><label>Log Channel</label><select id="apps-log-ch"></select>
          <span class="hint">Holds, info-requests and notes are logged here.</span></div>
      </div>
    </div>

    <div class="card">
      <h3>Auto-assign Roles by Status</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:12px">When a decision is made, the applicant gets the matching role (and loses the other status roles). Leave any as <em>None</em> to assign nothing. I need <strong>Manage Roles</strong> and my role must sit above these.</p>
      <div class="card-grid">${roleRows}</div>
    </div>

    <div class="card">
      <h3>Permissions &amp; Roles</h3>
      <div class="card-grid">
        <div class="form-row"><label>Reviewer Roles</label><div id="apps-reviewer-roles"></div>
          <span class="hint">May review via the Discord buttons. Admins &amp; Manage-Server always can.</span></div>
        <div class="form-row"><label>Form Manager Roles</label><div id="apps-manager-roles"></div>
          <span class="hint">May manage forms via Discord. Admins always can.</span></div>
        <div class="form-row"><label>Notify Roles</label><div id="apps-notify-roles"></div>
          <span class="hint">Pinged in the review channel on each new submission.</span></div>
      </div>
    </div>

    <div class="card">
      <h3>Application Panel</h3>
      <p style="color:var(--muted);font-size:13px;margin-bottom:12px">Customise the embed &amp; button people click to apply, then post it to a channel.</p>
      <div class="card-grid">
        <div class="form-row"><label>Embed Title</label><input id="apps-panel-title" maxlength="256" value="${esc(panel.title || '')}"></div>
        <div class="form-row"><label>Embed Colour</label><input type="color" id="apps-panel-color" value="${colorHex}"></div>
      </div>
      <div class="form-row"><label>Embed Description</label>
        <textarea id="apps-panel-desc" rows="3" maxlength="2000">${esc(panel.description || '')}</textarea></div>
      <div class="card-grid">
        <div class="form-row"><label>Button Label</label><input id="apps-panel-btnlabel" maxlength="80" value="${esc(panel.buttonLabel || '')}"></div>
        <div class="form-row"><label>Button Emoji</label><input id="apps-panel-btnemoji" maxlength="64" value="${esc(panel.buttonEmoji || '')}" placeholder="📝 or a custom emoji"></div>
        <div class="form-row"><label>Button Style</label><select id="apps-panel-btnstyle">${styleOpts}</select></div>
      </div>
      <span class="hint">With multiple enabled forms the panel shows a dropdown instead of a single button (label/style apply to single-form panels).</span>
      <div class="card-grid" style="margin-top:14px">
        <div class="form-row"><label>Post Panel To</label><select id="apps-panel-ch"></select></div>
        <div class="form-row" style="align-self:end">
          <button class="btn btn-secondary" onclick="appsPostPanel()">${svg('inbox')} Post / Update Panel</button></div>
      </div>
    </div>

    <div class="card">
      <h3>Behaviour</h3>
      <div class="card-grid">
        <div class="form-row"><label>DM applicants on status changes</label>
          <label class="cmd-switch"><input type="checkbox" id="apps-dm" ${c.dmNotifications !== false ? 'checked' : ''}><span class="cmd-slider"></span></label></div>
        <div class="form-row"><label>Re-apply cooldown (minutes, 0 = unlimited)</label>
          <input type="number" id="apps-cooldown" min="0" value="${c.cooldownMinutes || 0}"></div>
      </div>
    </div>

    <div class="save-bar"><button class="btn btn-primary" onclick="appsSaveSettings()">Save Settings</button>
      <span id="apps-settings-msg" class="save-status"></span></div>`;

  fillSelect('apps-review-ch',   state.guildData.textChannels, c.reviewChannelId,   n => `#${n.name}`);
  fillSelect('apps-accepted-ch', state.guildData.textChannels, c.acceptedChannelId, n => `#${n.name}`);
  fillSelect('apps-denied-ch',   state.guildData.textChannels, c.deniedChannelId,   n => `#${n.name}`);
  fillSelect('apps-log-ch',      state.guildData.textChannels, c.logChannelId,      n => `#${n.name}`);
  fillSelect('apps-panel-ch',    state.guildData.textChannels, c.panelChannelId,    n => `#${n.name}`);

  const sr = c.statusRoleIds || {};
  roleStatuses.forEach(st => fillSelect(`apps-role-${st}`, roleItems(), sr[st] || '', r => r.label));

  msInit('apps-reviewer-roles', roleItems(), c.reviewerRoleIds || []);
  msInit('apps-manager-roles',  roleItems(), c.managerRoleIds  || []);
  msInit('apps-notify-roles',   roleItems(), c.notifyRoleIds   || []);
}

function appsSettingsPayload() {
  const roleStatuses = state.appsMeta?.roleStatuses || ['accepted', 'denied', 'hold', 'info_requested'];
  const statusRoleIds = {};
  roleStatuses.forEach(st => { statusRoleIds[st] = document.getElementById(`apps-role-${st}`).value || null; });
  return {
    reviewChannelId:   document.getElementById('apps-review-ch').value || null,
    acceptedChannelId: document.getElementById('apps-accepted-ch').value || null,
    deniedChannelId:   document.getElementById('apps-denied-ch').value || null,
    logChannelId:      document.getElementById('apps-log-ch').value || null,
    panelChannelId:    document.getElementById('apps-panel-ch').value || null,
    statusRoleIds,
    reviewerRoleIds: msValues('apps-reviewer-roles'),
    managerRoleIds:  msValues('apps-manager-roles'),
    notifyRoleIds:   msValues('apps-notify-roles'),
    dmNotifications: document.getElementById('apps-dm').checked,
    cooldownMinutes: parseInt(document.getElementById('apps-cooldown').value, 10) || 0,
    panel: {
      title:       document.getElementById('apps-panel-title').value,
      description: document.getElementById('apps-panel-desc').value,
      color:       document.getElementById('apps-panel-color').value,
      buttonLabel: document.getElementById('apps-panel-btnlabel').value,
      buttonEmoji: document.getElementById('apps-panel-btnemoji').value,
      buttonStyle: document.getElementById('apps-panel-btnstyle').value
    }
  };
}

async function appsSaveSettings() {
  const msg = document.getElementById('apps-settings-msg');
  try { const r = await api('PUT', `/api/guild/${state.guildId}/applications/config`, appsSettingsPayload()); state.appsConfig = r.config; setStatus(msg, 'ok', '✅ Saved!'); }
  catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

// Saves current settings first (so the panel reflects unsaved edits), then posts.
async function appsPostPanel() {
  const msg = document.getElementById('apps-settings-msg');
  const channelId = document.getElementById('apps-panel-ch').value || null;
  if (!channelId) return setStatus(msg, 'err', '❌ Pick a channel to post the panel to.');
  try {
    await api('PUT', `/api/guild/${state.guildId}/applications/config`, appsSettingsPayload());
    const r = await api('POST', `/api/guild/${state.guildId}/applications/panel`, { channelId });
    state.appsConfig = r.config;
    setStatus(msg, 'ok', '✅ Panel posted!');
  } catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

// ═══════════════════════════════════════
//  MEMBER COUNTERS
// ═══════════════════════════════════════
let mcEditingId = null;

async function loadMemberCounters() {
  hide('mc-body');
  if (!state.guildId) { show('mc-no-guild'); return; }
  hide('mc-no-guild');
  await ensureGuildData();
  try {
    const data = await api('GET', `/api/guild/${state.guildId}/membercounters`);
    state.mcCounters = data.counters || [];
    state.mcTypes    = data.meta?.types || [];
    state.mcPreview  = data.preview || {};
  } catch { state.mcCounters = []; }
  show('mc-body');
  renderMemberCounters();
}

const MC_ICONS = { all: 'users', humans: 'user', bots: 'bot', boosters: 'gem', role: 'tag', channels: 'book', roles: 'hash' };

function mcChannelOptions(selected) {
  const gd = state.guildData || {};
  const grp = (label, arr, prefix) => (arr && arr.length)
    ? `<optgroup label="${label}">` + arr.map(c => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${prefix}${esc(c.name)}</option>`).join('') + '</optgroup>' : '';
  return `<option value="">Select a channel…</option>`
    + grp('Voice channels', gd.voiceChannels, '')
    + grp('Categories', gd.categories, '')
    + grp('Text channels', gd.textChannels, '# ');
}
function mcRoleOptions(selected) {
  return `<option value="">Select a role…</option>` +
    (state.guildData?.roles || []).map(r => `<option value="${r.id}"${r.id === selected ? ' selected' : ''}>@${esc(r.name)}</option>`).join('');
}
function mcChannelName(id) {
  const gd = state.guildData || {};
  const all = [
    ...(gd.voiceChannels || []).map(c => [c.name, c.id]),
    ...(gd.categories || []).map(c => [c.name, c.id]),
    ...(gd.textChannels || []).map(c => ['#' + c.name, c.id])
  ];
  const f = all.find(x => x[1] === id);
  return f ? f[0] : '(deleted channel)';
}
function mcLiveValue(c) {
  const p = state.mcPreview || {};
  if (c.type in p && p[c.type] != null) return Number(p[c.type]).toLocaleString();
  if (c.lastValue != null) return Number(c.lastValue).toLocaleString();
  return null;
}
function mcRoleName(roleId) { return (state.guildData?.roles || []).find(r => r.id === roleId)?.name || 'Role'; }

// Renders a template the way Discord will show it, using live/sample values.
function mcRender(type, template, roleId, liveCount) {
  const meta = state.mcTypes.find(t => t.key === type) || {};
  const tpl = (template || '').trim() || meta.defaultTemplate || '{count}';
  let count = liveCount;
  if (count == null) count = (state.mcPreview || {})[type];
  count = (count == null) ? (meta.needsRole ? '12' : '0') : Number(count).toLocaleString();
  const roleName = meta.needsRole ? mcRoleName(roleId) : '';
  return tpl.replace(/\{count\}/gi, count).replace(/\{role\}/gi, roleName).replace(/\{server\}/gi, state.guildData?.name || 'Server').slice(0, 100);
}

// ── List view ─────────────────────────────────────
function renderMemberCounters() {
  document.getElementById('mc-body').innerHTML = mcEditingId ? mcEditorHtml() : mcListHtml();
  if (mcEditingId) mcUpdatePreview();
}

function mcListHtml() {
  const gate = premiumGate('memberCounters', state.mcCounters.length);
  const addBtn = gateCreateButton(gate, 'Add Counter', 'mcAdd()', 'memberCounters', { icon: svg('plus') });
  const head = `<div class="mc-head">
      <div class="mc-head-info"><strong>${state.mcCounters.length}</strong> counter${state.mcCounters.length === 1 ? '' : 's'} configured &nbsp; ${gate.hint}</div>
      <div class="mc-head-actions">
        ${state.mcCounters.length ? `<button class="btn btn-secondary" onclick="mcRefresh()">${svg('refresh')} Refresh now</button>` : ''}
        ${addBtn}
      </div>
    </div>
    <div id="mc-list-msg" class="save-status mc-list-msg"></div>`;

  if (!state.mcCounters.length) return head + `
    <div class="mc-empty">
      <div class="mc-empty-ico">${svg('hash')}</div>
      <h4>No counters yet</h4>
      <p>Show live server stats — members, boosters, role counts — right in your channel list.</p>
      <button class="btn btn-primary" onclick="mcAdd()">${svg('plus')} Add your first counter</button>
    </div>`;

  const cards = state.mcCounters.map(c => {
    const meta = state.mcTypes.find(t => t.key === c.type) || {};
    const name = mcRender(c.type, c.template, c.roleId, c.lastValue);
    return `<div class="mc-card${c.enabled ? '' : ' mc-off'}">
      <div class="mc-card-top">
        <span class="mc-type-badge">${svg(MC_ICONS[c.type] || 'hash')} ${esc(meta.label || c.type)}</span>
        <label class="cmd-switch" title="${c.enabled ? 'Enabled' : 'Disabled'}">
          <input type="checkbox" ${c.enabled ? 'checked' : ''} onchange="mcToggle('${esc(c.id)}', this.checked)"><span class="cmd-slider"></span>
        </label>
      </div>
      <div class="mc-pill"><span class="mc-pill-dot">${svg('speaker')}</span><span class="mc-pill-name">${esc(name)}</span></div>
      <div class="mc-card-sub">renames ${esc(mcChannelName(c.channelId))}</div>
      <div class="mc-card-actions">
        <button class="mc-act" onclick="mcEdit('${esc(c.id)}')">${svg('edit')} Edit</button>
        <button class="mc-act mc-act-danger" onclick="mcDelete('${esc(c.id)}')">${svg('trash')} Delete</button>
      </div>
    </div>`;
  }).join('');

  return head + `<div class="mc-grid">${cards}</div>`;
}

// ── Editor ────────────────────────────────────────
function mcEditorHtml() {
  const editing = mcEditingId && mcEditingId !== 'new';
  const c = editing ? state.mcCounters.find(x => x.id === mcEditingId) : null;
  const type = c?.type || (state.mcTypes[0]?.key || 'all');
  const meta = state.mcTypes.find(t => t.key === type) || {};

  const typeCards = state.mcTypes.map(t => `
    <button type="button" class="mc-type${t.key === type ? ' active' : ''}" data-type="${t.key}" onclick="mcSelectType('${t.key}')">
      <span class="mc-type-ico">${svg(MC_ICONS[t.key] || 'hash')}</span>
      <span class="mc-type-label">${esc(t.label)}</span>
    </button>`).join('');

  return `
    <div class="card mc-editor">
      <div class="mc-editor-head">
        <h3>${editing ? 'Edit Counter' : 'New Counter'}</h3>
        <button class="mc-x" onclick="mcCancelEdit()" title="Back to list">${svg('x')}</button>
      </div>

      <div class="mc-preview-wrap">
        <span class="mc-preview-label">Preview — how the channel will look</span>
        <div class="mc-pill mc-pill-lg"><span class="mc-pill-dot">${svg('speaker')}</span><span class="mc-pill-name" id="mc-preview-pill"></span></div>
      </div>

      <input type="hidden" id="mc-f-type" value="${type}">

      <label class="mc-step">1 · What should it count?</label>
      <div class="mc-type-grid">${typeCards}</div>

      <div class="card-grid mc-fields">
        <div class="form-row"><label>2 · Channel to rename</label>
          <select id="mc-f-channel" onchange="mcUpdatePreview()">${mcChannelOptions(c?.channelId)}</select>
          <span class="hint">Voice channels &amp; categories look best. The bot needs <strong>Manage Channels</strong> here.</span></div>
        <div class="form-row${meta.needsRole ? '' : ' hidden'}" id="mc-f-role-row"><label>Role to track</label>
          <select id="mc-f-role" onchange="mcUpdatePreview()">${mcRoleOptions(c?.roleId)}</select></div>
      </div>

      <div class="form-row"><label>3 · Name template</label>
        <input id="mc-f-template" maxlength="100" value="${esc(c?.template || '')}" placeholder="${esc(meta.defaultTemplate || '{count}')}" oninput="mcUpdatePreview()">
        <span class="hint">Placeholders: <code>{count}</code> · <code>{role}</code> · <code>{server}</code></span></div>

      <div class="mc-enable-row">
        <label class="cmd-switch"><input type="checkbox" id="mc-f-enabled" ${c ? (c.enabled ? 'checked' : '') : 'checked'}><span class="cmd-slider"></span></label>
        <span>Enabled</span>
      </div>

      <div class="save-bar">
        <button class="btn btn-primary" onclick="mcSave()">${editing ? 'Save Changes' : 'Create Counter'}</button>
        <button class="btn btn-secondary" onclick="mcCancelEdit()">Cancel</button>
        <span id="mc-editor-msg" class="save-status"></span>
      </div>
    </div>`;
}

function mcSelectType(key) {
  document.getElementById('mc-f-type').value = key;
  document.querySelectorAll('.mc-type').forEach(b => b.classList.toggle('active', b.dataset.type === key));
  const meta = state.mcTypes.find(t => t.key === key) || {};
  document.getElementById('mc-f-role-row').classList.toggle('hidden', !meta.needsRole);
  const tpl = document.getElementById('mc-f-template');
  if (tpl) tpl.placeholder = meta.defaultTemplate || '{count}';
  mcUpdatePreview();
}

function mcUpdatePreview() {
  const pill = document.getElementById('mc-preview-pill');
  if (!pill) return;
  const type = document.getElementById('mc-f-type').value;
  const tpl  = document.getElementById('mc-f-template').value;
  const roleEl = document.getElementById('mc-f-role');
  pill.textContent = mcRender(type, tpl, roleEl ? roleEl.value : null, null);
}

async function mcSave() {
  const msg = document.getElementById('mc-editor-msg');
  const editing = mcEditingId && mcEditingId !== 'new';
  const roleEl = document.getElementById('mc-f-role');
  const payload = {
    channelId: document.getElementById('mc-f-channel').value || null,
    type:      document.getElementById('mc-f-type').value,
    roleId:    roleEl ? (roleEl.value || null) : null,
    template:  document.getElementById('mc-f-template').value,
    enabled:   document.getElementById('mc-f-enabled').checked
  };
  if (!payload.channelId) return setStatus(msg, 'err', '❌ Pick a channel.');
  const meta = state.mcTypes.find(t => t.key === payload.type) || {};
  if (meta.needsRole && !payload.roleId) return setStatus(msg, 'err', '❌ Pick a role for this counter type.');
  try {
    if (editing) await api('PUT', `/api/guild/${state.guildId}/membercounters/${mcEditingId}`, payload);
    else await api('POST', `/api/guild/${state.guildId}/membercounters`, payload);
    mcEditingId = null;
    await loadMemberCounters();
  } catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

function mcAdd() { mcEditingId = 'new'; renderMemberCounters(); }
function mcEdit(id) { mcEditingId = id; renderMemberCounters(); document.getElementById('mc-body').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
function mcCancelEdit() { mcEditingId = null; renderMemberCounters(); }

async function mcToggle(id, enable) {
  try { await api('PUT', `/api/guild/${state.guildId}/membercounters/${id}`, { enabled: enable }); await loadMemberCounters(); }
  catch (e) { alert(e.message); }
}
async function mcDelete(id) {
  if (!confirm('Delete this counter? This will also delete its Discord channel/category. This cannot be undone.')) return;
  try { await api('DELETE', `/api/guild/${state.guildId}/membercounters/${id}`); await loadMemberCounters(); }
  catch (e) { alert(e.message); }
}
async function mcRefresh() {
  const msg = document.getElementById('mc-list-msg');
  try { await api('POST', `/api/guild/${state.guildId}/membercounters/refresh`, {}); setStatus(msg, 'ok', '✅ Refreshing channels now (Discord may delay renames).'); }
  catch (e) { setStatus(msg, 'err', '❌ ' + e.message); }
}

// ═══════════════════════════════════════
//  PREMIUM
// ═══════════════════════════════════════
let _premium = null;

async function loadPremium() {
  const body = document.getElementById('premium-body');
  body.innerHTML = '<p class="muted">Loading…</p>';
  try {
    _premium = await api('GET', '/api/premium');
    renderPremium();
  } catch (e) {
    body.innerHTML = `<p class="premium-err">${esc(e.message)}</p>`;
  }
}

function premiumTierLabel(p) {
  if (p.lifetime) return 'Lifetime';
  const map = { pro: 'Pro', max: 'Max', complimentary: 'Complimentary' };
  return map[p.tier] || (p.tier ? p.tier : 'Free');
}

// Account card: avatar, Discord display name, @username, user ID and current plan.
function premiumProfileCard(p) {
  const pf = p.profile || {};
  const plan = p.active ? premiumChip(premiumTierLabel(p)) : '<span class="hint">Free</span>';
  return `<div class="card premium-profile">
      ${pf.avatar ? `<img src="${esc(pf.avatar)}" class="premium-profile-avatar" alt="">` : ''}
      <div class="premium-profile-info">
        <div class="premium-profile-name">${esc(pf.displayName || '')}</div>
        <div class="hint">@${esc(pf.handle || '')}</div>
        <div class="premium-profile-meta">
          <span>User ID: <code>${esc(pf.id || '')}</code></span>
          <span>Plan: ${plan}</span>
        </div>
      </div>
    </div>`;
}

function renderPremium() {
  const p = _premium;
  const body = document.getElementById('premium-body');

  const bl = p.buyLinks || {};
  const planCard = (title, price, sub, link) => `
    <div class="premium-plan">
      <h4>${title}</h4>
      <div class="premium-price">${price}</div>
      <div class="muted">${sub}</div>
      ${link ? `<a class="btn btn-primary btn-sm premium-buy" href="${esc(link)}" target="_blank" rel="noopener">Buy</a>` : ''}
    </div>`;

  // Inactive (free) state — show plans, each with its own Buy button.
  if (!p.active) {
    const pr = p.pricing || {};
    body.innerHTML = premiumProfileCard(p) + `
      <div class="premium-card premium-free">
        <div class="premium-status"><span class="sdot" style="background:var(--muted)"></span> You're on the <strong>Free</strong> plan.</div>
        <p class="muted">Upgrade to raise limits across polls, reaction roles, autoroles, social alerts, leveling rewards, member counters and applications — and unlock more across every server you manage.</p>
        <div class="premium-plans">
          ${planCard('Pro', pr.pro ? pr.pro.monthly + '/mo' : '€4.99/mo', '1 server slot', bl.pro || p.upgradeUrl)}
          ${planCard('Max', pr.max ? pr.max.monthly + '/mo' : '€9.99/mo', '3 server slots', bl.max || p.upgradeUrl)}
          ${planCard('Lifetime', pr.lifetime ? pr.lifetime.oneTime : '€89.99', '1 slot, forever', bl.lifetime || p.upgradeUrl)}
        </div>
        <p class="premium-buy-hint muted">After purchase you'll receive a license key — activate it with <code>/activate-premium</code> in the ZenByte server.</p>
        ${p.upgradeUrl ? `<a class="premium-store-link" href="${esc(p.upgradeUrl)}" target="_blank" rel="noopener">Browse all plans on the store →</a>` : ''}
      </div>`;
    hydrateIcons(body);
    return;
  }

  const assignedIds = new Set(p.assigned.map(g => g.id));
  const free = Math.max(0, p.slotsTotal - p.slotsUsed);
  const expiry = p.lifetime
    ? 'Never (lifetime)'
    : (p.expiresAt ? new Date(p.expiresAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : '—');

  const assignedRows = p.assigned.length
    ? p.assigned.map(g => `
        <div class="premium-server">
          <span class="premium-server-name">${g.icon ? `<img src="${esc(g.icon)}" class="premium-server-ico">` : ''}${esc(g.name)}</span>
          <button class="btn btn-secondary btn-sm" onclick="premiumUnassign('${g.id}')">${svg('x')} Remove</button>
        </div>`).join('')
    : '<p class="muted">No servers activated yet. Assign one below.</p>';

  // Servers the user manages that aren't already using one of their slots.
  const candidates = (p.assignable || []).filter(g => !assignedIds.has(g.id));
  const assignControl = free > 0
    ? (candidates.length
        ? `<div class="premium-assign">
             <select id="premium-assign-select">
               ${candidates.map(g => `<option value="${g.id}">${esc(g.name)}</option>`).join('')}
             </select>
             <button class="btn btn-primary btn-sm" onclick="premiumAssign()">${svg('plus')} Activate</button>
           </div>`
        : '<p class="muted">Every server you manage is already activated.</p>')
    : '<p class="muted">All your slots are in use. Remove a server to free one up.</p>';

  // Lifetime holders can buy additional permanent slots.
  const extraPrice = (p.pricing && p.pricing.lifetime && p.pricing.lifetime.extraSlot) || '€24.99';
  const extraSlotCard = (p.lifetime && bl.extraSlot)
    ? `<div class="premium-card premium-extra">
         <div class="premium-extra-info">
           <h3>Need more slots?</h3>
           <p class="muted">Add a permanent extra server slot to your Lifetime plan. After buying, activate the key with <code>/activate-premium</code>.</p>
         </div>
         <div class="premium-extra-buy">
           <div class="premium-price">${esc(extraPrice)}</div>
           <a class="btn btn-primary btn-sm" href="${esc(bl.extraSlot)}" target="_blank" rel="noopener">${svg('plus')} Buy slot</a>
         </div>
       </div>`
    : '';

  body.innerHTML = premiumProfileCard(p) + `
    <div class="premium-card">
      <div class="premium-head">
        <div class="premium-status"><span class="sdot" style="background:var(--green)"></span> <strong>${premiumTierLabel(p)}</strong> · Active</div>
        <div class="premium-slots">Slots: <strong>${p.slotsUsed} / ${p.slotsTotal}</strong> used</div>
      </div>
      <div class="muted premium-expiry">Renews / expires: ${esc(expiry)}</div>
    </div>

    <div class="premium-card">
      <h3>Activated servers</h3>
      <p class="muted">Premium features apply to the servers you activate here, using your ${p.slotsTotal} slot${p.slotsTotal === 1 ? '' : 's'}.</p>
      <div class="premium-servers">${assignedRows}</div>
      <hr class="premium-hr">
      ${assignControl}
    </div>
    ${extraSlotCard}`;
  hydrateIcons(body);
}

async function premiumAssign() {
  const sel = document.getElementById('premium-assign-select');
  if (!sel || !sel.value) return;
  try {
    const r = await api('POST', '/api/premium/assign', { guildId: sel.value });
    _premium = r.status;
    renderPremium();
  } catch (e) { alert(e.message); }
}

async function premiumUnassign(guildId) {
  if (!confirm('Remove premium from this server? Its limits drop back to the free tier.')) return;
  try {
    const r = await api('POST', '/api/premium/unassign', { guildId });
    _premium = r.status;
    renderPremium();
  } catch (e) { alert(e.message); }
}
