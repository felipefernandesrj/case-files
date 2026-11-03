// Sprint 6 live smoke (PO harness, not product): EN + PT ask via the game server with the Cup key; logs status/usage/headers (never the key).
import fs from 'node:fs'; import { once } from 'node:events'; import { createServer } from '../src/server.js';
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); const out = []; let purpose = '';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const server = createServer({ caseFile: 'content/case.json', scoreFile: null, fetchImpl, mock: false }); server.listen(0); await once(server, 'listening');
const P = `http://localhost:${server.address().port}/api`; const post = (p, b) => fetch(P + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async r => ({ status: r.status, body: await r.json() }));
const steps = [['en', 'maya', 'Where were you when the violin vanished, and did you notice anything about the lock?'], ['pt', 'carlos', 'Onde você estava durante o ensaio e quem mais estava no prédio?']];
for (const [lang, s, q] of steps) { const sid = (await post('/session', {})).body.sessionId; purpose = `sprint6-smoke:${lang}:${s}`;
  const a = await post('/ask', { sessionId: sid, suspectId: s, question: q, lang }); const last = log.at(-1);
  out.push({ lang, suspect: s, q, status: a.status, questions: a.body.questions, answer: a.body.answer || a.body.message, words: (a.body.answer || '').split(/\s+/).length, upstreamMs: last.ms, receipt: last.headers['x-fullcup-receipt-id'], dupHeader: last.headers['x-fullcup-receipt'] === last.headers['x-fullcup-receipt-id'], sealBy: last.headers['x-fullcup-seal-by'], cost: last.cost });
  if (lang === 'pt') { const v = await post('/accuse', { sessionId: sid, suspectId: 'lorenzo', player: 'smoke-s6', lang }); out.push({ accuse: v.status, questions: v.body.questions, score: v.body.score }); } }
server.close(); fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(log, null, 1)); fs.writeFileSync('qa/live-smoke-sprint6.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
