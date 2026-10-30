import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CASE, publicCase } from './case.js';
import { mockAnswer } from './mock.js';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const BASE = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';
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
  const r = await fetch(`${BASE}/models`, { headers: { Authorization: `Bearer ${key}` } });
  const ids = ((await r.json()).data || []).map(m => m.id).filter(id => id.startsWith('@cf/'));
  modelCache = ids.find(id => /instruct/i.test(id)) || ids.find(id => /llama/i.test(id)) || ids[0];
  return modelCache;
}

export function mapError(status, body) {
  const s = JSON.stringify(body || {});
  if (status === 402 || (status === 429 && /capacity[:_ ]?empty/i.test(s)))
    return { code: 'no_capacity', error: 'This case has run out of interrogation time: the Cup funding it has no capacity left. Come back after it is topped up.' };
  if (status === 429) return { code: 'rate_limited', error: 'Too many questions at once. Wait a moment and ask again.' };
  return { code: 'upstream_error', error: 'The suspect stares blankly. (The model service failed; try again.)' };
}

async function ask(key, s, question, history) {
  if (!key) return { answer: mockAnswer(s.id, question) };
  if (process.env.MOCK_STATUS) { // test hook: simulate upstream status
    const st = +process.env.MOCK_STATUS; return { status: 502, ...mapError(st, { error: { code: process.env.MOCK_CODE } }) };
  }
  const messages = [
    { role: 'system', content: `You are ${s.name}, ${s.role}, a suspect in "${CASE.title}". ${CASE.intro} Personality: ${s.persona} Hidden facts: ${s.facts} Stay in character, answer in 1-3 sentences, never mention being an AI.` },
    ...history.slice(-10).filter(m => ['user','assistant'].includes(m.role)).map(m => ({ role: m.role, content: String(m.content).slice(0, 500) })),
    { role: 'user', content: question }
  ];
  const r = await fetch(`${BASE}/chat/completions`, { method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': WORKLOAD },
    body: JSON.stringify({ model: await pickModel(key), messages, max_tokens: 200 }) });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) return { status: r.status === 402 || r.status === 429 ? r.status : 502, ...mapError(r.status, body) };
  return { answer: body.choices?.[0]?.message?.content?.trim() || '...' };
}

const send = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise(ok => { let d = ''; req.on('data', c => { d += c; if (d.length > 1e5) req.destroy(); }); req.on('end', () => { try { ok(JSON.parse(d || '{}')); } catch { ok({}); } }); });

export function createServer() {
  const key = loadKey();
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    try {
      if (req.method === 'GET' && url.pathname === '/api/status') return send(res, 200, { mode: key ? 'live' : 'mock', model: key ? modelCache : 'mock' });
      if (req.method === 'GET' && url.pathname === '/api/case') return send(res, 200, publicCase());
      if (req.method === 'POST' && url.pathname === '/api/ask') {
        const b = await readBody(req); const s = CASE.suspects.find(x => x.id === b.suspectId);
        const q = String(b.question || '').trim().slice(0, 500);
        if (!s || !q) return send(res, 400, { code: 'bad_request', error: 'Pick a suspect and type a question.' });
        const r = await ask(key, s, q, Array.isArray(b.history) ? b.history : []);
        return send(res, r.status || 200, r.status ? { code: r.code, error: r.error } : { answer: r.answer });
      }
      if (req.method === 'POST' && url.pathname === '/api/accuse') {
        const b = await readBody(req);
        if (!CASE.suspects.some(x => x.id === b.suspectId)) return send(res, 400, { code: 'bad_request', error: 'Unknown suspect.' });
        return send(res, 200, { correct: b.suspectId === CASE.culprit, culprit: CASE.culprit, solution: CASE.solution });
      }
      if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(root, 'public/index.html')));
      }
      send(res, 404, { error: 'not found' });
    } catch (e) { send(res, 502, { code: 'upstream_error', error: 'The suspect stares blankly. (The model service failed; try again.)' }); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +process.env.PORT || 3000;
  createServer().listen(port, () => console.log(`Caso em 3 Atos on http://localhost:${port} (${loadKey() ? 'live' : 'mock'} mode)`));
}
