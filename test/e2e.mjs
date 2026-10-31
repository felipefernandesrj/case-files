import assert from 'node:assert/strict';
process.env.MOCK = '1';
const { createServer, mapError } = await import('../src/server.js');
const { CASE, fairPlay } = await import('../src/case.js');
const { mockAnswer } = await import('../src/mock.js');
const srv = createServer({ scoreFile: null }).listen(0); await new Promise(r => srv.once('listening', r));
const B = `http://127.0.0.1:${srv.address().port}`; let n = 0;
const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };
const post = (p, b, lang = 'en') => fetch(`${B}${p}?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const J = async r => (await r).json();
try {
  await t('status mock', async () => assert.equal((await J(fetch(B + '/api/status'))).mode, 'mock'));
  await t('case hides culprit', async () => { const c = await J(fetch(B + '/api/case')); assert.equal(c.suspects.length, 3); assert(!/culprit|facts|solution|clues/.test(JSON.stringify(c))); });
  await t('case in PT-BR', async () => { const c = await J(fetch(B + '/api/case?lang=pt')); assert.equal(c.title, 'O Livro do Farol'); assert.equal(c.suspects[1].role, 'faroleiro'); });
  await t('ui served with EN+PT', async () => { const h = await (await fetch(B + '/')).text(); assert.match(h, /Caso em 3 Atos/); assert.match(h, /Placar/); assert.match(h, /Scoreboard/); });
  await t('fair-play check passes', async () => assert.deepEqual(fairPlay(), { ok: true, errors: [] }));
  await t('fair-play rejects unsolvable case', async () => assert.equal(fairPlay({ ...CASE, clues: CASE.clues.filter(k => k.implicates !== CASE.culprit || k.from === 'marta') }).ok, false));
  await t('every clue is reachable by its ask', async () => { for (const k of CASE.clues) for (const l of ['en', 'pt']) assert.doesNotMatch(mockAnswer(k.from, k.ask, l), /nothing more|Não tenho/); });
  await t('bad request 400', async () => assert.equal((await post('/api/ask', { suspectId: 'x', question: '' })).status, 400));
  for (const lang of ['en', 'pt']) await t(`plays case to solution (${lang})`, async () => {
    const { sessionId } = await J(post('/api/session', {}));
    const ask = async (id, q) => (await J(post('/api/ask', { suspectId: id, question: q, sessionId }, lang))).answer;
    const lantern = await ask('tomas', lang === 'pt' ? 'O que você viu às 23h?' : 'What did you see at 23:00?');
    const soot = await ask('lia', lang === 'pt' ? 'Notou algo na Marta?' : 'Did you notice anything about Marta?');
    const alibi = await ask('marta', lang === 'pt' ? 'Onde você estava à noite?' : 'Where were you last night?');
    assert.match(lantern, /lantern|lanterna/); assert.match(soot, /soot|fuligem/); assert.match(alibi, /home|casa/);
    // Deduction from clues: the suspect implicated by the soot testimony is named in it.
    const accused = CASE.suspects.find(s => soot.includes(s.name.split(' ')[0]) && s.id !== 'lia').id;
    const v = await J(post('/api/accuse', { suspectId: accused, sessionId, player: `bot-${lang}` }, lang));
    assert.equal(v.correct, true); assert.equal(v.score, 100); assert.match(v.solution, lang === 'pt' ? /contadora/ : /bookkeeper/);
    assert.equal((await post('/api/accuse', { suspectId: accused, sessionId }, lang)).status, 409);
  });
  await t('wrong accusation scores 0', async () => { const { sessionId } = await J(post('/api/session', {})); const v = await J(post('/api/accuse', { suspectId: 'lia', sessionId, player: 'x' })); assert.equal(v.correct, false); assert.equal(v.score, 0); });
  await t('scoreboard ranks solvers', async () => { const s = (await J(fetch(B + '/api/scoreboard'))).scores; assert.equal(s.length, 3); assert.equal(s[0].score, 100); assert.equal(s.at(-1).score, 0); });
  await t('case content authored via the Cup key', async () => { assert.match(CASE.generatedBy.via, /Cup key/); assert(CASE.generatedBy.usage.total_tokens > 0); });
  await t('402 → friendly no_capacity (EN/PT)', async () => { assert.equal(mapError(402, {}).code, 'no_capacity'); assert.match(mapError(402, {}, 'pt').error, /sem capacidade/); });
  await t('429 capacity:empty → no_capacity', async () => assert.equal(mapError(429, { error: { code: 'capacity:empty' } }).code, 'no_capacity'));
  await t('429 other → rate_limited', async () => assert.equal(mapError(429, { error: { code: 'rate_limit' } }).code, 'rate_limited'));
  await t('401 → bad_key', async () => assert.equal(mapError(401, {}).code, 'bad_key'));
  console.log(`\n${n}/${n} passed`);
} finally { srv.close(); }
