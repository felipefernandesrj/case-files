// Case Files public launch Worker (v1.1.0). Ports the routes of src/server.js to Cloudflare:
// static files come from Workers assets; each game is a Durable Object (atomic question budget, same pending rule as the Node server);
// one Hub Durable Object holds the caps (per-network spend and games per day, global daily spend, requests per minute), the scoreboard and the live usage log.
// The Cup key lives only in the CUP_KEY secret and is sent only to the Cup proxy.
import { DurableObject } from 'cloudflare:workers';
import pack from '../gen/pack.json';
import { friendly } from '../../src/messages.js';
import { createScoreboard, scoreFor } from '../../src/scoreboard.js';

const NEURON_USD = 0.011 / 1000;
const MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });
const langOf = (v, q) => (v === 'pt' ? 'pt' : v === 'en' ? 'en' : q);
const caseKey = (raw) => (typeof raw === 'string' && Object.prototype.hasOwnProperty.call(pack.cases, raw) ? raw : null);
const capWords = (text, max) => { if (!text) return ''; const w = text.trim().split(/\s+/); return w.length <= max ? w.join(' ') : w.slice(0, max).join(' ') + '…'; };
const day = () => new Date().toISOString().slice(0, 10);
const num = (v, d) => (Number.isFinite(Number(v)) && v !== '' && v != null ? Number(v) : d);

async function ipHash(req, env) {
  // IPv6 is bucketed by /64 (one home or phone network); the capcheck test deploy alone may name the network in a header to simulate several players
  let ip = (env.TEST_NETWORK_HEADER && req.headers.get(env.TEST_NETWORK_HEADER)) || req.headers.get('CF-Connecting-IP') || 'local';
  if (ip.includes(':')) { const parts = ip.split('::')[0].split(':'); ip = parts.slice(0, 4).join(':') + '::/64'; }
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${env.IP_SALT || 'case-files'}:${ip}`));
  return [...new Uint8Array(d)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Caps, scoreboard and live usage for the whole game (one instance, name "hub"). */
export class Hub extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env); this.env = env;
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.s = (await ctx.storage.get('state')) || { day: day(), global: 0, ip: {}, games: {}, calls: 0 };
      this.recent = [];
      this.board = createScoreboard(null);
      for (const e of (await ctx.storage.get('scores')) || []) await this.board.add(e);
    });
  }
  limits() { const e = this.env; return { player: num(e.PLAYER_CAP_USD, 0.01), global: num(e.GLOBAL_CAP_USD, 1), rpm: num(e.RPM, 50), games: num(e.GAMES_PER_IP_DAY, 40) }; }
  roll() { if (this.s.day !== day()) this.s = { day: day(), global: 0, ip: {}, games: {}, calls: 0 }; }
  async save() { await this.ctx.storage.put('state', this.s); }
  async newGame(ip) { await this.ready; this.roll(); const n = (this.s.games[ip] || 0) + 1; this.s.games[ip] = n; await this.save(); return { ok: n <= this.limits().games, n }; }
  async reserve(ip) {
    await this.ready; this.roll(); const L = this.limits(); const now = Date.now();
    if (this.s.global >= L.global) return { ok: false, code: 'daily_cap' };
    if ((this.s.ip[ip] || 0) >= L.player) return { ok: false, code: 'player_cap' };
    this.recent = this.recent.filter((t) => now - t < 60000);
    if (this.recent.length >= L.rpm) return { ok: false, code: 'rate_limited', retryAfter: Math.ceil((60000 - (now - this.recent[0])) / 1000) };
    this.recent.push(now); return { ok: true };
  }
  async record(ip, entry) {
    await this.ready; this.roll(); const usd = entry.usd || 0;
    this.s.global += usd; this.s.ip[ip] = (this.s.ip[ip] || 0) + usd; this.s.calls += 1; await this.save();
    const key = `u:${entry.at}:${crypto.randomUUID().slice(0, 8)}`; await this.ctx.storage.put(key, entry);
  }
  async usage(after = '') { const m = await this.ctx.storage.list({ prefix: 'u:', start: after ? `u:${after}~` : 'u:', limit: 1000 }); return [...m.values()]; }
  async today() { await this.ready; this.roll(); const L = this.limits(); return { day: this.s.day, spentUsd: +this.s.global.toFixed(6), calls: this.s.calls, capUsd: L.global, playerCapUsd: L.player, rpm: L.rpm, gamesPerNetwork: L.games }; }
  async addScore(e) { await this.ready; await this.board.add(e); await this.ctx.storage.put('scores', this.board.top(100)); }
  async top(n, caseId) { await this.ready; return this.board.top(n, caseId); }
  async packTop(n) { await this.ready; return this.board.packTop(n); }
}

/** One game (name = session id): history, answered and pending questions, verdict. */
export class Game extends DurableObject {
  constructor(ctx, env) { super(ctx, env); this.env = env; this.ready = ctx.blockConcurrencyWhile(async () => { this.g = (await ctx.storage.get('g')) || null; }); }
  async init(file, limited) { await this.ready; this.g = { file, history: {}, questions: 0, calls: 0, pending: 0, accused: false, found: [], limited, seen: Date.now() }; await this.ctx.storage.put('g', this.g); await this.ctx.storage.setAlarm(Date.now() + 3 * 3600 * 1000); }
  async alarm() { await this.ctx.storage.deleteAll(); this.g = null; }
  async ask({ suspectId, question, lang, ip }) {
    await this.ready; const g = this.g;
    if (!g) return [400, { error: 'bad_request', code: 'unknown_session', message: friendly('unknown_session', lang) }];
    g.seen = Date.now();
    if (g.accused) return [409, { error: 'already_accused', code: 'already_accused', message: friendly('already_accused', lang) }];
    const C = pack.cases[g.file]; const play = C.full;
    if (!play.suspects.find((s) => s.id === suspectId)) return [400, { error: 'bad_request', code: 'unknown_suspect', message: friendly('unknown_suspect', lang) }];
    if (!question || typeof question !== 'string' || !question.trim()) return [400, { error: 'bad_request', code: 'empty_question', message: friendly('empty_question', lang) }];
    if (question.length > 500) return [400, { error: 'bad_request', code: 'question_too_long', message: friendly('question_too_long', lang) }];
    if (g.limited) return [429, { error: 'too_many_games', code: 'too_many_games', message: friendly('too_many_games', lang) }];
    const budget = C.budget;
    if (g.questions + g.pending >= budget) return [409, { error: 'out_of_questions', code: 'out_of_questions', message: friendly('out_of_questions', lang), questions: g.questions, budget, left: Math.max(0, budget - g.questions) }];
    if (g.calls >= C.maxCalls) return [429, { error: 'call_cap', message: friendly('call_cap', lang), questions: g.questions }];
    g.calls += 1; g.pending += 1; // synchronous: a parallel ask sees this before any await
    const hub = this.env.HUB.get(this.env.HUB.idFromName(HUB_NAME));
    const r = await hub.reserve(ip);
    if (!r.ok) { g.calls -= 1; g.pending -= 1; const st = r.code === 'rate_limited' ? 429 : 402; return [st, { error: r.code, code: r.code, message: friendly(r.code, lang), retryAfter: r.retryAfter }]; }
    const hist = g.history[suspectId] || [];
    const messages = [{ role: 'system', content: C.prompts[lang][suspectId] }, ...hist, { role: 'user', content: question }];
    let res;
    try { res = await this.callCup(messages, `live:${g.file}:${lang}`, hub, ip); } catch (e) { res = { error: 'upstream' }; }
    g.pending -= 1;
    if (res.error) { await this.ctx.storage.put('g', g); return [res.error === 'no_capacity' ? 402 : res.error === 'rate_limited' ? 429 : res.error === 'bad_key' ? 503 : 502, { error: res.error, code: res.error, message: friendly(res.error, lang) }]; }
    const trimmed = capWords(res.text, 80);
    g.history[suspectId] = [...hist, { role: 'user', content: question }, { role: 'assistant', content: trimmed }];
    g.questions += 1;
    const lowerQ = question.toLowerCase();
    const hit = (play.clues || []).find((cl) => cl.from === suspectId && !g.found.includes(cl.id) && (cl.keywords || []).some((k) => lowerQ.includes(String(k).toLowerCase())));
    let clue = null; if (hit) { g.found.push(hit.id); clue = { id: hit.id, implicates: hit.implicates ?? null, clears: hit.clears ?? null }; }
    await this.ctx.storage.put('g', g);
    return [200, { answer: trimmed, questions: g.questions, budget, left: budget - g.questions, clue }];
  }
  async callCup(messages, purpose, hub, ip) {
    const base = (this.env.CUP_BASE_URL || 'https://qa-api.fullcup.ai/v1').replace(/\/$/, '');
    const send = () => fetch(base + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${this.env.CUP_KEY}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': 'case-files:play' }, body: JSON.stringify({ model: MODEL, messages, max_tokens: 300 }) });
    let t0 = Date.now(); let r = await send(); let body = await r.text();
    if (r.status === 429 && !body.toLowerCase().includes('capacity:empty')) { const ra = Number(r.headers.get('retry-after')); if (Number.isFinite(ra) && ra <= 8) { await new Promise((z) => setTimeout(z, ra * 1000)); t0 = Date.now(); r = await send(); body = await r.text(); } }
    let j = null; try { j = JSON.parse(body); } catch {}
    const headers = {}; for (const [k, v] of r.headers) if (/^x-fullcup-receipt/i.test(k)) headers[k] = v;
    const usd = j?.usage?.neurons ? j.usage.neurons * NEURON_USD : 0;
    await hub.record(ip, { at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: MODEL, status: r.status, ms: Date.now() - t0, usage: j?.usage || null, cost: null, usd, headers, error: r.ok ? null : (j?.error?.code || j?.error?.message || 'error') });
    if (r.ok) { const c = j?.choices?.[0]?.message?.content; return { text: typeof c === 'string' ? c : '' }; }
    const txt = String(j?.error?.code ?? j?.error?.message ?? body ?? '').toLowerCase();
    if (r.status === 401 || r.status === 403) return { error: 'bad_key' };
    if (r.status === 402 || (r.status === 429 && txt.includes('capacity:empty'))) return { error: 'no_capacity' };
    if (r.status === 429) return { error: 'rate_limited' };
    return { error: 'upstream' };
  }
  async accuse({ suspectId, player, lang }) {
    await this.ready; const g = this.g;
    if (!g) return [400, { error: 'bad_request', code: 'unknown_session', message: friendly('unknown_session', lang) }];
    if (g.accused) return [409, { error: 'bad_request', code: 'already_accused', message: friendly('already_accused', lang) }];
    const C = pack.cases[g.file]; const play = C.full; const suspect = play.suspects.find((s) => s.id === suspectId);
    if (!suspect) return [400, { error: 'bad_request', code: 'unknown_suspect', message: friendly('unknown_suspect', lang) }];
    g.accused = true; await this.ctx.storage.put('g', g);
    const correct = suspectId === play.culprit; const sc = scoreFor(correct, g.questions, C.fair);
    const playerName = typeof player === 'string' && player.trim() ? player.trim().slice(0, 24) : 'anon';
    await this.env.HUB.get(this.env.HUB.idFromName(HUB_NAME)).addScore({ player: playerName, score: sc, questions: g.questions, correct, lang, caseId: play.id });
    const culpritObj = play.suspects.find((s) => s.id === play.culprit);
    return [200, { correct, culprit: play.culprit, culpritName: culpritObj ? culpritObj.name : '', solution: play.solution?.[lang] ?? '', solutions: play.solution ?? null, accusedName: suspect.name, aftermath: correct ? null : (play.aftermath?.[suspectId] ?? null), score: sc, questions: g.questions }];
  }
}

// the launch checks wrote to hub hub (scores of the test players, synced usage); the public game starts clean on this one
const HUB_NAME = 'hub-public-1';
const SID = /^[0-9a-f-]{36}$/;
export default {
  async fetch(req, env) {
    const url = new URL(req.url); const p = url.pathname; const q = url.searchParams.get('lang') === 'pt' ? 'pt' : 'en';
    if (!p.startsWith('/api/')) return env.ASSETS.fetch(req);
    const hub = env.HUB.get(env.HUB.idFromName(HUB_NAME));
    try {
      if (req.method === 'GET') {
        if (p === '/api/status') return json(200, { mode: 'live', caseId: pack.cases[pack.defaultKey].full.id });
        if (p === '/api/cases') return json(200, { cases: pack.list[q] });
        if (p === '/api/case') { const k = caseKey(url.searchParams.get('case')) || pack.defaultKey; return json(200, pack.cases[k].public[q]); }
        if (p === '/api/costs') { const k = url.searchParams.get('case'); if (k) { const b = k === 'pack' ? pack.costLog.pack : pack.costLog.cases.find((x) => x.id === k); return b ? json(200, b) : json(404, { error: 'unknown_case' }); } return json(200, pack.costLog); }
        if (p === '/api/today') return json(200, await hub.today());
        if (p === '/api/usage') return json(200, await hub.usage(url.searchParams.get('after') || ''));
        if (p === '/api/scores') { if (url.searchParams.get('case') === 'all') return json(200, await hub.packTop(10)); const k = caseKey(url.searchParams.get('case')) || pack.defaultKey; return json(200, await hub.top(10, pack.cases[k].full.id)); }
        if (p === '/api/credits') { const c = pack.credits; return json(200, { title: typeof c.title === 'object' ? (c.title[q] || c.title.en) : c.title, backers: c.backers || [], others: Number(c.others) || 0, example: !!c.example }); }
      }
      if (req.method === 'POST') {
        let body; try { body = await req.json(); } catch { return json(400, { error: 'internal_error', message: 'bad json' }); }
        body = body && typeof body === 'object' ? body : {};
        const lang = langOf(body.lang, q); const ip = await ipHash(req, env);
        if (p === '/api/session') {
          const file = caseKey(body.case) || pack.defaultKey; const sessionId = crypto.randomUUID();
          const gate = await hub.newGame(ip);
          await env.GAME.get(env.GAME.idFromName(sessionId)).init(file, !gate.ok);
          return json(200, { sessionId, file, budget: pack.cases[file].budget });
        }
        if (p === '/api/ask' || p === '/api/accuse') {
          if (typeof body.sessionId !== 'string' || !SID.test(body.sessionId)) return json(400, { error: 'bad_request', code: 'unknown_session', message: friendly('unknown_session', lang) });
          const game = env.GAME.get(env.GAME.idFromName(body.sessionId));
          const [st, out] = p === '/api/ask' ? await game.ask({ suspectId: body.suspectId, question: body.question, lang, ip }) : await game.accuse({ suspectId: body.suspectId, player: body.player, lang });
          return json(st, out, st === 429 && out.retryAfter ? { 'Retry-After': String(out.retryAfter) } : {});
        }
      }
      return json(404, { error: 'not_found' });
    } catch (e) { return json(500, { error: 'internal_error' }); }
  },
};
