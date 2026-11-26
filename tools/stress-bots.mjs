// Pre-launch stress bots (PO harness, not product): many scripted players against a running game server, ramping.
// Usage: node tools/stress-bots.mjs <baseUrl> <stages e.g. 10,50,100,200> <outfile>
import fs from 'node:fs';
const [BASE = 'http://127.0.0.1:3100', STAGES = '10,50,100,200', OUT = 'stress.json'] = process.argv.slice(2);
const CASES = ['violin', 'night-train', 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', 'gen-a-samba-school-rehearsal-in-madureira-th'];
const Q = { en: ['Where were you at the time?', 'Who did you see near the scene?', 'What do you know about the key?', 'Why were you upset?', 'Did anyone leave the room?', 'What time did you arrive?'],
  pt: ['Onde você estava na hora?', 'Quem você viu perto da cena?', 'O que sabe sobre a chave?', 'Por que estava chateado?', 'Alguém saiu da sala?', 'Que horas você chegou?'] };
const lat = {}; const errs = {}; const anomalies = []; let req = 0;
const rec = (ep, ms, st) => { (lat[ep] ||= []).push(ms); if (st >= 500 || st === 0) errs[ep + ':' + st] = (errs[ep + ':' + st] || 0) + 1; };
async function call(ep, method, body) { const t = performance.now(); req++;
  try { const r = await fetch(BASE + ep, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const j = await r.json().catch(() => null); rec(ep.split('?')[0], performance.now() - t, r.status); return { s: r.status, j }; }
  catch (e) { rec(ep.split('?')[0], performance.now() - t, 0); return { s: 0, j: { e: String(e) } }; } }
const pick = a => a[Math.floor(Math.random() * a.length)];
async function bot(i) { const file = CASES[i % 4]; const lang = i % 2 ? 'pt' : 'en'; const r = { file, lang, asks: 0, ok: 0, s409: 0, s429: 0, s5xx: 0 };
  const pub = (await call(`/api/case?case=${file}&lang=${lang}`, 'GET')).j; const sus = (pub?.suspects || []).map(s => s.id);
  const ses = (await call('/api/session', 'POST', { case: file })).j; const sid = ses.sessionId; const budget = ses.budget;
  // invalid inputs
  const bad = await Promise.all([call('/api/ask', 'POST', { sessionId: sid, suspectId: 'nobody', question: 'x', lang }), call('/api/ask', 'POST', { sessionId: sid, suspectId: sus[0], question: '   ', lang }), call('/api/ask', 'POST', { sessionId: sid, suspectId: sus[0], question: 'a'.repeat(600), lang }), call('/api/ask', 'POST', { sessionId: 'nope', suspectId: sus[0], question: 'hi', lang })]);
  if (bad.some(b => b.s !== 400)) anomalies.push({ bot: i, kind: 'bad-input-not-400', got: bad.map(b => b.s) });
  const burst = i % 5 === 0; let answered = 0;
  while (true) { if (burst && budget - answered <= 3) { const rs = await Promise.all(Array.from({ length: 8 }, () => call('/api/ask', 'POST', { sessionId: sid, suspectId: pick(sus), question: pick(Q[lang]), lang }))); r.asks += 8; for (const x of rs) { if (x.s === 200) { r.ok++; answered = Math.max(answered, x.j.questions); } else if (x.s === 409) r.s409++; else if (x.s === 429) r.s429++; else if (x.s >= 500) r.s5xx++; } break; }
    const x = await call('/api/ask', 'POST', { sessionId: sid, suspectId: pick(sus), question: pick(Q[lang]), lang }); r.asks++;
    if (x.s === 200) { r.ok++; answered = x.j.questions; if (x.j.left !== budget - answered) anomalies.push({ bot: i, kind: 'left-mismatch' }); } else if (x.s === 409) { r.s409++; break; } else if (x.s === 429) { r.s429++; if (x.j?.error === 'call_cap') break; } else if (x.s >= 500 || x.s === 0) { r.s5xx++; } else break;
    if (r.asks > 40) break; }
  r.answered = answered; r.budget = budget; if (r.ok > budget) anomalies.push({ bot: i, kind: 'over-budget', ok: r.ok, budget, file });
  const v = await call('/api/accuse', 'POST', { sessionId: sid, suspectId: pick(sus), player: `stress-${i}`, lang }); r.accuse = v.s; r.correct = v.j?.correct;
  const v2 = await call('/api/accuse', 'POST', { sessionId: sid, suspectId: sus[0], player: `stress-${i}`, lang }); if (v2.s !== 409) anomalies.push({ bot: i, kind: 'second-accuse-not-409', got: v2.s });
  const after = await call('/api/ask', 'POST', { sessionId: sid, suspectId: sus[0], question: 'after the verdict?', lang }); r.askAfterVerdict = after.s;
  await call('/api/session', 'POST', { case: file }); // Start over
  await Promise.all([call('/api/scores?case=all', 'GET'), call(`/api/scores?case=${file}`, 'GET'), call('/api/costs', 'GET'), call(`/api/credits?lang=${lang}`, 'GET')]);
  return r; }
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); return s.length ? +s[Math.min(s.length - 1, Math.floor(p / 100 * s.length))].toFixed(1) : null; };
const stages = []; for (const n of STAGES.split(',').map(Number)) { for (const k in lat) delete lat[k]; for (const k in errs) delete errs[k]; const a0 = anomalies.length; req = 0;
  const t0 = performance.now(); const res = await Promise.all(Array.from({ length: n }, (_, i) => new Promise(r => setTimeout(r, i * 5)).then(() => bot(i)))); const sec = (performance.now() - t0) / 1000;
  const st = { concurrent: n, seconds: +sec.toFixed(1), requests: req, rps: +(req / sec).toFixed(1), errors: { ...errs }, anomalies: anomalies.slice(a0), overBudget: res.filter(r => r.ok > r.budget).length, s429: res.reduce((a, r) => a + r.s429, 0), s5xx: res.reduce((a, r) => a + r.s5xx, 0), askAfterVerdict: [...new Set(res.map(r => r.askAfterVerdict))],
    latency: Object.fromEntries(Object.entries(lat).map(([k, v]) => [k, { n: v.length, p50: pct(v, 50), p95: pct(v, 95), max: pct(v, 100) }])) };
  stages.push(st); console.log(JSON.stringify({ n, sec: st.seconds, rps: st.rps, overBudget: st.overBudget, anomalies: st.anomalies.length, s5xx: st.s5xx, askAfterVerdict: st.askAfterVerdict, ask: st.latency['/api/ask'] })); }
fs.writeFileSync(OUT, JSON.stringify(stages, null, 1));
