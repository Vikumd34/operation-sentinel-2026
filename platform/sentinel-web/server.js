'use strict';
// Operation Sentinel 2026 - platform layer (zero dependencies). Flags stay server-side.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const auth = require('./auth');
const { HINT_SECONDS } = require('./hint-timers');
const PORT = +process.env.PORT || 8080, HOST = process.env.HOST || '127.0.0.1', ADMIN = process.env.ADMIN_TOKEN || '';
const ROOT = __dirname, DATA = process.env.DATA_FILE || path.join(ROOT, 'data', 'progress.json');
const FLAGS = JSON.parse(fs.readFileSync(process.env.FLAGS_FILE || path.join(ROOT, 'organiser_only', 'flags.json'), 'utf8'));
const CH = JSON.parse(fs.readFileSync(path.join(ROOT, 'challenges.json'), 'utf8'));
const MAX = CH.reduce((a, c) => a + c.points, 0);
let S = {}; try { S = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch {}
const LOG = [], hits = new Map();
const AUTH_RATE_LIMIT = Number(process.env.AUTH_RATE_LIMIT || 10);
const save = () => { try { fs.writeFileSync(DATA, JSON.stringify(S)); } catch {} };
const log = (e, d) => { LOG.push({ t: new Date().toISOString(), e, ...d }); if (LOG.length > 200) LOG.shift(); };
const sha = s => crypto.createHash('sha256').update(String(s)).digest();
const eq = (a, b) => crypto.timingSafeEqual(sha(a), sha(b));
const blank = () => ({ solved: {}, hints: {}, pen: {} });

function setSessionCookie(req, res, sid) {
  const secure = req.socket.encrypted ? '; Secure' : '';
  res.setHeader('Set-Cookie',
    'sid=' + sid + '; HttpOnly; SameSite=Strict; Path=/' + secure);
}

function newAccountSession(req, res, username) {
  const sid = crypto.randomBytes(16).toString('hex');
  S[sid] = { user: username };
  setSessionCookie(req, res, sid);
  save();
  return sid;
}

function sess(req, res) {
  const m = /(?:^|; )sid=([a-f0-9]{32})/.exec(req.headers.cookie || '');
  let sid = m && m[1];

  if (!sid || !Object.hasOwn(S, sid)) {
    sid = crypto.randomBytes(16).toString('hex');
    S[sid] = blank();
    setSessionCookie(req, res, sid);
  }

  const session = S[sid];

  if (session.user) {
    const key = 'user:' + session.user;
    return [sid, S[key] || (S[key] = blank())];
  }

  return [sid, session];
}

function loggedIn(req) {
  const m = /(?:^|; )sid=([a-f0-9]{32})/.exec(req.headers.cookie || '');
  return !!(m && S[m[1]] && S[m[1]].user);
}
const idx = id => CH.findIndex(c => c.id === id);
const unlocked = (p, i) => i === 0 || !!p.solved[CH[i - 1].id];
function view(p) {
  let score = 0;
  const challenges = CH.map((c, i) => {
    const solved = p.solved[c.id], open = unlocked(p, i);
    const o = { id: c.id, title: c.title, domain: c.domain, difficulty: c.difficulty, points: c.points, status: solved ? 'solved' : open ? 'open' : 'locked', requires: i ? CH[i - 1].id : null };
    if (solved) score += solved.score;
    if (open) {
      const n = p.hints[c.id] || 0;
      Object.assign(o, { scenario: c.scenario, objective: c.objective, tools: c.tools, evidence: c.evidence,
        hintCosts: c.hints.map(h => h.p), hints: c.hints.slice(0, n).map((h, k) => {
          const expiresAt = p.hintUntil?.[c.id]?.[k + 1] || 0;
          const active = expiresAt > Date.now();
          return {
            n: k + 1,
            penalty: h.p,
            text: active ? h.t : null,
            expiresAt: active ? expiresAt : 0
          };
        }) });
      if (solved) o.earned = solved.score;
    }
    return o;
  });
  return { challenges, score, max: MAX, complete: CH.every(c => p.solved[c.id]) };
}
function body(req) {
  return new Promise((ok, no) => {
    if (!/^application\/json/.test(req.headers['content-type'] || '')) return no(415);
    let b = ''; req.on('data', d => { b += d; if (b.length > 2048) { no(413); req.destroy(); } });
    req.on('end', () => { try { ok(JSON.parse(b || '{}')); } catch { no(400); } });
  });
}
const adminOk = req => ADMIN && eq(req.headers['x-admin-token'] || '', ADMIN);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const send = (c, o) => { res.writeHead(c, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(o)); };
  res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('X-Frame-Options', 'DENY'); res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Content-Security-Policy', "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; img-src 'self' data:");
  const url = new URL(req.url, 'http://x'), p = url.pathname;
  try {
    if (req.method === 'GET' && p === '/api/health') return send(200, { ok: true, stages: CH.length, flagsLoaded: CH.every(c => FLAGS[c.id]) });
    if (req.method === 'GET' && p === '/api/me') {
      const match = /(?:^|; )sid=([a-f0-9]{32})/.exec(req.headers.cookie || '');
      const session = match ? S[match[1]] : null;
      const username = session && session.user ? session.user : null;
      return send(200, { loggedIn: !!username, username });
    }
    if (req.method === 'GET' && p === '/api/challenges') {
  if (!loggedIn(req)) return send(401, { error: 'Please log in first' });
  const [, s] = sess(req, res);
  return send(200, view(s));
}
    if (req.method === 'GET' && p === '/api/admin/status') {
      if (!adminOk(req)) return send(403, { error: 'forbidden' });
      const ps = Object.values(S).filter(x => x && x.solved && x.hints && x.pen);
      return send(200, { players: ps.length, solvedPerStage: CH.map(c => ({ id: c.id, solved: ps.filter(x => x.solved[c.id]).length })), log: LOG.slice(-50) });
    }
    if (req.method === 'POST' && p.startsWith('/api/')) {
      const b = await body(req).catch(c => { throw c; });
      if (p === '/api/login' || p === '/api/register') {
        const key = 'auth:' + req.socket.remoteAddress + ':' +
          Math.floor(Date.now() / 60000);
        hits.set(key, (hits.get(key) || 0) + 1);
        if (hits.size > 5000) hits.clear();
        if (hits.get(key) > AUTH_RATE_LIMIT) {
          return send(429, { error: 'Too many attempts. Try again in one minute.' });
        }
      }

      if (p === '/api/logout') {
        const match = /(?:^|; )sid=([a-f0-9]{32})/.exec(req.headers.cookie || '');
        if (match && Object.hasOwn(S, match[1])) {
          delete S[match[1]];
          save();
        }
        const secure = req.socket.encrypted ? '; Secure' : '';
        res.setHeader('Set-Cookie',
          'sid=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0' + secure);
        return send(200, { ok: true });
      }
      if (p === '/api/login') {
        if (!auth.verify(b.username, b.password)) {
          return send(401, { error: 'Invalid username or password' });
        }

        const username = b.username.toLowerCase();
        newAccountSession(req, res, username);
        return send(200, { ok: true, username });
      }

      if (p === '/api/register') {
        try {
          const username = auth.register(b.username, b.password);
          return send(201, { ok: true, username });
        } catch (e) {
          const status = e.message === 'Username already exists' ? 409 : 400;
          return send(status, { error: e.message });
        }
      }
      if (p === '/api/admin/reset') {
        if (!adminOk(req)) { log('admin_denied', {}); return send(403, { error: 'forbidden' }); }
        if (b.id && idx(b.id) < 0) return send(400, { error: 'unknown stage' });
        for (const x of Object.values(S).filter(x => x && x.solved && x.hints && x.pen)) { // resetting a stage also clears later stages to keep prerequisites consistent
          const from = b.id ? idx(b.id) : 0; CH.slice(from).forEach(c => { delete x.solved[c.id]; delete x.hints[c.id]; delete x.pen[c.id]; });
        }
        save(); log('admin_reset', { id: b.id || 'ALL' }); return send(200, { ok: true });
      }
      if (!loggedIn(req)) return send(401, { error: 'Please log in first' });
      const [sid, s] = sess(req, res);
      if (p === '/api/reset') { for (const key of Object.keys(s)) delete s[key]; Object.assign(s, blank()); save(); log('player_reset', { sid: sid.slice(0, 6) }); return send(200, view(s)); }
      const i = idx(b.id); if (i < 0) return send(400, { error: 'unknown stage' });
      if (!unlocked(s, i)) { log('bypass_attempt', { sid: sid.slice(0, 6), id: b.id }); return send(403, { error: 'stage locked' }); }
      if (p === '/api/hint') {
        const n = b.n | 0, c = CH[i], cur = s.hints[c.id] || 0;
        if (n < 1 || n > c.hints.length) return send(400, { error: 'no such hint' });
        if (n > cur + 1) return send(409, { error: 'unlock hints in order' });
        if (n === cur + 1) {
          s.hints[c.id] = n;
          s.pen[c.id] = (s.pen[c.id] || 0) + c.hints[n - 1].p;
        }
        s.hintUntil ||= {};
        s.hintUntil[c.id] ||= {};
        s.hintUntil[c.id][n] = Date.now() + HINT_SECONDS[c.id] * 1000;
        save();
        log('hint_view', { sid: sid.slice(0, 6), id: c.id, n });

        return send(200, view(s));
      }
      if (p === '/api/verify-incident') {
        if (b.id !== 'OS-01') return send(400, { error: 'invalid stage' });

        const key = 'verify:' + sid + ':' + Math.floor(Date.now() / 60000);
        hits.set(key, (hits.get(key) || 0) + 1);
        if (hits.size > 5000) hits.clear();
        if (hits.get(key) > 10) {
          return send(429, { error: 'too many attempts, wait a minute' });
        }

        if (typeof b.reference !== 'string' || b.reference.length > 64) {
          return send(400, { error: 'invalid incident reference' });
        }

        if (!eq(b.reference.trim().toUpperCase(), 'INC-4721')) {
          return send(200, { verified: false });
        }

        return send(200, { verified: true, flag: FLAGS['OS-01'] });
      }
      if (p === '/api/verify-event') {
        if (b.id !== 'OS-03') return send(400, { error: 'invalid stage' });

        const key = 'event:' + sid + ':' + Math.floor(Date.now() / 60000);
        hits.set(key, (hits.get(key) || 0) + 1);
        if (hits.size > 5000) hits.clear();
        if (hits.get(key) > 10) {
          return send(429, { error: 'too many attempts, wait a minute' });
        }

        const fields = [b.eventId, b.sourceIp, b.destination];
        if (fields.some(v => typeof v !== 'string' || v.length > 100)) {
          return send(400, { error: 'invalid investigation details' });
        }

        const csvPath = path.join(ROOT, 'public', 'evidence', 'security_events.csv');
        const rows = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
        const verified = rows.slice(1).some(line => {
          const cols = line.split(',');
          return cols.length === 7 &&
            cols[0].startsWith('2026-09-26 23:47') &&
            cols[2] === 'ops_readonly' &&
            eq(cols[1], b.eventId.trim()) &&
            eq(cols[3], b.sourceIp.trim()) &&
            eq(cols[4], b.destination.trim());
        });

        if (!verified) return send(200, { verified: false });

        return send(200, { verified: true, flag: FLAGS['OS-03'] });
      }
      if (p === '/api/submit') {
        const k = sid + ':' + Math.floor(Date.now() / 60000); hits.set(k, (hits.get(k) || 0) + 1);
        if (hits.size > 5000) hits.clear();
        if (hits.get(k) > 15) return send(429, { error: 'too many attempts, wait a minute' });
        const c = CH[i];
        if (s.solved[c.id]) return send(200, { correct: true, duplicate: true, ...view(s) });
        if (typeof b.flag !== 'string' || b.flag.length > 200) return send(400, { error: 'bad flag' });
        if (!eq(b.flag.trim(), FLAGS[c.id])) { log('wrong_flag', { sid: sid.slice(0, 6), id: c.id }); return send(200, { correct: false, ...view(s) }); }
        s.solved[c.id] = { score: Math.max(0, c.points - (s.pen[c.id] || 0)), t: Date.now() }; save(); log('solved', { sid: sid.slice(0, 6), id: c.id });
        return send(200, { correct: true, ...view(s) });
      }
      return send(404, { error: 'not found' });
    }
    if (req.method !== 'GET') return send(405, { error: 'method' });
    const f = path.normalize(path.join(ROOT, 'public', p === '/' ? 'index.html' : p));
    // Redirect the homepage to the correct page
if (p === '/' || p === '/index.html') {
  res.writeHead(302, {
    Location: loggedIn(req) ? '/dashboard.html' : '/login.html'
  });
  return res.end();
}

// Protect the dashboard
if (p === '/dashboard.html' && !loggedIn(req)) {
  res.writeHead(302, { Location: '/login.html' });
  return res.end();
}

if (!f.startsWith(path.join(ROOT, 'public') + path.sep)) {
  res.writeHead(403);
  return res.end();
}
    if (!f.startsWith(path.join(ROOT, 'public') + path.sep)) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (e, d) => { if (e) { res.writeHead(404); return res.end('Not found'); } res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream' }); res.end(d); });
  } catch (c) { send(typeof c === 'number' ? c : 500, { error: typeof c === 'number' ? 'bad request' : 'server error' }); }
});
if (require.main === module) server.listen(PORT, HOST, () => console.log(`Sentinel on http://${HOST}:${PORT}` + (ADMIN ? '' : ' (admin disabled: set ADMIN_TOKEN)')));
module.exports = server;
