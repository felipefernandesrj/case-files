# Sprint 4 feature spec: closing screen with backer credits
- New data file data/credits.json: {"example": true, "note": "Example data. Replace with real backer names before release.", "title": {"en": "Thanks to the backers", "pt": "Obrigado aos apoiadores"}, "backers": ["Backer 1", "Backer 2", "Backer 3"]}.
- src/server.js: new route GET /api/credits -> 200 JSON {title (string in lang, from ?lang, default en), backers:[string], example:boolean}. createServer gets a new option creditsFile (default 'data/credits.json', resolved from the project root like caseFile). If the file is missing or invalid JSON, return 200 {title (EN "Thanks to the backers" / PT "Obrigado aos apoiadores"), backers:[], example:false}; never crash. Everything else in server.js unchanged.
- public/index.html: after a verdict is shown (after the scoreboard loads), fetch GET /api/credits?lang=<lang> and show a closing screen: <section id="credits" aria-labelledby="credits-title" tabindex="-1"> containing <h2 id="credits-title"> with the title, a <ul id="credits-list"> with one <li> per backer, and, when example is true, a small note (EN "Example names", PT "Nomes de exemplo"). Keyboard focus moves to #credits after it renders (the verdict is still announced first because it is role=status aria-live=assertive). Switching language after the verdict re-renders the credits title/note in the new language. Hidden before the verdict.

# Current files (written by you)
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
 * @param {string} [opts.creditsFile='data/credits.json']
 * @param {string} [opts.key]
 * @param {string} [opts.baseUrl]
 * @param {Function} [opts.fetchImpl]
 * @param {boolean} [opts.mock]
 * @returns {import('node:http').Server}
 */
export function createServer({
  caseFile,
  scoreFile = 'data/scores.json',
  creditsFile = 'data/credits.json',
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

      if (req.method === 'GET' && pathname === '/api/credits') {
        let credits;
        try {
          const raw = readFileSync(resolve(process.cwd(), creditsFile), 'utf8');
          credits = JSON.parse(raw);
        } catch (_) {
          credits = null;
        }

        if (!credits) {
          const fallbackTitle = queryLang === 'pt' ? 'Obrigado aos apoiadores' : 'Thanks to the backers';
          return sendJSON(res, 200, {
            title: fallbackTitle,
            backers: [],
            example: false,
          });
        }

        const title = typeof credits.title === 'object' ? (credits.title[queryLang] || credits.title['en']) : credits.title;
        return sendJSON(res, 200, {
          title: title,
          backers: credits.backers || [],
          example: !!credits.example,
        });
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
<<<FILE src/case.js (excerpt: loadCase)>>>
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

<<<END>>>
<<<FILE test/e2e.mjs (excerpt)>>>
test('credits default path independent of cwd', async () => {
  const originalCwd = process.cwd();
  try {
    process.chdir(os.tmpdir());
    const creditsPath = join(__dirname, '..', 'data', 'credits.json');
    const creditsData = JSON.parse(readFileSync(creditsPath, 'utf8'));
    const server = createServer({ caseFile: CASE_FILE, mock: true });
    server.listen(0);
    await once(server, 'listening');
    const { port } = server.address();
    const { status, data } = await request(port, 'GET', '/api/credits');
    server.close();
    if (status !== 200 || data.backers.length !== creditsData.backers.length) throw 'cwd changed path resolution';
  } finally {
    process.chdir(originalCwd);
  }
});
<<<END>>>

# Test output
FAIL credits default path independent of cwd: cwd changed path resolution
41 passed, 1 failed

# Task: fix src/server.js only (the test is correct per spec)
The /api/credits route resolves creditsFile against process.cwd(), so the default data/credits.json is not found when the server runs from another directory. Resolve a relative creditsFile against the project root (the parent of src/, like loadCase does with import.meta.url); absolute paths stay as they are.
Output ONLY literal edit blocks (exact old text from src/server.js, a line =====, new text, then <<<END>>>):
<<<REPLACE src/server.js>>>
old
=====
new
<<<END>>>
No prose. Start directly with <<<REPLACE.
