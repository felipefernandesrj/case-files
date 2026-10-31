import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { CASE, publicCase, L, LANGS } from './case.js';
import { createScoreboard, scoreFor } from './scoreboard.js';
import { mockAnswer } from './mock.js';
import { call } from './fullcup.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const WORKLOAD = 'caso-em-3-atos:interrogate';

export function loadKey() {
  if (process.env.MOCK === '1') return null;
  if (process.env.FULLCUP_API_KEY) return process.env.FULLCUP_API_KEY.trim();
  const f = path.join(root, '.fullcup-key');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() || null : null;
}

let modelCache = process.env.FULLCUP_MODEL || null;
async function pickModel(key) {
  if (modelCache) return modelCache;
  const r = await call(key, 'GET', '/models', null, { purpose: 'pick-model' });
  const ids = (r.json.data || []).map(m => m.id).filter(id => id.startsWith('@cf/'));
  modelCache =  ids.find(id => /llama/i.test(id)) || ids[0];
  return modelCache;
}

const MSG = {
  no_capacity: { en: 'This case has run out of interrogation time: the Cup funding it has no capacity left. Come back after it is topped up.', pt: 'Este caso ficou sem tempo de interrogatório: a Cup que o financia está sem capacidade. Volte depois que ela for recarregada.' },
  rate_limited: { en: 'Too many questions at once. Wait a moment and ask again.', pt: 'Perguntas demais de uma vez. Espere um pouco e pergunte de novo.' },
  bad_key: { en: 'The game server key was rejected. The developer has been told; you can still play the offline case.', pt: 'A chave do servidor do jogo foi recusada. Você ainda pode jogar o caso offline.' },
  upstream_error: { en: 'The suspect stares blankly. (The model service failed; try again.)', pt: 'O suspeito fica olhando para o nada. (O serviço do modelo falhou; tente de novo.)' }
};
export function mapError(status, body, lang = 'en') {
  const s = JSON.stringify(body || {});
  const code = status === 402 || (status === 429 && /capacity[:_ ]?empty/i.test(s)) ? 'no_capacity'
    : status === 429 ? 'rate_limited' : status === 401 || status === 403 ? 'bad_key' : 'upstream_error';
  return { code, error: L(MSG[code], lang) };
}

async function ask(key, s, question, history, lang) {
  if (!key) return { answer: mockAnswer(s.id, question, lang) };
  if (process.env.MOCK_STATUS) { // test hook: simulate upstream status
    const st = +process.env.MOCK_STATUS; return { status: st === 402 || st === 429 ? st : 502, ...mapError(st, { error: { code: process.env.MOCK_CODE } }, lang) };
  }
  const messages = [
    { role: 'system', content: `You are ${s.name}, ${L(s.role, 'en')}, a suspect in "${CASE.title.en}". ${CASE.intro.en} Personality: ${s.persona.en} Hidden facts: ${s.facts} Stay in character, answer in 1-3 sentences, never mention being an AI. Answer in ${lang === 'pt' ? 'Brazilian Portuguese' : 'English'}.` },
    ...history.slice(-10).filter(m => ['user','assistant'].includes(m.role)).map(m => ({ role: m.role, content: String(m.content).slice(0, 500) })),
    { role: 'user', content: question }
  ];
  const r = await call(key, 'POST', '/chat/completions', { model: await pickModel(key), messages, max_tokens: 200 }, { workload: WORKLOAD, purpose: `interrogate:${s.id}` });
  const body = r.json;
  if (!r.ok) return { status: r.status === 402 || r.status === 429 ? r.status : 502, ...mapError(r.status, body, lang) };
  return { answer: body.choices?.[0]?.message?.content?.trim() || '...' };
}

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(ok => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });

export function createServer({ scoreFile = process.env.SCORE_FILE ?? path.join(root, 'data/scores.json') } = {}) {
  const key = loadKey();
  const board = createScoreboard(scoreFile); const sessions = new Map();
  const sess = id => { if (!sessions.has(id)) { if (sessions.size > 5000) sessions.clear(); sessions.set(id, { questions: 0, done: false }); } return sessions.get(id); };
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    const lang = LANGS.includes(url.searchParams.get('lang')) ? url.searchParams.get('lang') : 'en';
    try {
      if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { mode: key ? 'live' : 'mock', model: key ? modelCache : 'mock' });
      if (req.method === 'GET' && url.pathname === '/api/case') return send(res, 200, publicCase(lang));
      if (req.method === 'GET' && url.pathname === '/api/scoreboard') return send(res, 200, { scores: board.top(10) });
      if (req.method === 'POST' && url.pathname === '/api/session') return send(res, 200, { sessionId: randomUUID() });
      if (req.method === 'POST' && url.pathname === '/api/ask') {
        const b = await readBody(req); const s = CASE.suspects.find(x => x.id === b.suspectId);
        const q = String(b.question || '').trim().slice(0, 500);
        if (!s || !q) return send(res, 400, { code: 'bad_request', error: lang === 'pt' ? 'Escolha um suspeito e digite uma pergunta.' : 'Pick a suspect and type a question.' });
        const r = await ask(key, s, q, Array.isArray(b.history) ? b.history : [], lang);
        if (!r.status && b.sessionId) sess(String(b.sessionId)).questions++;
        return send(res, r.status || 200, r.status ? { code: r.code, error: r.error } : { answer: r.answer });
      }
      if (req.method === 'POST' && url.pathname === '/api/accuse') {
        const b = await readBody(req);
        if (!CASE.suspects.some(x => x.id === b.suspectId)) return send(res, 400, { code: 'bad_request', error: 'Unknown suspect.' });
        const correct = b.suspectId === CASE.culprit; let score = null;
        if (b.sessionId) { const st = sess(String(b.sessionId));
          if (st.done) return send(res, 409, { code: 'already_accused', error: lang === 'pt' ? 'Você já fez sua acusação.' : 'You already made your accusation.' });
          st.done = true; score = scoreFor(correct, st.questions);
          const player = String(b.player || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 24) || 'Detective';
          board.add({ player, score, questions: st.questions, correct, case: CASE.id, at: new Date().toISOString() }); }
        return send(res, 200, { correct, culprit: CASE.culprit, solution: L(CASE.solution, lang), score });
      }
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(root, 'public/index.html')));
      }
      send(res, 404, { error: 'not found' });
    } catch (e) { send(res, 502, mapError(502, {}, lang)); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`Caso em 3 Atos on http://localhost:${port} (${loadKey() ? 'live' : 'mock'} mode)`));
}
