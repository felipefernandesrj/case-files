// M2 sprint 3 live smoke (regression after the friendly unknown case error) (PO harness, not product): Night Train loaded by id (flag caseId) through the game server, PT asks via the Cup key; logs status/usage/headers (never the key).
import fs from 'node:fs'; import { once } from 'node:events'; import { createServer } from '../src/server.js'; import { loadCase } from '../src/case.js';
const nt = loadCase('content/cases/night-train.json'); const names = nt.suspects.map(s => s.name.split(' ')[0]);
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); const out = []; let purpose = '';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const server = createServer({ caseFile: 'content/case.json', caseId: 'night-train', scoreFile: null, fetchImpl, mock: false }); server.listen(0); await once(server, 'listening');
const P = `http://localhost:${server.address().port}/api`; const post = (p, b) => fetch(P + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async r => ({ status: r.status, body: await r.json() }));
const st = await fetch(P + '/status').then(r => r.json()); out.push({ status: st });
const sid = (await post('/session', {})).body.sessionId;
const steps = [['victor', 'Onde você estava quando as luzes apagaram no túnel?']];
for (const [s, q] of steps) { purpose = `m2s3-smoke:pt:${s}`;
  const a = await post('/ask', { sessionId: sid, suspectId: s, question: q, lang: 'pt' }); const last = log.at(-1); const ans = a.body.answer || a.body.message || '';
  out.push({ lang: 'pt', suspect: s, q, status: a.status, questions: a.body.questions, answer: ans, words: ans.split(/\s+/).length, ptHint: /\b(não|você|eu|estava|cofre|chave|cozinha|vagão)\b/i.test(ans), confesses: s === nt.culprit ? /(peguei|roubei|eu tirei|escondi o colar)/i.test(ans) : null, namesOutsideCast: (ans.match(/\b[A-ZÁÉÍÓÚ][a-záéíóúâêôãõç]+\b/g) || []).filter(w => !names.includes(w)), upstreamMs: last.ms, receipt: last.headers['x-fullcup-receipt-id'], dupHeader: last.headers['x-fullcup-receipt'] === last.headers['x-fullcup-receipt-id'], sealBy: last.headers['x-fullcup-seal-by'], cost: last.cost, model: last.model, usage: last.usage }); }
const v = await post('/accuse', { sessionId: sid, suspectId: nt.culprit, player: 'm2s3-smoke', lang: 'pt' }); out.push({ accuse: v.status, correct: v.body.correct, culpritName: v.body.culpritName, score: v.body.score, questions: v.body.questions });
server.close(); fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(log, null, 1)); fs.writeFileSync('qa/live-smoke-m2s3.json', JSON.stringify(out, null, 1)); console.log(JSON.stringify(out, null, 1));
