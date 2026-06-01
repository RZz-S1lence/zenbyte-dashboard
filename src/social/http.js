// Thin fetch wrappers with a timeout and a browser-ish User-Agent. Several of
// these endpoints (Reddit, Kick) reject requests without one.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const TIMEOUT_MS = 9000;

async function request(url, { headers = {}, json = false, method = 'GET', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method, body,
      headers: { 'User-Agent': UA, 'Accept': json ? 'application/json' : '*/*', ...headers },
      signal: controller.signal
    });
    if (!res.ok) return { ok: false, status: res.status };
    return { ok: true, status: res.status, body: json ? await res.json() : await res.text() };
  } catch (e) {
    return { ok: false, status: 0, error: e.name === 'AbortError' ? 'timeout' : e.message };
  } finally {
    clearTimeout(timer);
  }
}

const fetchText = (url, opts) => request(url, { ...opts, json: false });
const fetchJson = (url, opts) => request(url, { ...opts, json: true });

module.exports = { fetchText, fetchJson, request };
