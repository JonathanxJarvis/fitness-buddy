/**
 * Fitness Buddy AI proxy: a tiny Cloudflare Worker that holds the Claude API
 * key so people using the app never need one. The app's Anthropic SDK points
 * its baseURL here; this Worker checks the request, swaps in the real key and
 * forwards it to the Claude API.
 *
 * Secrets (set with `npx wrangler secret put NAME`):
 *   ANTHROPIC_API_KEY  required, your key from console.anthropic.com
 *   APP_TOKEN          optional, a shared string the app sends as x-app-token.
 *                      It ships inside the app, so it only keeps out casual
 *                      traffic; the limits below are the real protection.
 */

const ANTHROPIC = 'https://api.anthropic.com';
export const ALLOWED_MODELS = ['claude-opus-5'];
export const MAX_TOKENS = 2048;
const MAX_BODY_BYTES = 6 * 1024 * 1024; // a ~1024 px photo is well under this
const REQUESTS_PER_HOUR = 60; // per IP, per Worker instance (best effort)

const hits = new Map();

function json(status, message) {
  return new Response(JSON.stringify({ type: 'error', error: { type: 'proxy_error', message } }), {
    status,
    headers: { 'content-type': 'application/json', ...CORS },
  });
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-headers': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
};

/** Returns an error string if the request body isn't one this app would send. */
export function validate(body) {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object.';
  if (!ALLOWED_MODELS.includes(body.model)) return `Model must be one of: ${ALLOWED_MODELS.join(', ')}.`;
  if (typeof body.max_tokens !== 'number' || body.max_tokens < 1 || body.max_tokens > MAX_TOKENS) return `max_tokens must be 1–${MAX_TOKENS}.`;
  if (body.stream) return 'Streaming is not supported.';
  if (body.tools || body.mcp_servers || body.container) return 'Tools are not supported.';
  if (!Array.isArray(body.messages) || body.messages.length === 0 || body.messages.length > 40) return 'messages must have 1–40 items.';
  return null;
}

export function rateLimited(ip, now = Date.now()) {
  const hour = 60 * 60 * 1000;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < hour);
  if (recent.length >= REQUESTS_PER_HOUR) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    const url = new URL(request.url);
    if (request.method !== 'POST' || url.pathname !== '/v1/messages') return json(404, 'Not found.');
    if (!env.ANTHROPIC_API_KEY) return json(500, 'The server has no ANTHROPIC_API_KEY set.');
    if (env.APP_TOKEN && request.headers.get('x-app-token') !== env.APP_TOKEN) return json(401, 'This app is not allowed to use this server.');

    const ip = request.headers.get('cf-connecting-ip') ?? 'unknown';
    if (rateLimited(ip)) return json(429, 'Too many AI requests from this device. Try again later.');

    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json(413, 'Request too large.');
    let body;
    try {
      body = JSON.parse(raw);
    } catch {
      return json(400, 'Body must be JSON.');
    }
    const problem = validate(body);
    if (problem) return json(400, problem);

    const headers = {
      'content-type': 'application/json',
      'x-api-key': env.ANTHROPIC_API_KEY,
      'anthropic-version': request.headers.get('anthropic-version') ?? '2023-06-01',
    };
    const beta = request.headers.get('anthropic-beta');
    if (beta) headers['anthropic-beta'] = beta;

    const upstream = await fetch(ANTHROPIC + url.pathname + url.search, { method: 'POST', headers, body: raw });
    return new Response(upstream.body, {
      status: upstream.status,
      headers: { 'content-type': upstream.headers.get('content-type') ?? 'application/json', ...CORS },
    });
  },
};
