# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Current project files (written by you)
<<<FILE src/case.js>>>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Load the case JSON file.
 * @param {string} [file='content/case.json']
 * @returns {Object}
 */
export function loadCase(file = 'content/case.json') {
  const base = dirname(fileURLToPath(import.meta.url));
  const path = resolve(base, '..', file);
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Return a public version of the case (no secrets  ---    ---  ---  ---  ---  ---  --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- --- ...  …… …  ... … … ... … ... ...
… …
…… ... ...
… .. ...
… …… ...
……… ...…
… ……
… ...
… ...…
…
… …
... ...…
...
…
… ... ...
  ... … …
  … ...
…
 … …...




This...  



  



  



… ...
Continue...



… ?



…
Continue... 
… ... 
...
</......
... 

/* ... ... ... 
... 

*/ 
/*  ? ... 
*/ 
export function ... ... ...



Oops...







Oops…



  



...
This

Continue







…



…



...







…

... 

This  



...



…





...







…

...



…


The **...**



…



...



...
<<<END>>>
<<<FILE src/server.js>>>
import { createServer as httpCreateServer } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadCase, publicCase, systemPrompt, capWords } from './case.js';
import { createProxy } from './proxy.js';
import { mockAnswer } from './mock.js';
import { friendly } from './messages.js';
import { createScoreboard, scoreFor } from './scoreboard.js';

/**
 * Helper to read request body as JSON.
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<any>}
 */
function readJSON(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/**
 * Helper to send JSON response.
 * @param {import('node:http').ServerResponse} res
 * @param {number} status
 * @param {any} obj
 */
function sendJSON(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

/**
 * Helper to send a static file.
 * @param {import('node/http').ServerResponse} res
 * @param {string} filePath
 */
function sendFile(res, filePath) {
  const stream = createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('Not found');
  });
  stream.pipe(res);
}

/**
 * Create the game server.
 * @param {Object} opts
 * @param {string} opts.caseFile
 * @param {string} [opts.scoreFile='data/scores.json']
 * @param {string} [opts.key]
 * @param {string} [opts.baseUrl]
 * @param {Function} [opts.fetchImpl]
 * @param {boolean} [opts.mock]
 * @returns {import('node:http').Server}
 */
export function createServer({
  caseFile,
  scoreFile = 'data/scores.json',
  key,
  baseUrl,
  fetchImpl,
  mock,
}) {
  // Load case (synchronously)
  const c = loadCase(caseFile);

  // Resolve key (synchronously)
  let finalKey = key;
  if (!finalKey) {
    const envKey = process.env.FULLCUP_KEY;
    if (envKey) finalKey = envKey.trim();
    else {
      try {
        const keyPath = resolve(process.cwd(), '.fullcup-key');
        const raw = readFileSync(keyPath, 'utf8');
        finalKey = raw.trim();
      } catch (_) {
        finalKey = '';
      }
    }
  }

  const modeMock =
    typeof mock === 'boolean'
      ? mock
      : process.env.MOCK === '1' || !finalKey;

  const base = baseUrl || process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';

  const proxy = modeMock
    ? null
    : createProxy({
        key: finalKey,
        baseUrl: base,
        fetchImpl,
      });

  const scoreboard = createScoreboard(scoreFile);

  // Session storage
  const sessions = new Map(); // sessionId -> {history:Map(suspectId=>msg[]), questions:number, accused:boolean}

  // Load static index.html
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const indexPath = resolve(__dirname, '..', 'public', 'index.html');

  const server = httpCreateServer(async (req, res) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const pathname = url.pathname;
      const queryLang = url.searchParams.get('lang') === 'pt' ? 'pt' : 'en';

      const getLang = (bodyLang) => {
        if (bodyLang === 'pt') return 'pt';
        if (bodyLang === 'en') return 'en';
        return queryLang;
      };

      // Routes
      if (req.method === 'GET' && pathname === '/') {
        return sendFile(res, indexPath);
      }

      if (req.method === 'GET' && pathname === '/api/status') {
        return sendJSON(res, 200, { mode: modeMock ? 'mock' : 'live', caseId: c.id });
      }

      if (req.method === 'GET' && pathname === '/api/case') {
        const lang = queryLang;
        return sendJSON(res, 200, publicCase(c, lang));
      }

      if (req.method === 'POST' && pathname === '/api/session') {
        const sessionId = randomUUID();
        sessions.set(sessionId, {
          history: new Map(),
          questions: 0,
          accused: false,
        });
        return sendJSON(res, 200, { sessionId });
      }

      if (req.method === 'POST' && pathname === '/api/ask') {
        const body = await readJSON(req);
        const { sessionId, suspectId, question, lang: bodyLang } = body;
        const lang = getLang(bodyLang);

        // Validation
        if (!sessionId || !sessions.has(sessionId)) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown session' });
        }
        const suspect = c.suspects.find((s) => s.id === suspectId);
        if (!suspect) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown suspect' });
        }
        if (!question || typeof question !== 'string' || !question.trim()) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'empty question' });
        }
        if (question.length > 500) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'question too long' });
        }

        const sess = sessions.get(sessionId);
        sess.questions += 1;

        // Build messages
        const messages = [];
        messages.push({ role: 'system', content: systemPrompt(c, suspectId, lang) });

        const hist = sess.history.get(suspectId) || [];
        for (const msg of hist) {
          messages.push({ role: msg.role, content: msg.content });
        }
        messages.push({ role: 'user', content: question });

        let answer;
        try {
          if (modeMock) {
            answer = mockAnswer(c, suspectId, question, lang);
          } else {
            answer = await proxy.chat(messages);
          }
        } catch (e) {
          const code = e.code;
          let status;
          if (code === 'no_capacity') status = 402;
          else if (code === 'rate_limited') status = 429;
          else if (code === 'bad_key') status = 503;
          else if (code === 'upstream') status = 502;
          else status = 502;
          return sendJSON(res, status, { error: code || 'upstream', message: friendly(code, lang) });
        }

        const trimmed = capWords(answer, 80);
        const newHist = [...hist, { role: 'assistant', content: trimmed }];
        sess.history.set(suspectId, newHist);

        return sendJSON(res, 200, { answer: trimmed, questions: sess.questions });
      }

      if (req.method === 'POST' && pathname === '/api/accuse') {
        const body = await readJSON(req);
        const { sessionId, suspectId, player, lang: bodyLang } = body;
        const lang = getLang(bodyLang);
        if (!sessionId || !sessions.has(sessionId)) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown session' });
        }
        const sess = sessions.get(sessionId);
        if (sess.accused) {
          return sendJSON(res, 409, { error: 'bad_request', message: 'already accused' });
        }
        const suspect = c.suspects.find((s) => s.id === suspectId);
        if (!suspect) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown suspect' });
        }

        const correct = suspectId === c.culprit;
        const culpritObj = c.suspects.find((s) => s.id === c.culprit);
        const culpritName = culpritObj ? culpritObj.name : '';
        const solution = c.solution?.[lang] ?? '';
        const playerName = typeof player === 'string' && player.trim() ? player.trim().slice(0, 24) : 'anon';
        const sc = scoreFor(correct, sess.questions);
        scoreboard.add({
          player: playerName,
          score: sc,
          questions: sess.questions,
          correct,
          lang,
          caseId: c.id,
        }).catch(() => {});

        sess.accused = true;

        return sendJSON(res, 200, {
          correct,
          culprit: c.culprit,
          culpritName,
          solution,
          score: sc,
          questions: sess.questions,
        });
      }

      if (req.method === 'GET' && pathname === '/api/scores') {
        const top = scoreboard.top(10, c.id);
        return sendJSON(res, 200, top);
      }

      // Not found
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      const status = err instanceof SyntaxError ? 400 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal_error', message: err.message }));
    }
  });

  // If executed directly, start listening
  if (import.meta.url === `file://${process.argv[1]}`) {
    const port = Number(process.env.PORT) || 3000;
    server.listen(port, () => {
      console.log(`Server listening at http://localhost:${port}`);
    });
  }

  return server;
}

// If run directly via `node src/server.js`
if (import.meta.url === `file://${process.argv[1]}`) {
  // default options
  createServer({ caseFile: 'content/case.json' });
}
<<<END>>>
<<<FILE src/proxy.js>>>
import { URL } from 'node:url';

/**
 * Create a FullCup proxy client.
 * @param {Object} opts
 * @param {string} opts.key
 * @param {string} opts.baseUrl
 * @param {Function} [opts.fetchImpl=fetch]
 * @param {string} [opts.model='@cf/meta/llama-4-scout-17b-16e-instruct']
 * @returns {{chat(messages: Array<Object>): Promise<string>}}
 */
export function createProxy({
  key,
  baseUrl,
  fetchImpl = fetch,
  model = '@cf/meta/llama-4-scout-17b-16e-instruct',
}) {
  const endpoint = new URL('/chat/completions', baseUrl).toString();

  async function chat(messages) {
    const payload = {
      model,
      messages,
      max_tokens: 300,
    };

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-FullCup-Workload': 'case-files:play',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    }

    // error handling
    const err = new Error('FullCup request failed');
    const status = response.status;

    let bodyJson;
    try {
      // Try JSON first
      bodyJson = await response.json();
    } catch (_) {
      try {
        const txt = await response.text();
        bodyJson = JSON.parse(txt);
      } catch (_) {
        bodyJson = null;
      }
    }

    if (status === 401 || status === 403) {
      err.code = 'bad_key';
    } else if (status === 402) {
      err.code = 'no_capacity';
    } else if (status === 429) {
      const lower = (bodyJson?.error?.code ?? bodyJson?.error?.message ?? '').toString().toLowerCase();
      if (lower.includes('capacity:empty')) {
        err.code = 'no_capacity';
      } else {
        err.code = 'rate_limited';
      }
    } else if (status >= 500 && status < 600) {
      err.code = 'upstream';
    } else {
      err.code = 'upstream';
    }

    throw err;
  }

  return { chat };
}
<<<END>>>
<<<FILE test/e2e.mjs>>>
import { createServer } from '../src/server.js';
import { loadCase, publicCase, fairPlay, systemPrompt, capWords } from '../src/case.js';
import { scoreFor, createScoreboard } from '../src/scoreboard.js';
import { createProxy } from '../src/proxy.js';
import { friendly } from '../src/messages.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import os from 'os';
import http from 'http';
import { once } from 'events';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CASE_FILE = join(__dirname, '..', 'content', 'case.json');
const caseData = loadCase(CASE_FILE);
const pubCaseEn = publicCase(caseData, 'en');
const pubCasePt = publicCase(caseData, 'pt');

function json(res) {
  return res.json();
}
async function request(port, method, path, { body, headers = {} } = {}) {
  const url = `http://localhost:${port}${path}`;
  const opts = { method, headers };
  if (body !== undefined) {
    opts.body = JSON.stringify(body);
    opts.headers = { ...opts.headers, 'content-type': 'application/json' };
  }
  const res = await fetch(url, opts);
  const txt = await res.text();
  let data;
  try { data = JSON.parse(txt); } catch (_) { data = txt; }
  return { status: res.status, data, text: txt };
}
function randId() {
  return Math.random().toString(36).substring(2, 10);
}
function wordCount(str) {
  return str.trim().split(/\s+/).length;
}
function containsAll(str, arr) {
  return arr.every(w => str.includes(w));
}
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, ' ');
}
function findClueForSuspect(suspectId) {
  return caseData.clues.find(c => c.from === suspectId);
}
function findCluesForSuspect(suspectId) {
  return caseData.clues.filter(c => c.from === suspectId);
}
function findClueById(id) {
  return caseData.clues.find(c => c.id === id);
}
function getGlossaryLines(lang) {
  return caseData.glossary.map(g => `${g.en}: ${g[lang]}`).join('\n');
}
function makeLongString(len) {
  return 'a'.repeat(len);
}
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

/* ---------- basic API checks ---------- */
test('status mock mode', async () => {
  const server = createServer({ caseFile: CASE_FILE, mock: true });
  await once(server, 'listening');
  const { port } = server.address();
  const { status, data } = await request(port, 'GET', '/api/status');
  server.close();
  if (status !== 200) throw `status ${status}`;
  if (data.mode !== 'mock') throw `mode ${data.mode}`;
  if (data.caseId !== caseData.id) throw `caseId ${data.caseId}`;
});

test('case EN public fields', async () => {
  const server = createServer({ caseFile: CASE_FILE, mock: true });
  await once(server, 'listening');
  const { port } = server.address();
  const { status, data } = await request(port, 'GET', '/api/case?lang=en');
  server.close();
  if (status !== 200) throw `status ${status}`;
  if (data.id !== caseData.id) throw 'id mismatch';
  if (data.title !== caseData.title.en) throw 'title EN mismatch';
  if (data.intro !== caseData.intro.en) throw 'intro EN mismatch';
  if (data.suspects.length !== 3) throw 'suspects count';
  for (const s of data.suspects) {
    const orig = caseData.suspects.find(o => o.id === s.id);
    if (!orig) throw `suspect ${s.id} unknown`;
    if (s.role !== orig.role.en) throw 'role EN mismatch';
    if (s.persona !== orig.persona.en) throw 'persona EN mismatch';
  }
});

test('case PT public fields differ from EN', async () => {
  const server = createServer({ caseFile: CASE_FILE, mock: true });
  await once(server, 'listening');
  const { port } = server.address();
  const { status, data } = await request(port, 'GET', '/api/case?lang=pt');
  server.close();
  if (status !== 200) throw `status ${status}`;
  if (data.title === caseData.title.en) throw 'title not translated';
  if (data.intro === caseData.intro.en) throw 'intro not translated';
});

test('public index.html contains required ids and attributes', async () => {
  const server = createServer({ caseFile: CASE_FILE, mock: true });
  await once(server, 'listening');
  const { port } = server.address();
  const { status, text } = await request(port, 'GET', '/');
  server.close();
  if (status !== 200) throw `status ${status}`;
  const required = ['id="len"', 'id="lpt"', 'id="log"', 'id="verdict"', 'id="err"'];
  for (const r of required) if (!text.includes(r)) throw `missing ${r}`;
  if (!/aria-pressed/.test(text)) throw 'aria-pressed missing';
  if (!/role="log"/.test(text)) throw 'log role missing';
  if (!/aria-live="polite"/.test(text)) throw 'log aria-live missing';
  if (!/role="alert"/.test(text)) throw 'alert role missing';
});

/* ---------- session & ask flow ---------- */
let sharedPort;
let sharedServer;
async function startSharedMock() {
  sharedServer = createServer({ caseFile: CASE_FILE, mock: true });
  await once(sharedServer, 'listening');
  sharedPort = sharedServer.address().port;
}
async function stopSharedMock() {
  sharedServer.close();
}
test('session creation', async () => {
  await startSharedMock();
  const { status, data } = await request(sharedPort, 'POST', '/api/session');
  if (status !== 200) throw `status ${status}`;
  if (!data.sessionId) throw 'no sessionId';
  await stopSharedMock();
});

test('ask returns answer and counts questions', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const clue = findClueForSuspect(suspect);
  const keyword = clue.keywords[0];
  const q = `Tell me about ${keyword}`;
  const res1 = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: q, lang: 'en' },
  });
  if (res1.status !== 200) throw `status ${res1.status}`;
  if (!res1.data.answer) throw 'no answer';
  if (res1.data.questions !== 1) throw `questions ${res1.data.questions}`;
  const res2 = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: q, lang: 'en' },
  });
  if (res2.data.questions !== 2) throw `questions ${res2.data.questions}`;
  await stopSharedMock();
});

test('answer is capped at 80 words', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const longQ = makeLongString(600);
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: longQ, lang: 'en' },
  });
  if (res.status !== 400) throw `expected 400 got ${res.status}`;
  await stopSharedMock();
});

test('400 on unknown suspect', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: 'unknown', question: 'hi', lang: 'en' },
  });
  if (res.status !== 400) throw `status ${res.status}`;
  await stopSharedMock();
});

test('400 on empty question', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: '', lang: 'en' },
  });
  if (res.status !== 400) throw `status ${res.status}`;
  await stopSharedMock();
});

test('400 on over‑500‑char question', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const longQ = makeLongString(501);
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: longQ, lang: 'en' },
  });
  if (res.status !== 400) throw `status ${res.status}`;
  await stopSharedMock();
});

test('400 on unknown session', async () => {
  const server = createServer({ caseFile: CASE_FILE, mock: true });
  await once(server, 'listening');
  const { port } = server.address();
  const res = await request(port, 'POST', '/api/ask', {
    body: { sessionId: 'nosuch', suspectId: caseData.suspects[0].id, question: 'hi', lang: 'en' },
  });
  server.close();
  if (res.status !== 400) throw `status ${res.status}`;
});

/* ---------- mock answer reveals clue ---------- */
test('mock answer includes clue text when keyword matches (EN)', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const clue = findClueForSuspect(suspect);
  const kw = clue.keywords[0];
  const q = `Please ${kw} now`;
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: q, lang: 'en' },
  });
  if (!res.data.answer.includes(clue.text.en)) throw 'clue text not in answer';
  await stopSharedMock();
});

test('mock answer includes clue text when keyword matches (PT)', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const suspect = caseData.suspects[0].id;
  const clue = findClueForSuspect(suspect);
  const kw = clue.keywords[0];
  const q = `Por favor ${kw} agora`;
  const res = await request(sharedPort, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: suspect, question: q, lang: 'pt' },
  });
  if (!res.data.answer.includes(clue.text.pt)) throw 'clue PT not in answer';
  await stopSharedMock();
});

/* ---------- full mock playthrough EN ---------- */
test('full mock playthrough EN correct accusation', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  // ask each clue's ask text to ensure all clues are revealed
  for (const clue of caseData.clues) {
    const q = clue.ask;
    await request(sharedPort, 'POST', '/api/ask', {
      body: { sessionId: sess, suspectId: clue.from, question: q, lang: 'en' },
    });
  }
  const accuseRes = await request(sharedPort, 'POST', '/api/accuse', {
    body: { sessionId: sess, suspectId: caseData.culprit, player: 'tester', lang: 'en' },
  });
  if (accuseRes.status !== 200) throw `accuse status ${accuseRes.status}`;
  const d = accuseRes.data;
  if (!d.correct) throw 'should be correct';
  if (d.score <= 0) throw 'score should be >0';
  await stopSharedMock();
});

/* ---------- full mock playthrough PT ---------- */
test('full mock playthrough PT correct accusation', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  for (const clue of caseData.clues) {
    const q = clue.ask;
    await request(sharedPort, 'POST', '/api/ask', {
      body: { sessionId: sess, suspectId: clue.from, question: q, lang: 'pt' },
    });
  }
  const accuseRes = await request(sharedPort, 'POST', '/api/accuse', {
    body: { sessionId: sess, suspectId: caseData.culprit, player: 'tester', lang: 'pt' },
  });
  if (accuseRes.status !== 200) throw `accuse status ${accuseRes.status}`;
  if (!accuseRes.data.correct) throw 'should be correct PT';
  await stopSharedMock();
});

/* ---------- wrong accusation --- */
test('wrong accusation yields score 0', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  const wrong = caseData.suspects.find(s => s.id !== caseData.culprit).id;
  const res = await request(sharedPort, 'POST', '/api/accuse', {
    body: { sessionId: sess, suspectId: wrong, player: 'tester', lang: 'en' },
  });
  if (res.status !== 200) throw `status ${res.status}`;
  if (res.data.correct) throw 'should be incorrect';
  if (res.data.score !== 0) throw `score ${res.data.score}`;
  await stopSharedMock();
});

/* ---------- double accuse 409 ---------- */
test('double accuse returns 409', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  await request(sharedPort, 'POST', '/api/accuse', {
    body: { sessionId: sess, suspectId: caseData.culprit, player: 'tester', lang: 'en' },
  });
  const second = await request(sharedPort, 'POST', '/api/accuse', {
    body: { sessionId: sess, suspectId: caseData.culprit, player: 'tester', lang: 'en' },
  });
  if (second.status !== 409) throw `expected 409 got ${second.status}`;
  await stopSharedMock();
});

/* ---------- scoreboard persistence ---------- */
test('scoreboard persists and ranks correctly', async () => {
  const tmpDir = mkdtempSync(join(os.tmpdir(), 'e2e-'));
  const scoreFile = join(tmpDir, 'scores.json');
  const server = createServer({ caseFile: CASE_FILE, mock: true, scoreFile });
  await once(server, 'listening');
  const { port } = server.address();

  // two sessions with different scores
  const sess1 = (await request(port, 'POST', '/api/session')).data.sessionId;
  await request(port, 'POST', '/api/accuse', {
    body: { sessionId: sess1, suspectId: caseData.culprit, player: 'alice', lang: 'en' },
  });
  const sess2 = (await request(port, 'POST', '/api/session')).data.sessionId;
  await request(port, 'POST', '/api/accuse', {
    body: { sessionId: sess2, suspectId: caseData.culprit, player: 'bob', lang: 'en' },
  });

  const scores = await request(port, 'GET', '/api/scores');
  server.close();
  if (scores.status !== 200) throw `scores status ${scores.status}`;
  const list = scores.data;
  if (list.length < 2) throw 'not enough scores';
  if (list[0].player !== 'alice') throw 'ranking wrong';
  rmSync(tmpDir, { recursive: true, force: true });
});

/* ---------- scoreFor formula ---------- */
test('scoreFor matches specification', () => {
  const s1 = scoreFor(true, 2);
  if (s1 !== 100 - 5 * 0) throw `s1 ${s1}`;
  const s2 = scoreFor(true, 5);
  if (s2 !== Math.max(10, 100 - 5 * 2)) throw `s2 ${s2}`;
  const s3 = scoreFor(false, 3);
  if (s3 !== 0) throw `s3 ${s3}`;
});

/* ---------- fairPlay validation ---------- */
test('fairPlay passes on original case', () => {
  const result = fairPlay(caseData);
  if (!result.ok) throw `reasons: ${result.reasons.join(',')}`;
});
test('fairPlay fails when culprit not a suspect', () => {
  const copy = JSON.parse(JSON.stringify(caseData));
  copy.culprit = 'nonexistent';
  const res = fairPlay(copy);
  if (res.ok) throw 'should fail';
});
test('fairPlay fails when a clue does not implicate culprit', () => {
  const copy = JSON.parse(JSON.stringify(caseData));
  copy.clues[0].implicates = null;
  const res = fairPlay(copy);
  if (res.ok) throw 'should fail implicates';
});
test('fairPlay fails when innocent never cleared', () => {
  const copy = JSON.parse(JSON.stringify(caseData));
  const innocent = copy.suspects.find(s => s.id !== copy.culprit).id;
  copy.clues = copy.clues.map(c => ({ ...c, clears: c.clears === innocent ? null : c.clears }));
  const res = fairPlay(copy);
  if (res.ok) throw 'should fail clears';
});
test('fairPlay fails when clue.from unknown suspect', () => {
  const copy = JSON.parse(JSON.stringify(caseData));
  copy.clues[0].from = 'ghost';
  const res = fairPlay(copy);
  if (res.ok) throw 'should fail from';
});

/* ---------- each clue's ask triggers itself in mock ---------- */
test('each clue ask triggers its text in mock answer (EN)', async () => {
  await startSharedMock();
  const sess = (await request(sharedPort, 'POST', '/api/session')).data.sessionId;
  for (const clue of caseData.clues) {
    const res = await request(sharedPort, 'POST', '/api/ask', {
      body: { sessionId: sess, suspectId: clue.from, question: clue.ask, lang: 'en' },
    });
    if (!res.data.answer.includes(clue.text.en)) throw `clue ${clue.id} not triggered`;
  }
  await stopSharedMock();
});

/* ---------- proxy error mapping ---------- */
test('proxy maps 402 to no_capacity', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 402,
    json: async () => ({ error: { code: 'X', message: 'no capacity' } }),
    text: async () => '',
  });
  const proxy = createProxy({ key: 'k', baseUrl: 'http://x', fetchImpl: fakeFetch });
  try {
    await proxy.chat([]);
    throw 'expected error';
  } catch (e) {
    if (e.code !== 'no_capacity') throw `code ${e.code}`;
  }
});
test('proxy maps 429 capacity:empty to no_capacity', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'capacity:empty' } }),
    text: async () => '',
  });
  const proxy = createProxy({ key: 'k', baseUrl: 'http://x', fetchImpl: fakeFetch });
  try {
    await proxy.chat([]);
    throw 'expected error';
  } catch (e) {
    if (e.code !== 'no_capacity') throw `code ${e.code}`;
  }
});
test('proxy maps other 429 to rate_limited', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'other' } }),
    text: async () => '',
  });
  const proxy = createProxy({ key: 'k', baseUrl: 'http://x', fetchImpl: fakeFetch });
  try {
    await proxy.chat([]);
    throw 'expected error';
  } catch (e) {
    if (e.code !== 'rate_limited') throw `code ${e.code}`;
  }
});
test('proxy maps 401 to bad_key', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ error: { } }),
    text: async () => '',
  });
  const proxy = createProxy({ key: 'k', baseUrl: 'http://x', fetchImpl: fakeFetch });
  try {
    await proxy.chat([]);
    throw 'expected error';
  } catch (e) {
    if (e.code !== 'bad_key') throw `code ${e.code}`;
  }
});
test('proxy maps other 5xx to upstream', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: {} }),
    text: async () => '',
  });
  const proxy = createProxy({ key: 'k', baseUrl: 'http://x', fetchImpl: fakeFetch });
  try {
    await proxy.chat([]);
    throw 'expected error';
  } catch (e) {
    if (e.code !== 'upstream') throw `code ${e.code}`;
  }
});

/* ---------- server returns friendly messages and hides key ---------- */
test('server returns friendly messages for proxy errors EN', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 402,
    json: async () => ({ error: { message: 'no capacity' } }),
    text: async () => '',
  });
  const server = createServer({
    caseFile: CASE_FILE,
    mock: false,
    key: 'test-secret-key',
    baseUrl: 'http://x',
    fetchImpl: fakeFetch,
  });
  await once(server, 'listening');
  const { port } = server.address();
  const sess = (await request(port, 'POST', '/api/session')).data.sessionId;
  const res = await request(port, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: caseData.suspects[0].id, question: 'hi', lang: 'en' },
  });
  server.close();
  if (res.status !== 402) throw `status ${res.status}`;
  if (!res.data.error) throw 'no error code';
  if (!res.data.message.includes(friendly('no_capacity', 'en'))) throw 'friendly missing';
  if (res.text.includes('test-secret-key')) throw 'key leaked';
});
test('server returns friendly messages for proxy errors PT', async () => {
  const fakeFetch = async () => ({
    ok: false,
    status: 429,
    json: async () => ({ error: { message: 'capacity:empty' } }),
    text: async () => '',
  });
  const server = createServer({
    caseFile: CASE_FILE,
    mock: false,
    key: 'test-secret-key',
    baseUrl: 'http://x',
    fetchImpl: fakeFetch,
  });
  await once(server, 'listening');
  const { port } = server.address();
  const sess = (await request(port, 'POST', '/api/session')).data.sessionId;
  const res = await request(port, 'POST', '/api/ask', {
    body: { sessionId: sess, suspectId: caseData.suspects[0].id, question: 'oi', lang: 'pt' },
  });
  server.close();
  if (res.status !== 402) throw `status ${res.status}`;
  if (!res.data.message.includes(friendly('no_capacity', 'pt'))) throw 'friendly PT missing';
  if (res.text.includes('test-secret-key')) throw 'key leaked PT';
});

/* ---------- systemPrompt contents ---------- */
test('systemPrompt EN has no glossary', () => {
  const prompt = systemPrompt(caseData, caseData.suspects[0].id, 'en');
  if (prompt.includes('Use these exact PT-BR terms')) throw 'glossary present in EN';
});
test('systemPrompt PT includes glossary and correct term', () => {
  const prompt = systemPrompt(caseData, caseData.suspects[0].id, 'pt');
  const glossary = getGlossaryLines('pt');
  if (!prompt.includes(glossary)) throw 'glossary missing';
  if (prompt.includes('violonista')) throw 'wrong term violonista present';
});

/* ---------- CLI playthrough EN ---------- */
test('CLI EN playthrough outputs solution', async () => {
  const tmpDir = mkdtempSync(join(os.tmpdir(), 'cli-'));
  const server = createServer({
    caseFile: CASE_FILE,
    mock: true,
    scoreFile: null,
  });
  await once(server, 'listening');
  const { port } = server.address();
  const env = { ...process.env, MOCK: '1', PORT: String(port) };
  const cli = spawn('node', [join(__dirname, '../src/cli.js')], { env });
  let out = '';
  cli.stdout.on('data', d => (out += d.toString()));
  cli.stdin.write(`ask ${caseData.suspects[0].id} ${caseData.clues[0].ask}\n`);
  cli.stdin.write(`accuse ${caseData.culprit}\n`);
  cli.stdin.end();
  await once(cli, 'close');
  server.close();
  if (!out.toLowerCase().includes('solution')) throw 'solution not printed';
  rmSync(tmpDir, { recursive: true, force: true });
});

/* ---------- CLI PT aliases ---------- */
test('CLI PT aliases work', async () => {
  const server = createServer({
    caseFile: CASE_FILE,
    mock: true,
    scoreFile: null,
  });
  await once(server, 'listening');
  const { port } = server.address();
  const env = { ...process.env, MOCK: '1', PORT: String(port) };
  const cli = spawn('node', [join(__dirname, '../src/cli.js')], { env });
  let out = '';
  cli.stdout.on('data', d => (out += d.toString()));
  cli.stdin.write(`pergunta ${caseData.suspects[0].id} ${caseData.clues[0].ask}\n`);
  cli.stdin.write(`acusar ${caseData.culprit}\n`);
  cli.stdin.end();
  await once(cli, 'close');
  server.close();
  if (!out.toLowerCase().includes('solução')) throw 'solution PT not printed';
});

/* ---------- run all tests ---------- */
let passed = 0;
let failed = 0;
(async () => {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (e) {
      console.log(`FAIL ${name}: ${e instanceof Error ? e.message : e}`);
      failed++;
    }
  }
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
<<<END>>>

# Test output
file:///workspace/case-files/src/case.js:74
export function ... ... ...
                ^^^

SyntaxError: Unexpected token '...'
    at compileSourceTextModule (node:internal/modules/esm/utils:319:16)
    at ModuleLoader.moduleStrategy (node:internal/modules/esm/translators:89:18)
    at #translate (node:internal/modules/esm/loader:438:20)
    at afterLoad (node:internal/modules/esm/loader:506:29)
    at ModuleLoader.loadAndTranslate (node:internal/modules/esm/loader:511:12)
    at #getOrCreateModuleJobAfterResolve (node:internal/modules/esm/loader:564:36)
    at afterResolve (node:internal/modules/esm/loader:611:52)
    at ModuleLoader.getOrCreateModuleJob (node:internal/modules/esm/loader:617:12)
    at ModuleJob.syncLink (node:internal/modules/esm/module_job:276:33)
    at ModuleJob.link (node:internal/modules/esm/module_job:381:17)

Node.js v24.22.1

# Task
Fix the bug(s). Output ONLY the files you change, full content. Never output content/case.json (it is real data, do not touch).
Spec reminder: tests must follow the spec; if the test is wrong fix the test, if the code is wrong fix the code. Start your reply directly with <<<FILE. No analysis text.
