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
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Load the case JSON file.
 * @param {string} [file='content/case.json']
 * @returns {Promise<Object>}
 */
export async function loadCase(file = 'content/case.json') {
  const base = dirname(fileURLToPath(import.meta.url));
  const path = resolve(base, '..', file);
  const data = await readFile(path, 'utf8');
  return JSON.parse(data);
}

/**
 * Return a public version of the case (no secrets) in the requested language.
 * @param {Object} c
 * @param {'en'|'pt'} lang
 * @returns {Object}
 */
export function publicCase(c, lang) {
  const suspects = c.suspects.map(s => ({
    id: s.id,
    name: s.name,
    role: s.role[lang],
    persona: s.persona[lang],
  }));
  return {
    id: c.id,
    title: c.title[lang],
    intro: c.intro[lang],
    suspects,
  };
}

/**
 * Validate the case for fair play.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c) {
  const reasons = [];

  // 3 suspects
  if (!Array.isArray(c.suspects) || c.suspects.length !== 3) {
    reasons.push('case must contain exactly 3 suspects');
  }

  const suspectIds = new Set(c.suspects.map(s => s.id));

  // culprit is a suspect
  if (!suspectIds.has(c.culprit)) {
    reasons.push('culprit must be one of the suspect ids');
  }

  // clues checks
  if (!Array.isArray(c.clues) || c.clues.length === 0) {
    reasons.push('case must contain clues');
  } else {
    // at least 2 clues implicate the culprit
    const implicating = c.clues.filter(cl => cl.implicates === c.culprit);
    if (implicating.length < 2) {
      reasons.push('at least two clues must implicate the culprit');
    }

    // every innocent cleared by at least one clue
    const innocents = c.suspects.filter(s => s.id !== c.culprit).map(s => s.id);
    for (const innocent of innocents) {
      const cleared = c.clues.some(cl => cl.clears === innocent);
      if (!cleared) {
        reasons.push(`innocent suspect ${innocent} must be cleared by at least one clue`);
      }
    }

    // each clue.from must be a suspect id and fields non‑empty
    for (const cl of c.clues) {
      if (!suspectIds.has(cl.from)) {
        reasons.push(`clue ${cl.id} has invalid from ${cl.from}`);
      }
      if (!cl.ask || typeof cl.ask !== 'string' || cl.ask.trim() === '') {
        reasons.push(`clue ${cl.id} must have a non‑empty ask`);
      }
      if (!Array.isArray(cl.keywords) || cl.keywords.length === 0) {
        reasons.push(`clue ${cl.id} must have non‑empty keywords`);
      }
      if (!cl.text?.en || typeof cl.text.en !== 'string' || cl.text.en.trim() === '') {
        reasons.push(`clue ${cl.id} must have non‑empty text.en`);
      }
      if (!cl.text?.pt || typeof cl.text.pt !== 'string' || cl.text.pt.trim() === '') {
        reasons.push(`clue ${cl.id} must have non‑empty text.pt`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Build a system prompt for the LLM.
 * @param {Object} c
 * @param {string} suspectId
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function systemPrompt(c, suspectId, lang) {
  const suspect = c.suspects.find(s => s.id === suspectId);
  if (!suspect) return '';

  const facts = suspect.facts?.trim() ?? '';
  const role = suspect.role[lang];
  const persona = suspect.persona[lang];

  let prompt = `You are ${suspect.name}, a ${role}. Persona: ${persona}.`;

  if (facts) {
    prompt += ` Facts: ${facts}.`;
  }

  // Add glossary for Portuguese
  if (lang === 'pt') {
    const lines = c.glossary.map(g => `${g.en}: ${g.pt}`);
    prompt += ` Use these exact PT-BR terms: ${lines.join(', ')}.`;
  }

  // Ensure max 80 words
  return capWords(prompt, 80);
}

/**
 * Trim a text to at most n words, adding an ellipsis if cut.
 * @param {string} text
 * @param {number} [n=80]
 * @returns {string}
 */
export function capWords(text, n = 80) {
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text.trim();
  return words.slice(0, n).join(' ') + '…';
}
<<<END>>>
<<<FILE src/scoreboard.js>>>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Compute a score.
 * @param {boolean} correct
 * @param {number} questions
 * @returns {number}
 */
export function scoreFor(correct, questions) {
  if (!correct) return 0;
  return Math.max(10, 100 - 5 * Math.max(0, questions - 3));
}

/**
 * Create a scoreboard manager.
 * @param {string|null} filePath
 * @returns {{add: Function, top: Function}}
 */
export function createScoreboard(filePath = null) {
  let entries = [];

  const load = async () => {
    if (!filePath) return;
    try {
      const data = await readFile(filePath, 'utf8');
      entries = JSON.parse(data);
    } catch (_) {
      entries = [];
    }
  };

  const persist = async () => {
    if (!filePath) return;
    try {
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
    } catch (_) {
      // ignore persistence errors
    }
  };

  // initial load
  load();

  /**
   * Add a new scoreboard entry.
   * @param {Object} param0
   * @param {string} param0.player
   * @param {number} param0.score
   * @param {number} param0.questions
   * @param {boolean} param0.correct
   * @param {'en'|'pt'} param0.lang
   * @param {string} [param0.at] ISO timestamp
   */
  async function add({ player, score, questions, correct, lang, at }) {
    const entry = {
      player,
      score,
      questions,
      correct,
      lang,
      at: at || new Date().toISOString(),
    };
    entries.push(entry);
    // keep only latest 100 after sorting
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    if (entries.length > 100) entries.length = 100;
    await persist();
  }

  /**
   * Get top N entries.
   * @param {number} [n=10]
   * @returns {Array<Object>}
   */
  function top(n = 10) {
    const sorted = [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    return sorted.slice(0, n);
  }

  return { add, top };
}
<<<END>>>
<<<FILE src/server.js>>>
import { createServer as httpCreateServer } from 'node:http';
import { createReadStream, readFile } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadCase, publicCase, systemPrompt, capWords } from './case.js';
import { createProxy } from './proxy.js';
import { mockAnswer } from './mock.js';
import { friendly } from './messages.js';
import { createScoreboard, scoreFor } from './scoreboard.js';
import { URLSearchParams } from 'node:url';

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
  res.pipe(stream);
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
 * @returns {Promise<import('node:http').Server>}
 */
export async function createServer({
  caseFile,
  scoreFile = 'data/scores.json',
  key,
  baseUrl,
  fetchImpl,
  mock,
}) {
  // Load case
  const c = await loadCase(caseFile);

  // Resolve key
  let finalKey = key;
  if (!finalKey) {
    const envKey = process.env.FULLCUP_KEY;
    if (envKey) finalKey = envKey.trim();
    else {
      try {
        const keyPath = resolve(process.cwd(), '.fullcup-key');
        const raw = await readFile(keyPath, 'utf8');
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

      // Helper to get language from body or query
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

        // Trim answer
        const trimmed = capWords(answer, 80);
        // Store in history
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
        await scoreboard.add({
          player: playerName,
          score: sc,
          questions: sess.questions,
          correct,
          lang,
        });

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
        const top = scoreboard.top(10);
        return sendJSON(res, 200, top);
      }

      // Not found
      res.writeHead(404);
      res.end('Not found');
    } catch (err) {
      // Unexpected error
      const status = err instanceof SyntaxError ? 400 : 500;
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'internal_error', message: err.message }));
    }
  });

  // If executed directly, start listening
  if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
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
<<<FILE src/cli.js>>>
import { createServer } from './server.js';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'readline';
import { randomUUID } from 'node:crypto';
import { URLSearchParams } from 'node:url';

// Helper to perform fetch with JSON body
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Parse CLI args
const args = process.argv.slice(2);
let lang = 'en';
let player = 'anon';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lang' && i + 1 < args.length) {
    lang = args[i + 1] === 'pt' ? 'pt' : 'en';
    i++;
  } else if (args[i] === '--player' && i + 1 < args.length) {
    player = args[i + 1].slice(0, 24);
    i++;
  }
}

// Start server on random port
const server = await createServer({
  caseFile: 'content/case.json',
  mock: true,
});
await new Promise((resolve) => server.listen(0, resolve));
const address = server.address();
const baseUrl = `http://localhost:${address.port}`;

// Helper to display case intro
async function displayIntro() {
  const data = await getJSON(`${baseUrl}/api/case?lang=${lang}`);
  console.log(`\n=== ${data.title} ===\n`);
  console.log(data.intro);
  console.log('\nSuspects:');
  data.suspects.forEach((s) => {
    console.log(`- ${s.id}: ${s.name} (${s.role})`);
  });
  console.log('');
}

// History storage
const histories = new Map(); // suspectId -> [{q, a}]

async function main() {
  await displayIntro();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  // Create a session
  const { sessionId } = await postJSON(`${baseUrl}/api/session`, {});

  const prompt = () => {
    rl.question('> ', async (line) => {
      const trimmed = line.trim();
      if (!trimmed) {
        return prompt();
      }
      const parts = trimmed.split(' ');
      const cmd = parts[0].toLowerCase();

      // PT aliases
      const cmdMap = {
        pergunta: 'ask',
        acusar: 'accuse',
        historico: 'history',
        sair: 'quit',
        quit: 'quit',
        ask: 'ask',
        accuse: 'accuse',
        history: 'history',
      };
      const action = cmdMap[cmd] || null;

      if (!action) {
        console.log('Unknown command');
        return prompt();
      }

      try {
        if (action === 'ask') {
          const suspectId = parts[1];
          const question = parts.slice(2).join(' ');
          if (!suspectId || !question) {
            console.log('Usage: ask <suspectId> <question>');
            return prompt();
          }
          const resp = await postJSON(`${baseUrl}/api/ask`, {
            sessionId,
            suspectId,
            question,
            lang,
          });
          console.log(`\n${resp.answer}\n`);
          const hist = histories.get(suspectId) || [];
          hist.push({ q: question, a: resp.answer });
          histories.set(suspectId, hist);
        } else if (action === 'accuse') {
          const suspectId = parts[1];
          if (!suspectId) {
            console.log('Usage: accuse <suspectId>');
            return prompt();
          }
          const resp = await postJSON(`${baseUrl}/api/accuse`, {
            sessionId,
            suspectId,
            player,
            lang,
          });
          console.log('\n=== Verdict ===');
          console.log(resp.correct ? 'Correct!' : 'Wrong.');
          console.log(`Culprit: ${resp.culpritName}`);
          console.log(`Solution: ${resp.solution}`);
          console.log(`Score: ${resp.score} (questions asked: ${resp.questions})\n`);

          // Show scoreboard
          const top = await getJSON(`${baseUrl}/api/scores`);
          console.log('--- Top Scores ---');
          top.forEach((e, idx) => {
            console.log(
              `${idx + 1}. ${e.player} - ${e.score} pts (${e.questions} Q) [${e.lang}]`,
            );
          });
          rl.close();
        } else if (action === 'history') {
          const suspectId = parts[1];
          if (!suspectId) {
            console.log('Usage: history <suspectId>');
            return prompt();
          }
          const hist = histories.get(suspectId) || [];
          if (hist.length === 0) {
            console.log('No history for this suspect.');
          } else {
            hist.forEach((pair, i) => {
              console.log(`${i + 1}. Q: ${pair.q}`);
              console.log(`   A: ${pair.a}`);
            });
          }
        } else if (action === 'quit') {
          rl.close();
        }
      } catch (e) {
        console.error('Error:', e.message);
      }

      if (!rl.closed) prompt();
    });
  };

  prompt();

  rl.on('close', () => {
    server.close();
    process.exit(0);
  });
}

await main();
<<<END>>>

# Test output

=== The Vanishing Violin ===

During a rehearsal at the Aurora Music Academy, the priceless Stradivarius violin disappears from the instrument room. Three people were present that night: the charismatic conductor, a nervous violin prodigy, and the longtime janitor. Who took the priceless instrument?

Suspects:
- lorenzo: Lorenzo Moretti (Conductor)
- maya: Maya Santos (Violinist)
- carlos: Carlos Mendes (Janitor)

ask maya cart?
accuse carlos
node:internal/readline/interface:450
      throw new ERR_USE_AFTER_CLOSE('readline');
            ^

Error [ERR_USE_AFTER_CLOSE]: readline was closed
    at [kQuestion] (node:internal/readline/interface:450:13)
    at Interface.question (node:readline:160:20)
    at prompt (file:///workspace/case-files/src/cli.js:80:8)
    at main (file:///workspace/case-files/src/cli.js:177:3)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5)
    at async file:///workspace/case-files/src/cli.js:185:1 {
  code: 'ERR_USE_AFTER_CLOSE'
}

Node.js v24.22.1

Problem 2: systemPrompt(c,'maya','pt') ends with "...evidence of tampering. You…": the whole system prompt is cut to 80 words, so facts/clues/glossary are lost. Only the model ANSWER must be capped to 80 words; the system prompt must be complete and instruct "answer in at most 80 words".
Problem 3: data/scores.json may contain rows from other cases. Scoreboard rows must include caseId; server stores caseId and /api/scores returns only rows of the current case.

# Task
Fix the bug(s). Output ONLY the files you change, full content. Never output content/case.json (it is real data, do not touch).
(Spec reference: prompts/_spec2.md as before.) Problem 1 is the CLI output above when piping 'ask maya cart?' then 'accuse carlos' on stdin.
