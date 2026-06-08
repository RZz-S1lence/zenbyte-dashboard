// Welcome / leave message configuration. One config object per guild holds two
// messages ("welcome" and "leave"), each of which can be a plain text line or a
// fully customized embed. Everything is validated here so stored data is always
// safe to render.

const HEX_RE = /^#[0-9a-fA-F]{6}$/;
const ID_RE  = /^\d{16,20}$/;
const MODES  = ['text', 'embed'];
const DEFAULT_COLOR = '#5865F2';

const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const safeUrl = v => (typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim())) ? v.trim().slice(0, 500) : '';

// Placeholders available in any text/embed field, documented for the dashboard.
const PLACEHOLDERS = ['{user}', '{username}', '{tag}', '{server}', '{membercount}'];

function normalizeMessage(raw = {}) {
  const m = raw || {};
  const e = m.embed || {};
  // thumbnail is either the literal "avatar" (member's avatar) or a custom URL.
  const thumbnail = e.thumbnail === 'avatar' ? 'avatar' : safeUrl(e.thumbnail);
  return {
    enabled:   !!m.enabled,
    channelId: ID_RE.test(m.channelId || '') ? m.channelId : null,
    mode:      MODES.includes(m.mode) ? m.mode : 'embed',
    text:      str(m.text, 2000).trim(),
    embed: {
      title:         str(e.title, 256).trim(),
      description:   str(e.description, 4000).trim(),
      color:         HEX_RE.test(e.color) ? e.color : DEFAULT_COLOR,
      thumbnail,
      image:         safeUrl(e.image),
      footer:        str(e.footer, 2048).trim(),
      showTimestamp: e.showTimestamp !== false
    }
  };
}

function normalizeGreetings(cfg = {}) {
  const c = cfg || {};
  return { welcome: normalizeMessage(c.welcome), leave: normalizeMessage(c.leave) };
}

module.exports = { normalizeGreetings, normalizeMessage, PLACEHOLDERS, DEFAULT_COLOR };
