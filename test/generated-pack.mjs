// M3 sprint 2: generated cases join the pack (CASES, picker, rooms, play), a cost cap per generation, testimony-style clues.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { once } from 'node:events';
import { CASES, GENERATED_DIR, generatedCases, loadCase, fileKeyOf, publicCase, listPack, roomsOf } from '../src/case.js';
import { generateCase, genMessages, validateCase, isTestimony, usageUsd, finishCase, normalizeDraft, DEFAULT_MAX_USD, NEURON_USD } from '../src/generator.js';
import { createServer } from '../src/server.js';

const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }

const genIds = Object.keys(CASES).filter((k) => k.startsWith('gen-'));
const gid = genIds[0];
const gcase = gid ? loadCase(CASES[gid]) : null;

await check('1. CASES lists the two handmade cases first, then every content/generated/gen-*.json', async () => {
  const keys = Object.keys(CASES);
  must(keys[0] === 'violin' && keys[1] === 'night-train', 'handmade first');
  must(genIds.length >= 1 && keys.length === 2 + genIds.length, 'at least one generated case in the pack');
  for (const k of genIds) {
    must(CASES[k] === `${GENERATED_DIR}/${k}.json`, `file of ${k}`);
    must(loadCase(CASES[k]).id === `case-${k}`, `id of ${k} matches its file`);
  }
  must(Object.isFrozen(CASES), 'frozen');
});

await check('2. generatedCases reads only gen-*.json and is empty for a missing folder', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gen-'));
  for (const f of ['gen-b.json', 'gen-a.json', 'notes.json', 'gen-x.txt', 'Gen-Upper.json']) fs.writeFileSync(path.join(dir, f), '{}');
  const rel = path.relative(path.resolve('.'), dir);
  must(JSON.stringify(Object.keys(generatedCases(rel))) === '["gen-a","gen-b"]', 'only gen-*.json, sorted');
  must(Object.keys(generatedCases('content/no-such-folder')).length === 0, 'missing folder');
});

await check('3. fileKeyOf and rooms of a generated case (EN and PT), no secrets in the public case', async () => {
  must(fileKeyOf(gcase) === gid, 'file key is not the violin');
  must(fileKeyOf({ id: 'case-violin-001' }) === 'violin' && fileKeyOf({ id: 'case-night-train-002' }) === 'night-train', 'handmade keys');
  must(roomsOf(gcase).length >= 3, 'rooms from the case file');
  for (const l of ['en', 'pt']) {
    const pub = publicCase(gcase, l);
    must(pub.file === gid, 'public file');
    must(pub.rooms.length === gcase.rooms.length && pub.rooms.every((r, i) => r.id === gcase.rooms[i].id && r.name === gcase.rooms[i][l]), `rooms ${l}`);
    must(pub.title === gcase.title[l], `title ${l}`);
    const txt = JSON.stringify(pub);
    must(!txt.includes('"culprit"') && !txt.includes('"facts"') && !txt.includes('aftermath'), `secrets ${l}`);
  }
  must(publicCase(loadCase(), 'en').rooms[0].id === 'academy-exterior', 'violin rooms unchanged');
});

await check('4. the picker list marks generated cases with their cost and drafts, EN and PT', async () => {
  for (const l of ['en', 'pt']) {
    const list = listPack(l);
    must(list.length === Object.keys(CASES).length, 'every case listed');
    const g = list.find((x) => x.id === gid);
    must(g && g.generated === true && g.title === gcase.title[l], `generated item ${l}`);
    must(g.cost.usd > 0 && g.cost.usd === gcase.generated.cost.usd && g.cost.drafts >= 1, `cost ${l}`);
    must(list.find((x) => x.id === 'violin').generated === false && !('cost' in list.find((x) => x.id === 'violin')), 'handmade not generated');
  }
});

await check('5. a generated case plays through the server: open, ask, wrong verdict with its newspaper, right verdict', async () => {
  const server = createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true });
  server.listen(0); await once(server, 'listening');
  const B = `http://127.0.0.1:${server.address().port}/api`;
  const post = (p, b) => fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.json() }));
  try {
    const list = await fetch(`${B}/cases?lang=pt`).then((r) => r.json());
    must(list.cases.some((x) => x.id === gid && x.generated), 'api/cases lists it');
    const pub = await fetch(`${B}/case?lang=pt&case=${gid}`).then((r) => r.json());
    must(pub.file === gid && pub.rooms.length >= 3 && pub.rooms[0].name === gcase.rooms[0].pt, 'api/case PT rooms');
    const s1 = await post('/session', { case: gid });
    must(s1.status === 200 && s1.body.budget === gcase.questionBudget, 'session budget');
    const clue = gcase.clues[0];
    const a = await post('/ask', { sessionId: s1.body.sessionId, suspectId: clue.from, question: `About ${clue.keywords[0]}?`, lang: 'en' });
    must(a.status === 200 && a.body.answer === clue.text.en, 'mock answer is the clue');
    const innocent = gcase.suspects.find((s) => s.id !== gcase.culprit).id;
    const wrong = await post('/accuse', { sessionId: s1.body.sessionId, suspectId: innocent, lang: 'pt' });
    must(wrong.status === 200 && wrong.body.correct === false && wrong.body.aftermath && wrong.body.aftermath.pt.headline === gcase.aftermath[innocent].pt.headline, 'wrong verdict newspaper');
    const s2 = await post('/session', { case: gid });
    const right = await post('/accuse', { sessionId: s2.body.sessionId, suspectId: gcase.culprit, lang: 'en' });
    must(right.status === 200 && right.body.correct === true && right.body.culprit === gcase.culprit, 'right verdict');
  } finally { server.close(); }
});

await check('6. testimony check: narration and "You find..." fail, first person and a witness talking about someone pass', async () => {
  const c = { suspects: [{ id: 'ana', name: 'Ana Reis' }, { id: 'bia', name: 'Bia Lopes' }] };
  const t = (en, pt, from = 'ana') => isTestimony({ from, text: { en, pt } }, c);
  must(t('I saw Bia by the door.', 'Eu vi a Bia na porta.'), 'first person');
  must(t('Heard it at nine, I swear.', 'Ouvi às nove, juro.'), 'pt verb without pronoun');
  must(t('Bia left early that night.', 'A Bia saiu cedo naquela noite.'), 'witness naming another suspect');
  must(!t('The floor shows traces of salt water.', 'O chão mostra vestígios de água salgada.'), 'narration');
  must(!t('You find a wrench near Bia.', 'Você encontra uma chave perto da Bia.'), 'you find');
  must(!t('Ana left early that night.', 'A Ana saiu cedo naquela noite.'), 'speaker about herself in third person');
  must(t('The girl was at the coffee station the whole time, she was busy.', 'A menina estava no café o tempo todo, ela estava ocupada.'), 'witness about someone by pronoun (live3 draft 2)');
  must(!t('The tower ladder shows no signs of tampering.', 'A escada da torre não mostra sinais de violação.'), 'a scene with no person');
  must(!isTestimony({ from: 'ana', text: { en: 'I saw it.' } }, c), 'missing pt');
  const first = JSON.parse(fs.readFileSync('qa/m3s1-probes/gen-live-1.case.json', 'utf8'));
  must(validateCase(first, { suspects: 4 }).reasons.includes('clue_not_testimony'), 'first live draft (narrated clues) rejected');
  must(first.clues.filter((cl) => !isTestimony(cl, first)).length >= 3, 'at least 3 narrated clues of the first live draft caught');
  for (const f of ['content/case.json', 'content/cases/night-train.json', CASES[gid]]) {
    const k = loadCase(f);
    must(k.clues.every((cl) => isTestimony(cl, k)), `${f} clues read as testimony`);
  }
});

await check('7. rooms check: a case without 3 to 6 rooms with en and pt names is rejected, the generated case passes', async () => {
  const live4 = JSON.parse(fs.readFileSync('qa/m3s1-probes/gen-live-4.case.json', 'utf8'));
  must(validateCase(live4, { suspects: 4 }).reasons.includes('rooms_bad'), 'no rooms');
  const rooms = [{ id: 'a', en: 'A', pt: 'A' }, { id: 'b', en: 'B', pt: 'B' }, { id: 'c', en: 'C', pt: 'C' }];
  must(!validateCase({ ...live4, rooms }, { suspects: 4 }).reasons.includes('rooms_bad'), '3 good rooms');
  for (const bad of [rooms.slice(0, 2), [...rooms, ...rooms.map((r) => ({ ...r, id: r.id + '2' })), { id: 'z', en: 'Z', pt: 'Z' }], [rooms[0], rooms[0], rooms[1]], [{ id: 'A b', en: 'x', pt: 'x' }, rooms[1], rooms[2]], [{ id: 'a', en: 'A', pt: '' }, rooms[1], rooms[2]]]) {
    must(validateCase({ ...live4, rooms: bad }, { suspects: 4 }).reasons.includes('rooms_bad'), 'bad rooms ' + JSON.stringify(bad).slice(0, 60));
  }
  must(validateCase(gcase, { suspects: gcase.suspects.length }).ok, 'the generated case passes the whole gate: ' + validateCase(gcase, { suspects: gcase.suspects.length }).reasons.join(','));
});

const replyN = (text, neurons) => ({ choices: [{ message: { content: text } }], usage: { prompt_tokens: 400, completion_tokens: 3000, neurons } });
function fake(bodies) {
  const calls = [];
  const f = async (url, opts) => { calls.push(opts); const b = bodies[Math.min(calls.length - 1, bodies.length - 1)]; return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + calls.length } }); };
  f.calls = calls; return f;
}

await check('8. cost cap: no draft starts once the next one would likely pass the cap; a zero cap makes no call', async () => {
  must(DEFAULT_MAX_USD === 0.005 && Math.abs(NEURON_USD - 0.000011) < 1e-15, 'constants');
  must(Math.abs(usageUsd({ neurons: 100 }) - 0.0011) < 1e-12 && usageUsd(null) === 0, 'usageUsd neurons');
  must(Math.abs(usageUsd({ prompt_tokens: 1000, completion_tokens: 1000 }) - 0.0006) < 1e-12, 'usageUsd tokens fallback');
  const f = fake([replyN('sorry', 200)]); // 200 neurons = US$ 0.0022 per draft
  const r = await generateCase('x', { key: 'K', fetchImpl: f, maxUsd: 0.005 });
  must(!r.ok && f.calls.length === 2 && r.attempts.length === 2, `stopped after 2 drafts, made ${f.calls.length}`);
  must(r.reasons.includes('cost_cap') && r.reasons.includes('not_json'), 'reasons keep the last check and add cost_cap');
  must(Math.abs(r.spentUsd - 0.0044) < 1e-9, 'spentUsd ' + r.spentUsd);
  const z = fake([replyN('sorry', 1)]);
  const r0 = await generateCase('x', { key: 'K', fetchImpl: z, maxUsd: 0 });
  must(!r0.ok && z.calls.length === 0 && r0.reasons.join() === 'cost_cap' && r0.spentUsd === 0, 'zero cap');
  const big = fake([replyN('sorry', 10)]);
  const r3 = await generateCase('x', { key: 'K', fetchImpl: big });
  must(big.calls.length === 3 && !r3.reasons.includes('cost_cap'), 'cheap drafts keep the 3 attempts');
});

await check('9. a kept case records its cost, drafts and receipts', async () => {
  const k = finishCase({ suspects: [1, 2, 3, 4] }, 'Seed One', 'm', [{ usage: { neurons: 100 }, receipt: 'R1' }, { usage: { neurons: 50 }, receipt: null }, { usage: { neurons: 50 }, receipt: 'R3' }]);
  must(k.id === 'case-gen-seed-one' && k.generated.cost.usd === 0.0022 && k.generated.cost.drafts === 3 && k.generated.cost.receipts.join() === 'R1,R3', JSON.stringify(k.generated));
  const g = gcase.generated;
  must(g && g.cost && g.cost.receipts.length === g.cost.drafts && g.cost.usd > 0 && g.cost.usd <= DEFAULT_MAX_USD + 0.003, 'the generated case in the pack carries its receipts and stayed near the cap');
});

await check('10. a retry sends the previous draft back to be repaired, not rewritten', async () => {
  const msgs = genMessages('x', { reasons: ['rooms_bad'], previous: '{"title":1}' });
  must(msgs.length === 4 && msgs[2].role === 'assistant' && msgs[2].content === '{"title":1}', 'previous draft as the assistant turn');
  must(msgs[3].role === 'user' && msgs[3].content.includes('rooms_bad: add "rooms"') && msgs[3].content.includes('change only what these checks need'), 'fix list after it');
  must(genMessages('x', { reasons: [], previous: '{}' }).length === 2 && genMessages('x', { reasons: ['rooms_bad'] }).length === 2, 'first try and no draft keep two messages');
  must(genMessages('x', { reasons: ['rooms_bad'], previous: 'y'.repeat(30000) })[2].content.length === 24000, 'previous draft capped');
  const f = fake([replyN('draft one {', 10), replyN('draft two {', 10)]);
  await generateCase('x', { key: 'K', fetchImpl: f });
  const b2 = JSON.parse(f.calls[1].body), b3 = JSON.parse(f.calls[2].body);
  must(b2.messages[2].content === 'draft one {' && b3.messages[2].content === 'draft two {', 'each retry carries the draft before it');
});
await check('11. normalizeDraft lifts a nested "crime": true onto its stop and flattens { en, pt } facts (live drafts 4 and 5)', async () => {
  const raw = fs.readFileSync('qa/m3s2-probes/gen-live5-draft3.txt', 'utf8');
  const before = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1));
  must(before.timeline.some((t) => t.event && t.event.crime === true) && !before.timeline.some((t) => t.crime === true), 'live5 draft 3 nests crime inside event');
  must(validateCase(JSON.parse(JSON.stringify(before)), { suspects: 4 }).reasons.includes('suspect_bad'), 'live5 draft 3 as written fails the gate (object facts)');
  const d = normalizeDraft(JSON.parse(JSON.stringify(before)));
  const crime = d.timeline.filter((t) => t.crime === true);
  must(crime.length === 1 && crime[0].who.includes(d.culprit) && d.timeline.every((t) => !('crime' in (t.event || {}))), 'crime lifted');
  must(d.suspects.every((s) => typeof s.facts === 'string' && s.facts.trim()), 'facts are strings');
  must(validateCase(d, { suspects: 4 }).ok, 'after the repair live5 draft 3 passes the whole gate');
  const keep = normalizeDraft({ timeline: [{ id: 'a', crime: false, event: { en: 'x', crime: true } }], suspects: [{ facts: 'You were here.' }] });
  must(keep.timeline[0].crime === false && !('crime' in keep.timeline[0].event) && keep.suspects[0].facts === 'You were here.', 'an explicit crime: false on the stop wins, string facts untouched');
  must(normalizeDraft(null) === null && Array.isArray(normalizeDraft([])), 'non objects pass through');
  must(validateCase({ ...gcase, suspects: gcase.suspects.map((s, i) => (i ? s : { ...s, facts: { en: s.facts } })) }, { suspects: gcase.suspects.length }).reasons.includes('suspect_bad'), 'object facts that reach the gate are rejected');
});

await check('12. an innocent cleared only by their own alibi is rejected (live drafts 6 and 7); a witness clearing them passes', async () => {
  for (const n of [6, 7]) {
    const live = JSON.parse(fs.readFileSync(`qa/m3s2-probes/gen-live${n}.case.json`, 'utf8'));
    must(validateCase(live, { suspects: 4 }).reasons.includes('clue_self_cleared_only'), `live ${n} rejected`);
  }
  for (const f of ['content/case.json', 'content/cases/night-train.json']) {
    must(!validateCase({ ...loadCase(f), rooms: [{ id: 'a', en: 'A', pt: 'A' }, { id: 'b', en: 'B', pt: 'B' }, { id: 'c', en: 'C', pt: 'C' }] }, { suspects: loadCase(f).suspects.length }).reasons.includes('clue_self_cleared_only'), `${f} (Lorenzo also has a self alibi, but Maya clears him)`);
  }
  must(!validateCase(gcase, { suspects: gcase.suspects.length }).reasons.includes('clue_self_cleared_only'), 'the generated case in the pack');
});

await check('13. the web player gives generated cases the shared plate for rooms, picker card and verdict (no violin art behind a generated verdict)', async () => {
  const html = fs.readFileSync('public/index.html', 'utf8');
  must(html.includes("const GEN_PLATE = '/assets/tex/title-rain.png';") && fs.existsSync('public/assets/tex/title-rain.png'), 'plate exists');
  must(/function locArt\(roomId\) \{ const c = artCase\(\); if \(c && c\.startsWith\('gen-'\)\) return GEN_PLATE;/.test(html), 'rooms and scene');
  must(html.includes("whenArt(item.generated ? GEN_PLATE :"), 'picker card');
  must(html.includes("vc && vc.startsWith('gen-') ? `url(${GEN_PLATE})` :"), 'verdict');
});

await check('14. the header never shrinks inside the shell (the 3-file picker at 390 squeezed it and the buttons covered the cards)', async () => {
  const css = fs.readFileSync('public/css/game.css', 'utf8');
  const rule = css.slice(css.indexOf('\nheader {'), css.indexOf('}', css.indexOf('\nheader {')));
  must(/flex-shrink:\s*0/.test(rule), 'header rule has flex-shrink: 0');
});

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`generated-pack: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
