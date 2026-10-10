const { test, before, after } = require('node:test'), assert = require('node:assert'), os = require('os'), path = require('path');
process.env.DATA_FILE = path.join(os.tmpdir(), 'sent-' + process.pid + '.json'); process.env.ADMIN_TOKEN = 'test-admin';
const server = require('../server'), FL = require('../organiser_only/flags.json');
let base; before(() => new Promise(r => server.listen(0, '127.0.0.1', () => { base = 'http://127.0.0.1:' + server.address().port; r(); })));
after(() => server.close());
async function player() { let ck = ''; return async (p, o = {}) => { const r = await fetch(base + p, { ...o, headers: { cookie: ck, 'content-type': 'application/json', ...(o.headers || {}) }, body: o.body && JSON.stringify(o.body) }); const sc = r.headers.get('set-cookie'); if (sc) ck = sc.split(';')[0]; return [r.status, await r.json()]; }; }
const sub = (q, id, flag) => q('/api/submit', { method: 'POST', body: { id, flag } });
test('only OS-01 open at start; locked stages leak no details', async () => { const q = await player(); const [, v] = await q('/api/challenges'); assert.deepEqual(v.challenges.map(c => c.status), ['open', 'locked', 'locked', 'locked', 'locked', 'locked']); assert.equal(v.challenges[3].objective, undefined); assert.ok(!JSON.stringify(v).includes('FLAG{')); });
test('stage bypass is rejected', async () => { const q = await player(); await q('/api/challenges'); const [s] = await sub(q, 'OS-03', FL['OS-03']); assert.equal(s, 403); const [h] = await q('/api/hint', { method: 'POST', body: { id: 'OS-02', n: 1 } }); assert.equal(h, 403); });
test('incorrect and malformed flags rejected without revealing answer', async () => { const q = await player(); await q('/api/challenges'); for (const f of ['FLAG{x}', '', 'flag{sentinel_inc4721_discovered}']) { const [s, r] = await sub(q, 'OS-01', f); assert.equal(r.correct, false, String(s)); assert.ok(!JSON.stringify(r).includes('INC4721')); } const [s] = await sub(q, 'OS-01', 123); assert.equal(s, 400); });
test('full progression, whitespace trim, duplicate no double-score, hint penalties', async () => {
  const q = await player(); await q('/api/challenges'); let last;
  for (const id of Object.keys(FL)) { if (id === 'OS-02') { await q('/api/hint', { method: 'POST', body: { id, n: 1 } }); await q('/api/hint', { method: 'POST', body: { id, n: 2 } }); } const [, r] = await sub(q, id, '  ' + FL[id] + ' \n'); assert.equal(r.correct, true, id); last = r; }
  assert.equal(last.complete, true); assert.equal(last.score, 995); // 1000 - 5 (OS-02 hint 2)
  const [, d] = await sub(q, 'OS-06', FL['OS-06']); assert.equal(d.duplicate, true); assert.equal(d.score, 995);
});
test('hints must be unlocked in order; OS-06 costs 10/20', async () => { const q = await player(); await q('/api/challenges'); for (const id of Object.keys(FL).slice(0, 5)) await sub(q, id, FL[id]); const [s] = await q('/api/hint', { method: 'POST', body: { id: 'OS-06', n: 3 } }); assert.equal(s, 409); await q('/api/hint', { method: 'POST', body: { id: 'OS-06', n: 1 } }); await q('/api/hint', { method: 'POST', body: { id: 'OS-06', n: 2 } }); await q('/api/hint', { method: 'POST', body: { id: 'OS-06', n: 3 } }); const [, r] = await sub(q, 'OS-06', FL['OS-06']); assert.equal(r.challenges[5].earned, 220); });
test('player reset clears own progress; admin reset needs token and re-locks later stages', async () => {
  const q = await player(); await q('/api/challenges'); await sub(q, 'OS-01', FL['OS-01']); await sub(q, 'OS-02', FL['OS-02']);
  assert.equal((await q('/api/admin/reset', { method: 'POST', body: { id: 'OS-02' } }))[0], 403);
  assert.equal((await q('/api/admin/reset', { method: 'POST', body: { id: 'OS-02' }, headers: { 'x-admin-token': 'wrong' } }))[0], 403);
  assert.equal((await q('/api/admin/reset', { method: 'POST', body: { id: 'OS-02' }, headers: { 'x-admin-token': 'test-admin' } }))[0], 200);
  const [, v] = await q('/api/challenges'); assert.deepEqual(v.challenges.map(c => c.status).slice(0, 3), ['solved', 'open', 'locked']);
  const [, r] = await q('/api/reset', { method: 'POST', body: {} }); assert.equal(r.score, 0); assert.equal(r.challenges[0].status, 'open');
});
test('admin status protected; health ok; non-JSON POST rejected; no path traversal', async () => { const q = await player(); assert.equal((await q('/api/admin/status'))[0], 403); assert.equal((await q('/api/admin/status', { headers: { 'x-admin-token': 'test-admin' } }))[0], 200); assert.equal((await q('/api/health'))[1].flagsLoaded, true); const r = await fetch(base + '/api/submit', { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'x' }); assert.equal(r.status, 415); const t = await fetch(base + '/..%2fserver.js'); assert.ok(t.status === 403 || t.status === 404); });
test('rate limit on submissions', async () => { const q = await player(); await q('/api/challenges'); let st; for (let i = 0; i < 17; i++) [st] = await sub(q, 'OS-01', 'FLAG{nope}'); assert.equal(st, 429); });
