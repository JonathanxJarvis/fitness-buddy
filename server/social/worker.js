// Fitness Buddy crew server: friend codes, progression snapshots and 1:1 chat.
// Cloudflare Worker + D1. See README.md for setup.
//
// Auth: /register returns { id, code, secret }. Every other call sends
// `Authorization: Bearer <id>:<secret>`. Only a SHA-256 hash of the secret is stored.

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const MAX_TEXT = 500;
const MAX_FRIENDS = 200;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  });
const fail = (error, status = 400) => json({ error }, status);

function random(n, chars = CODE_CHARS) {
  const bytes = crypto.getRandomValues(new Uint8Array(n));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

async function sha256(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const num = (v, max = 1e9) => (typeof v === 'number' && isFinite(v) ? Math.max(0, Math.min(max, v)) : 0);
const str = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');

/** Keep only the fields the app shares, with sane bounds. Never food or body data. */
function cleanSnapshot(s) {
  if (!s || typeof s !== 'object') return null;
  const lw = s.lastWorkout;
  return {
    name: str(s.name, 40) || 'Lifter',
    score: num(s.score, 100),
    stage: Math.round(num(s.stage, 100)),
    level: Math.round(num(s.level, 1000)),
    xp: Math.round(num(s.xp)),
    history: (Array.isArray(s.history) ? s.history : []).slice(0, 8).map((x) => num(x, 100)),
    levels: (Array.isArray(s.levels) ? s.levels : []).slice(0, 8).map((x) => Math.round(num(x, 1000))),
    weekWorkouts: Math.round(num(s.weekWorkouts, 50)),
    totalWorkouts: Math.round(num(s.totalWorkouts, 100000)),
    lastWorkout: lw && typeof lw === 'object' ? { name: str(lw.name, 40), date: str(lw.date, 10), sets: Math.round(num(lw.sets, 500)) } : undefined,
    skin: str(s.skin, 20) || undefined,
    pet: str(s.pet, 20) || undefined,
    petName: str(s.petName, 24) || undefined,
    parts: s.parts && typeof s.parts === 'object' ? { strength: num(s.parts.strength, 100), consistency: num(s.parts.consistency, 100), momentum: num(s.parts.momentum, 100) } : undefined,
    streak: Math.round(num(s.streak, 100000)),
    recent: (Array.isArray(s.recent) ? s.recent : [])
      .slice(0, 6)
      .filter((e) => e && ['pr', 'workout', 'rank', 'quests', 'streak'].includes(e.kind))
      .map((e) => ({ kind: e.kind, text: str(e.text, 80), at: num(e.at, 1e13) })),
    updatedAt: Date.now(),
  };
}

async function auth(req, env) {
  const m = /^Bearer ([\w-]+):([\w-]+)$/.exec(req.headers.get('authorization') || '');
  if (!m) return null;
  const row = await env.DB.prepare('SELECT id, code, secret_hash FROM users WHERE id = ?').bind(m[1]).first();
  if (!row || row.secret_hash !== (await sha256(m[2]))) return null;
  return row;
}

const isFriend = (env, a, b) => env.DB.prepare('SELECT 1 FROM friends WHERE user_id = ? AND friend_id = ?').bind(a, b).first();

function toFriend(row) {
  return { id: row.id, code: row.code, ...JSON.parse(row.snapshot) };
}

export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers': 'content-type, authorization',
        },
      });
    }
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '');
    let body = {};
    if (req.method === 'POST' || req.method === 'PUT') {
      const raw = await req.text();
      if (raw.length > 8000) return fail('Request too large', 413);
      try {
        body = raw ? JSON.parse(raw) : {};
      } catch {
        return fail('Invalid JSON');
      }
    }

    if (req.method === 'POST' && path === '/register') {
      const snapshot = cleanSnapshot(body.snapshot);
      if (!snapshot) return fail('Missing snapshot');
      const id = `u_${random(16, 'abcdefghijklmnopqrstuvwxyz0123456789')}`;
      const secret = random(32, 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789');
      const now = Date.now();
      for (let i = 0; i < 5; i++) {
        const code = random(6);
        try {
          await env.DB.prepare('INSERT INTO users (id, code, secret_hash, snapshot, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)')
            .bind(id, code, await sha256(secret), JSON.stringify(snapshot), now, now)
            .run();
          return json({ id, code, secret });
        } catch (e) {
          if (!String(e).includes('UNIQUE')) throw e;
        }
      }
      return fail('Could not allocate a code, try again', 503);
    }

    const me = await auth(req, env);
    if (!me) return fail('Unauthorized', 401);

    if (req.method === 'PUT' && path === '/me') {
      const snapshot = cleanSnapshot(body.snapshot);
      if (!snapshot) return fail('Missing snapshot');
      await env.DB.prepare('UPDATE users SET snapshot = ?, updated_at = ? WHERE id = ?').bind(JSON.stringify(snapshot), Date.now(), me.id).run();
      return json({ ok: true });
    }

    if (req.method === 'GET' && path === '/friends') {
      const { results } = await env.DB.prepare('SELECT u.id, u.code, u.snapshot FROM friends f JOIN users u ON u.id = f.friend_id WHERE f.user_id = ? ORDER BY f.created_at').bind(me.id).all();
      return json({ friends: results.map(toFriend) });
    }

    if (req.method === 'POST' && path === '/friends') {
      const code = str(body.code, 12).toUpperCase().replace(/[^A-Z0-9]/g, '');
      const other = await env.DB.prepare('SELECT id, code, snapshot FROM users WHERE code = ?').bind(code).first();
      if (!other) return fail('No one has that code. Check it and try again.', 404);
      if (other.id === me.id) return fail('That’s your own code.');
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM friends WHERE user_id = ?').bind(me.id).first();
      if (count.n >= MAX_FRIENDS) return fail('Your crew is full.');
      const now = Date.now();
      // Adding someone's code links you both ways, like swapping numbers.
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)').bind(me.id, other.id, now),
        env.DB.prepare('INSERT OR IGNORE INTO friends (user_id, friend_id, created_at) VALUES (?, ?, ?)').bind(other.id, me.id, now),
      ]);
      return json({ friend: toFriend(other) });
    }

    const del = /^\/friends\/([\w-]+)$/.exec(path);
    if (req.method === 'DELETE' && del) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').bind(me.id, del[1]),
        env.DB.prepare('DELETE FROM friends WHERE user_id = ? AND friend_id = ?').bind(del[1], me.id),
      ]);
      return json({ ok: true });
    }

    if (req.method === 'POST' && path === '/messages') {
      const to = str(body.to, 40);
      const text = str(body.text, MAX_TEXT).trim();
      if (!text) return fail('Empty message');
      if (!(await isFriend(env, me.id, to))) return fail('You can only message your crew.', 403);
      const message = { id: `m_${random(16, 'abcdefghijklmnopqrstuvwxyz0123456789')}`, from: me.id, to, text, at: Date.now() };
      await env.DB.prepare('INSERT INTO messages (id, sender, recipient, body, at) VALUES (?, ?, ?, ?, ?)').bind(message.id, me.id, to, text, message.at).run();
      return json({ message });
    }

    const thread = /^\/messages\/([\w-]+)$/.exec(path);
    if (req.method === 'GET' && thread) {
      const other = thread[1];
      if (!(await isFriend(env, me.id, other))) return fail('Not in your crew', 403);
      const since = Number(url.searchParams.get('since')) || 0;
      const { results } = await env.DB.prepare(
        'SELECT id, sender, recipient, body, at FROM messages WHERE ((sender = ? AND recipient = ?) OR (sender = ? AND recipient = ?)) AND at > ? ORDER BY at LIMIT 200',
      )
        .bind(me.id, other, other, me.id, since)
        .all();
      return json({ messages: results.map((r) => ({ id: r.id, from: r.sender, to: r.recipient, text: r.body, at: r.at })) });
    }

    return fail('Not found', 404);
  },
};
