// Pre-launch LLM bot players (PO harness, not product): an LLM detective (brain model) plays real games against the game server,
// suspects answered live through the Cup key (llama-4-scout, the product path). Every key call is logged in qa/key-usage-log.json.
// Usage: node tools/llm-players.mjs <out.json> <case,...|all> <lang,...> <persona,...> [repeat]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { once } from 'node:events'; import { createServer } from '../src/server.js'; import { AsyncLocalStorage } from 'node:async_hooks';
const als = new AsyncLocalStorage(); // run 2: per-game purpose (a shared variable mislabeled calls when 4 games ran at once)
const [OUT, CS = 'all', LS = 'en,pt', PS = 'careless,average,methodical', REP = '1'] = process.argv.slice(2);
const KEY = fs.readFileSync('.fullcup-key', 'utf8').trim(); const BASE = 'https://qa-api.fullcup.ai/v1'; const BRAIN = process.env.BRAIN || '@cf/google/gemma-4-26b-a4b-it';
const LOG = 'qa/key-usage-log.json'; const log = JSON.parse(fs.readFileSync(LOG, 'utf8')); let purpose = '';
const usd = u => (u?.neurons || 0) * 0.011 / 1000; let spent = 0; const CAP = Number(process.env.CAP_USD || 0.2);
let next = 0; const GAP = Number(process.env.GAP_MS || 1150); // the key allows 60 requests per minute: space calls and honour Retry-After (first run hit 429 rate_limit_exceeded)
const logged = async (url, opts, tries = 0) => { const now = Date.now(); const slot = Math.max(now, next); next = slot + GAP; if (slot > now) await new Promise(r => setTimeout(r, slot - now)); const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  const pg = als.getStore(); log.push({ at: new Date(t0).toISOString(), purpose: pg ? `${pg}:${opts.headers['X-FullCup-Workload'] === 'case-files:qa-players' ? 'brain' : 'suspect'}`: purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  spent += usd(j?.usage); fs.writeFileSync(LOG, JSON.stringify(log, null, 1));
  if (r.status === 429 && tries < 4) { await new Promise(res => setTimeout(res, (Number(r.headers.get('retry-after')) || 6) * 1000 + 500)); return logged(url, opts, tries + 1); }
  return r; };
const SF = path.join(os.tmpdir(), `llm-scores-${Date.now()}.json`);
const server = createServer({ caseFile: 'content/case.json', scoreFile: SF, fetchImpl: logged, mock: false }); server.listen(0); await once(server, 'listening');
const P = `http://127.0.0.1:${server.address().port}/api`;
const api = (p, b) => fetch(P + p, b ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) } : undefined).then(async r => ({ s: r.status, j: await r.json() }));
const PERSONA = { careless: 'You are a careless, impatient player. You ask only 2 or 3 quick questions, often to whoever looks suspicious, and accuse on a hunch as soon as anything points at someone.',
  average: 'You are an average casual player. You ask a few sensible questions to most suspects and accuse when you feel fairly sure, usually around half of your questions.',
  methodical: 'You are a methodical detective-game fan. You question every suspect about time, place and motive, cross-check alibis against the timeline, and only accuse when the evidence clears the others. You do not waste questions.' };
async function brain(sys, user) { purpose = purpose.replace(/:suspect$/, '') + ':brain';
  const r = await logged(BASE + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': 'case-files:qa-players' }, body: JSON.stringify({ model: BRAIN, messages: [{ role: 'system', content: sys }, { role: 'user', content: user }], max_tokens: 200, chat_template_kwargs: { enable_thinking: false } }) });
  const j = await r.json().catch(() => null); const t = j?.choices?.[0]?.message?.content || ''; const m = t.match(/\{[\s\S]*\}/); try { return JSON.parse(m[0]); } catch { return null; } }
async function play(file, lang, persona) {
  const pub = (await api(`/case?case=${file}&lang=${lang}`)).j; const ses = (await api('/session', { case: file })).j; const budget = ses.budget; const t0 = Date.now();
  const sus = pub.suspects.map(s => s.id); const transcript = []; const clues = []; let left = budget, asked = 0, invalid = 0;
  const sys = `${PERSONA[persona]} You are playing a browser murder-mystery game in ${lang === 'pt' ? 'Portuguese (write your questions in Brazilian Portuguese)' : 'English'}. Each question costs one of your ${budget} questions. You get ONE accusation. Reply ONLY with JSON: {"action":"ask","suspect":"<id>","question":"<max 25 words>"} or {"action":"accuse","suspect":"<id>","reason":"<max 20 words>"}.`;
  const caseText = `CASE: ${pub.title}\n${pub.intro}\nSUSPECTS:\n${pub.suspects.map(s => `- ${s.id}: ${s.name}, ${s.role}. ${s.persona}`).join('\n')}\n${pub.rooms ? 'ROOMS: ' + pub.rooms.map(r => r.name).join(', ') + '\n' : ''}${pub.timeline ? 'TIMELINE:\n' + pub.timeline.map(t => `${t.time} ${t.stop}: ${t.event}`).join('\n') + '\n' : ''}HINTS SHOWN: ${(pub.hints || []).map(h => h.text).join(' | ')}`;
  let accused = null, reason = '';
  // run 2: the brain ignored the careless/average style and always spent the whole budget, so the harness caps questions per skill persona
  const LIMIT = { careless: 3, average: Math.ceil(budget * 0.6), methodical: budget }[persona] ?? budget;
  let forcedTry = false;
  while (!accused) {
    purpose = `prelaunch-play:${file}:${lang}:${persona}`;
    const d = await brain(sys, `${caseText}\n\nINTERROGATION SO FAR:\n${transcript.join('\n') || '(none)'}\n${clues.length ? 'SUSPICION METER: ' + clues.join('; ') : ''}\nQuestions left: ${left} of ${budget}. ${(left === 0 || asked >= LIMIT) ? 'No questions left: you must accuse now.' : ''}Your move (JSON only):`);
    if (!d || !sus.includes(d.suspect)) { invalid++; if (invalid > 2 || left === 0) { accused = sus[0]; reason = 'fallback'; } continue; }
    if (d.action !== 'accuse' && (left === 0 || asked >= LIMIT) && !forcedTry) { // run 6 finding: at the cap the brain often still sent an ask, and the harness accused that ask target (every miss in r2-r6 was such a reasonless accusation), so ask once more for an accusation only
      forcedTry = true; const f = await brain(sys, `${caseText}\n\nINTERROGATION SO FAR:\n${transcript.join('\n') || '(none)'}\n${clues.length ? 'SUSPICION METER: ' + clues.join('; ') : ''}\nYou have NO questions left. Accuse the suspect the evidence points to. Reply ONLY {\"action\":\"accuse\",\"suspect\":\"<id>\",\"reason\":\"<max 20 words>\"}:`);
      if (f && sus.includes(f.suspect)) { accused = f.suspect; reason = f.reason || 'forced'; break; } }
    if (d.action === 'accuse' || left === 0 || asked >= LIMIT) { accused = d.suspect; reason = d.reason || ''; break; }
    purpose = `prelaunch-play:${file}:${lang}:${persona}:suspect`;
    const a = await api('/ask', { sessionId: ses.sessionId, suspectId: d.suspect, question: String(d.question || '').slice(0, 300), lang }); asked++;
    if (a.s === 200) { left = a.j.left; transcript.push(`Q to ${d.suspect}: ${d.question}\nA: ${a.j.answer}`); if (a.j.clue) clues.push(`${a.j.clue.implicates ? 'evidence against ' + a.j.clue.implicates : ''}${a.j.clue.clears ? 'cleared ' + a.j.clue.clears : ''} (from ${d.suspect})`); }
    else if (a.s === 409) left = 0; else transcript.push(`(question failed: ${a.s})`);
    if (asked > budget + 3) left = 0;
  }
  const v = (await api('/accuse', { sessionId: ses.sessionId, suspectId: accused, player: `bot-${persona}`, lang })).j;
  const valid = invalid === 0 && !transcript.some(t => t.startsWith('(question failed'));
  return { valid, limit: LIMIT, run: process.env.RUN || 'r1', case: file, lang, persona, budget, questions: v.questions, accused, culprit: v.culprit, correct: v.correct, score: v.score, seconds: Math.round((Date.now() - t0) / 1000), reason, cluesFound: clues, invalidMoves: invalid, transcript };
}
const files = CS === 'all' ? ['violin', 'night-train', 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', 'gen-a-samba-school-rehearsal-in-madureira-th'] : CS.split(',');
let res = []; try { res = JSON.parse(fs.readFileSync(OUT, 'utf8')); } catch {}
const jobs = []; for (let k = 0; k < Number(REP); k++) for (const f of files) for (const l of LS.split(',')) for (const p of PS.split(',')) jobs.push([f, l, p]);
const CONC = Number(process.env.CONC || 4);
async function worker() { while (jobs.length) { if (spent > CAP) { console.log('CAP reached', spent); return; } const [f, l, p] = jobs.shift(); try { const r = await als.run(`prelaunch-play:${f}:${l}:${p}`, () => play(f, l, p)); res.push(r); fs.writeFileSync(OUT, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ f: f.slice(0, 14), l, p, q: r.questions, acc: r.accused, ok: r.correct, sc: r.score, s: r.seconds, spent: +spent.toFixed(5) })); } catch (e) { console.log('ERR', f, l, p, String(e)); } } }
await Promise.all(Array.from({ length: CONC }, worker));
console.log('spent', spent.toFixed(5)); server.close(); process.exit(0);
