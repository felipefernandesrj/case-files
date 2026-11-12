import { createServer as httpCreateServer } from 'node:http';
import { createReadStream, readFileSync } from 'node:fs';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { loadCase, caseFileFor, unknownCaseLine, publicCase, systemPrompt, capWords, CASES, listPack } from './case.js';
import { createProxy } from './proxy.js';
import { mockAnswer } from './mock.js';
import { friendly } from './messages.js';
import { maxCallsFor } from './budget.js';
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
function sendFile(res, filePath, type) {
  const stream = createReadStream(filePath);
  stream.on('error', () => {
    res.writeHead(404);
    res.end('Not found');
  });
  if (type) res.setHeader('Content-Type', type);
  stream.pipe(res);
}

const PUBLIC_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
};

const PUBLIC_ROOT_DIRS = ['css', 'fonts', 'icons', 'assets'];

function safePublicFile(publicRoot, urlPath) {
  const rel = urlPath.replace(/^\/+/, '');
  const first = rel.split('/')[0];
  if (!PUBLIC_ROOT_DIRS.includes(first) && rel !== 'best.js') return null;
  const resolved = resolve(publicRoot, rel);
  const root = resolve(publicRoot);
  if (resolved !== root && !resolved.startsWith(root + sep)) return null;
  return resolved;
}

/**
 * Create the game server.
 * @param {Object} opts
 * @param {string} opts.caseFile
 * @param {string} [opts.caseId] flag: case id from CASES in src/case.js; when set it overrides caseFile
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
  caseId,
  scoreFile = 'data/scores.json',
  creditsFile = 'data/credits.json',
  key,
  baseUrl,
  fetchImpl,
  mock,
}) {
  // Load case (synchronously). An unknown caseId still throws (caseFileFor) so startup stays the same.
  // The default case is the process flag; sessions may open another file from the pack.
  if (caseId) caseFileFor(caseId);
  const pack = {};
  for (const [k, f] of Object.entries(CASES)) pack[k] = loadCase(f);
  const defaultKey = caseId || Object.keys(CASES).find((k) => CASES[k] === caseFile) || 'violin';
  const defaultCase = pack[defaultKey] || loadCase(caseFile);
  const c = defaultCase;

  function resolveFile(raw) {
    if (typeof raw !== 'string' || !Object.prototype.hasOwnProperty.call(pack, raw)) return null;
    return raw;
  }

  function caseOfSession(sess) {
    return (sess && sess.file && pack[sess.file]) || defaultCase;
  }

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
  const bestPath = resolve(__dirname, '..', 'public', 'best.js');

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
      if (req.method === 'GET' && pathname === '/best.js') {
        res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
        return sendFile(res, bestPath);
      }
      if (req.method === 'GET' && pathname === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return sendFile(res, indexPath);
      }
      if (req.method === 'GET' && (pathname.startsWith('/css/') || pathname.startsWith('/fonts/') || pathname.startsWith('/icons/') || pathname.startsWith('/assets/'))) {
        const publicRoot = resolve(__dirname, '..', 'public');
        const file = safePublicFile(publicRoot, pathname);
        if (!file) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        const type = PUBLIC_TYPES[extname(file).toLowerCase()] || 'application/octet-stream';
        return sendFile(res, file, type);
      }

      if (req.method === 'GET' && pathname === '/api/status') {
        return sendJSON(res, 200, { mode: modeMock ? 'mock' : 'live', caseId: c.id });
      }

      if (req.method === 'GET' && pathname === '/api/cases') {
        return sendJSON(res, 200, { cases: listPack(queryLang) });
      }

      if (req.method === 'GET' && pathname === '/api/case') {
        const lang = queryLang;
        const wanted = resolveFile(url.searchParams.get('case'));
        const chosen = wanted ? pack[wanted] : c;
        return sendJSON(res, 200, publicCase(chosen, lang));
      }

      if (req.method === 'POST' && pathname === '/api/session') {
        const body = await readJSON(req).catch(() => ({}));
        const wanted = resolveFile(body && body.case);
        const sessionId = randomUUID();
        sessions.set(sessionId, {
          history: new Map(),
          questions: 0,
          calls: 0,
          accused: false,
          file: wanted || defaultKey,
        });
        return sendJSON(res, 200, { sessionId, file: wanted || defaultKey });
      }

      if (req.method === 'POST' && pathname === '/api/ask') {
        const body = await readJSON(req);
        const { sessionId, suspectId, question, lang: bodyLang } = body;
        const lang = getLang(bodyLang);

        // Validation
        if (!sessionId || !sessions.has(sessionId)) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown session' });
        }
        const sess = sessions.get(sessionId);
        const play = caseOfSession(sess);
        const suspect = play.suspects.find((s) => s.id === suspectId);
        if (!suspect) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown suspect' });
        }
        if (!question || typeof question !== 'string' || !question.trim()) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'empty question' });
        }
        if (question.length > 500) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'question too long' });
        }

        // per-case cap on model calls per playthrough (M2 sprint 4): no model call once capped
        if (sess.calls >= maxCallsFor(play)) {
          return sendJSON(res, 429, { error: 'call_cap', message: friendly('call_cap', lang), questions: sess.questions });
        }
        sess.calls += 1;

        // question is counted only after a successful answer (sprint 6)

        // Build messages
        const messages = [];
        messages.push({ role: 'system', content: systemPrompt(play, suspectId, lang) });

        const hist = sess.history.get(suspectId) || [];
        for (const msg of hist) {
          messages.push({ role: msg.role, content: msg.content });
        }
        messages.push({ role: 'user', content: question });

        let answer;
        try {
          if (modeMock) {
            answer = mockAnswer(play, suspectId, question, lang);
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
        const newHist = [...hist, { role: 'user', content: question }, { role: 'assistant', content: trimmed }];
        sess.history.set(suspectId, newHist);

        sess.questions += 1;
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
        const play = caseOfSession(sess);
        const suspect = play.suspects.find((s) => s.id === suspectId);
        if (!suspect) {
          return sendJSON(res, 400, { error: 'bad_request', message: 'unknown suspect' });
        }

        const correct = suspectId === play.culprit;
        const culpritObj = play.suspects.find((s) => s.id === play.culprit);
        const culpritName = culpritObj ? culpritObj.name : '';
        const solution = play.solution?.[lang] ?? '';
        const playerName = typeof player === 'string' && player.trim() ? player.trim().slice(0, 24) : 'anon';
        const sc = scoreFor(correct, sess.questions);
        scoreboard.add({
          player: playerName,
          score: sc,
          questions: sess.questions,
          correct,
          lang,
          caseId: play.id,
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
        const wanted = resolveFile(url.searchParams.get('case'));
        const chosen = wanted ? pack[wanted] : c;
        const top = scoreboard.top(10, chosen.id);
        return sendJSON(res, 200, top);
      }

      if (req.method === 'GET' && pathname === '/api/credits') {
        let credits;
        try {
          const __dirname = dirname(fileURLToPath(import.meta.url));
          const absoluteCreditsFile = creditsFile.startsWith('/') 
            ? creditsFile 
            : resolve(__dirname, '..', creditsFile);
          const raw = readFileSync(absoluteCreditsFile, 'utf8');
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
  try {
    createServer({ caseFile: 'content/case.json', caseId: process.env.CASE_ID || undefined });
  } catch (err) {
    if (err.code !== 'unknown_case') throw err;
    console.error(unknownCaseLine(process.env.CASE_ID));
    process.exit(2);
  }
}
