// M2 delivery acceptance smoke (PO harness, not product): Night Train EN + PT ask via the game server with the Cup key; logs status/usage/headers (never the key).
import fs from 'node:fs'; import { once } from 'node:events'; import { createServer } from '../src/server.js';
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); const out = []; let purpose = '';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const server = await createServer({ caseFile: 'content/case.json', caseId: 'night-train', scoreFile: null, fetchImpl, mock: false }); server.listen(0); await once(server, 'listening');
const P = `http://localhost:${server.address().port}/api`; const post = (p, b) => fetch(P + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async r => ({ status: r.status, body: await r.json() }));
const steps = [['en', 'helena', 'Where were you when the train crossed midnight, and who walked past your cabin?', 'ines'], ['pt', 'victor', 'Onde você estava entre a parada das 23h e a meia-noite, e quem passou pelo corredor?', 'helena']];
for (const [lang, s, q, acc] of steps) { const ses = (await post('/session', {})).body; purpose = `m2-acceptance:${lang}:${s}`;
  const a = await post('/ask', { sessionId: ses.sessionId, suspectId: s, question: q, lang }); const last = log.at(-1);
  out.push({ lang, case: 'night-train', suspect: s, q, status: a.status, budget: a.body.budget, left: a.body.left, answer: a.body.answer || a.body.message, words: (a.body.answer || '').split(/\s+/).length, upstreamMs: last.ms, model: last.model, receipt: last.headers['x-fullcup-receipt-id'], sealBy: last.headers['x-fullcup-seal-by'], usage: last.usage });
  const v = await post('/accuse', { sessionId: ses.sessionId, suspectId: acc, player: 'm2-acceptance', lang }); out.push({ accuse: acc, status: v.status, lang, correct: v.body.correct, score: v.body.score, questions: v.body.questions, culprit: v.body.culpritName }); }
server.close(); fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(log, null, 1)); fs.writeFileSync('qa/live-smoke-m2-delivery.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
