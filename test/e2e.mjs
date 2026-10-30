import assert from 'node:assert/strict';
process.env.MOCK = '1';
const { createServer, mapError } = await import('../src/server.js');
const srv = createServer().listen(0); await new Promise(r => srv.once('listening', r));
const B = `http://127.0.0.1:${srv.address().port}`; let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };
const post = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
try {
  await t('status mock', async () => assert.equal((await (await fetch(B + '/api/status')).json()).mode, 'mock'));
  await t('case hides culprit', async () => { const c = await (await fetch(B + '/api/case')).json(); assert.equal(c.suspects.length, 3); const s = JSON.stringify(c); assert(!/culprit|facts|solution/.test(s)); });
  await t('ui served', async () => assert.match(await (await fetch(B + '/')).text(), /Caso em 3 Atos/));
  await t('interrogate all 3', async () => { for (const id of ['marta','tomas','lia']) { const r = await (await post('/api/ask', { suspectId: id, question: 'Where were you last night?' })).json(); assert(r.answer.length > 5); } });
  await t('clue: lia saw soot', async () => assert.match((await (await post('/api/ask', { suspectId: 'lia', question: 'Anything about Marta?' })).json()).answer, /soot/));
  await t('bad request 400', async () => assert.equal((await post('/api/ask', { suspectId: 'x', question: '' })).status, 400));
  await t('wrong accusation', async () => assert.equal((await (await post('/api/accuse', { suspectId: 'lia' })).json()).correct, false));
  await t('right accusation', async () => assert.equal((await (await post('/api/accuse', { suspectId: 'marta' })).json()).correct, true));
  await t('402 → no_capacity', async () => assert.equal(mapError(402, {}).code, 'no_capacity'));
  await t('429 capacity:empty → no_capacity', async () => assert.equal(mapError(429, { error: { code: 'capacity:empty' } }).code, 'no_capacity'));
  await t('429 other → rate_limited', async () => assert.equal(mapError(429, { error: { code: 'rate_limit' } }).code, 'rate_limited'));
  console.log(`\n${n}/11 passed`);
} finally { srv.close(); }
