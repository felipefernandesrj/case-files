# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Feature spec v2 (M1 parity). Node 20+, ES modules, ZERO npm deps.

## Case data: content/case.json
{id,title{en,pt},intro{en,pt},culprit,
 suspects:[{id,name,role{en,pt},persona{en,pt},facts:string (English private role-play instructions)}],
 clues:[{id,from:suspectId,ask:string (EN example question that reveals it),keywords:[lowercase EN+PT words that trigger it],implicates:suspectId|null,clears:suspectId|null,text{en,pt}}],
 glossary:[{en,pt}] (fixed PT-BR translations of key nouns; the role-play prompt in PT must enforce them),
 solution{en,pt}}

## Modules (exact exports)
- src/case.js: loadCase(file='content/case.json') -> case object; publicCase(c, lang) -> {id,title,intro,suspects:[{id,name,role,persona}]} (strings in lang, NEVER facts/culprit/solution/clues); fairPlay(c) -> {ok:boolean, reasons:[string]}: ok only if there are exactly 3 suspects, culprit is a suspect id, at least 2 clues implicate the culprit, every innocent is cleared by at least one clue, every clue.from is a suspect id, and every clue has non-empty ask, keywords, text.en, text.pt. systemPrompt(c, suspectId, lang) -> string: in character, uses facts and that suspect's clues (reveal a clue's text when the question touches it), never confess outright, reply in the language (PT-BR when lang=pt, with "Use these exact PT-BR terms:" + glossary lines; EN prompt has no glossary), max 80 words. capWords(text, n=80) -> text trimmed to at most n words (ending with "…" when cut).
- src/proxy.js: createProxy({key, baseUrl, fetchImpl=fetch, model='@cf/meta/llama-4-scout-17b-16e-instruct'}) -> {chat(messages) -> Promise<string>}. POST {baseUrl}/chat/completions, Authorization Bearer, header X-FullCup-Workload: case-files:play. Errors throw an Error with .code: 402 -> 'no_capacity'; 429 whose body (error.code or message or raw text) contains 'capacity:empty' -> 'no_capacity'; other 429 -> 'rate_limited'; 401/403 -> 'bad_key'; anything else -> 'upstream'. Never include the key in errors or logs.
- src/mock.js: mockAnswer(c, suspectId, question, lang) -> deterministic in-character string in lang; if the question matches a clue's keywords (case-insensitive) for that suspect, the answer includes that clue's text[lang]. No network.
- src/messages.js: friendly(code, lang) -> short friendly sentence EN/PT for no_capacity ("this Cup is out of capacity, backers can refill it"), rate_limited (try again in a moment), bad_key (game key not configured or invalid, the creator was notified), upstream, bad_request.
- src/scoreboard.js: scoreFor(correct, questions) = correct ? max(10, 100 - 5*max(0, questions-3)) : 0. createScoreboard(file|null) -> {add({player,score,questions,correct,lang,at}), top(n=10)}; sorted by score desc, then fewer questions, then earlier at; keeps 100; persists JSON to file if file is set (create dir). Default file data/scores.json.
- src/server.js: export createServer({caseFile, scoreFile='data/scores.json', key, baseUrl, fetchImpl, mock}) returning an http.Server (not listening). If run directly (import.meta.url is the entry), listen on PORT||3000 and print the URL. Key from opts.key, else env FULLCUP_KEY, else file .fullcup-key; mock = opts.mock ?? (env MOCK==='1' || no key). Routes (JSON; lang from body.lang or ?lang, default en):
  GET / -> public/index.html. GET /api/status -> {mode:'mock'|'live', caseId}. GET /api/case -> publicCase. POST /api/session -> {sessionId} (random). POST /api/ask {sessionId,suspectId,question,lang} -> {answer, questions:<count for session>}; per-session per-suspect history kept on the server and sent to the model as prior turns; answer passed through capWords(…,80). POST /api/accuse {sessionId,suspectId,player,lang} -> {correct,culprit,culpritName,solution,score,questions}; adds to scoreboard (player default 'anon', max 24 chars); second accuse in same session -> 409. GET /api/scores -> top 10.
  Validation -> 400 {error:'bad_request',message}: unknown suspect, empty/over-500-char question, unknown session. Proxy errors -> status 402 (no_capacity), 429 (rate_limited), 503 (bad_key), 502 (upstream) with {error:code, message:friendly(code,lang)}. Unhandled errors -> 500 JSON, never crash. Never send the key to the client.
- src/cli.js: terminal play: `node src/cli.js [--lang pt] [--player name]`; starts createServer on port 0, prints title, intro, suspects; commands `ask <id> <question>`, `accuse <id>`, `history <id>`, `quit` (PT aliases pergunta/acusar/historico/sair). Works with piped stdin (exit after accuse or EOF).

## Web page public/index.html (single file, inline CSS+JS)
- Language toggle: two buttons id="len" (EN) and id="lpt" (PT) with aria-pressed reflecting state; switching re-renders all UI text and the case; html lang attribute updated ("en"/"pt-BR").
- Suspects: a group of 3 buttons (data-id=suspect id), aria-pressed on the selected one; selecting moves focus to the question input id="q".
- Form: <label for="q">, input id="q", submit button "Ask"/"Perguntar"; Enter submits. Per-suspect conversation log (all previous Q&A for the selected suspect, persisted while switching suspects) in an element id="log" with role="log" aria-live="polite". While waiting show "…thinking" text and disable the button.
- Player name input id="player" with label. Accuse section id="acc" with 3 buttons "Accuse <name>"/"Acusar <name>". Verdict in id="verdict" role="status" aria-live="assertive", focus moves to it (tabindex=-1), shows correct/wrong, solution and score; then a scoreboard table (GET /api/scores) with caption.
- Errors (402/429/503/502) shown as the friendly message in a role="alert" element id="err".
- Visible focus outline on every interactive element (:focus-visible outline 3px). Tab order: len, lpt, 3 suspects, q, Ask, player, 3 accuse buttons. Good contrast, responsive.

# Sprint 4 feature spec: closing screen with backer credits
- New data file data/credits.json: {"example": true, "note": "Example data. Replace with real backer names before release.", "title": {"en": "Thanks to the backers", "pt": "Obrigado aos apoiadores"}, "backers": ["Backer 1", "Backer 2", "Backer 3"]}.
- src/server.js: new route GET /api/credits -> 200 JSON {title (string in lang, from ?lang, default en), backers:[string], example:boolean}. createServer gets a new option creditsFile (default 'data/credits.json', resolved from the project root like caseFile). If the file is missing or invalid JSON, return 200 {title (EN "Thanks to the backers" / PT "Obrigado aos apoiadores"), backers:[], example:false}; never crash. Everything else in server.js unchanged.
- public/index.html: after a verdict is shown (after the scoreboard loads), fetch GET /api/credits?lang=<lang> and show a closing screen: <section id="credits" aria-labelledby="credits-title" tabindex="-1"> containing <h2 id="credits-title"> with the title, a <ul id="credits-list"> with one <li> per backer, and, when example is true, a small note (EN "Example names", PT "Nomes de exemplo"). Keyboard focus moves to #credits after it renders (the verdict is still announced first because it is role=status aria-live=assertive). Switching language after the verdict re-renders the credits title/note in the new language. Hidden before the verdict.

# Current file (written by you)
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

# Task
Implement the sprint 4 server part in src/server.js only: the creditsFile option (with JSDoc) and the GET /api/credits route with the missing/invalid-file fallback. Read the file per request or once at startup, your choice, but a missing or broken file must never crash the server. Change nothing else.
Output ONLY literal edits, one block per change (old text must be an exact, unique substring of the current file):
<<<REPLACE src/server.js>>>
exact old text
=====
new text
<<<END>>>
No prose. Start directly with <<<REPLACE.
