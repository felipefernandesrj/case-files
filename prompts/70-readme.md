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
  const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';

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

    const status = response.status;
    console.error(`FullCup request failed with status: ${status}`);

    const err = new Error('FullCup request failed');
    err.status = status;

    let bodyJson = null;
    let errorText = '';
    try {
      bodyJson = await response.json();
    } catch {
      try {
        errorText = await response.text();
      } catch {
        // Both json() and text() failed or were unavailable
      }
    }

    const errorContent = (bodyJson?.error?.code ?? bodyJson?.error?.message ?? errorText ?? '').toString().toLowerCase();

    if (status === 401 || status === 403) {
      err.code = 'bad_key';
    } else if (status === 402) {
      err.code = 'no_capacity';
    } else if (status === 429) {
      if (errorContent.includes('capacity:empty')) {
        err.code = 'no_capacity';
      } else {
        err.code = 'rate_limited';
      }
    } else {
      err.code = 'upstream';
    }

    throw err;
  }

  return { chat };
}
<<<END>>>
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
 * Return a public version of the case (no secrets).
 * @param {Object} c
 * @param {'en'|'pt'} lang
 * @returns {Object}
 */
export function publicCase(c, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  return {
    id: c.id,
    title: c.title?.[l] ?? '',
    intro: c.intro?.[l] ?? '',
    suspects: (c.suspects ?? []).map(s => ({
      id: s.id,
      name: s.name,
      role: s.role?.[l] ?? '',
      persona: s.persona?.[l] ?? '',
    })),
  };
}

/**
 * Build the system prompt for the LLM.
 * @param {Object} c
 * @param {string} suspectId
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function systemPrompt(c, suspectId, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  const suspect = (c.suspects ?? []).find(s => s.id === suspectId) || {};
  const intro = c.intro?.[l] ?? '';
  const persona = suspect.persona?.[l] ?? '';
  let prompt = `${intro}\n\nYou are role‑playing as ${suspect.name ?? ''}. ${persona}`;

  // Glossary is added for PT prompts. Include all glossary entries except any that contain the term "violonista".
  if (l === 'pt' && Array.isArray(c.glossary)) {
    const lines = c.glossary
      .map(g => `${g.en}: ${g[l]}`)
      .filter(line => !/violonista/i.test(line))
      .join('\n');
    if (lines) {
      prompt += `\nUse these exact PT‑BR terms:\n${lines}`;
    }
  }

  prompt += `\n\nRespond in character. Use at most 3 short sentences and stay under 60 words. Never reveal you are an AI. Respond in ${l === 'pt' ? 'Portuguese' : 'English'}.`;

  return prompt;
}

/**
 * Truncate a string to a maximum number of words.
 * @param {string} text
 * @param {number} maxWords
 * @returns {string}
 */
export function capWords(text, maxWords) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ') + '…';
}

/**
 * Validate that a case follows the "fair play" rules.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c) {
  const reasons = [];

  const suspectIds = (c.suspects ?? []).map(s => s.id);

  // Exactly three suspects
  if (suspectIds.length !== 3) {
    reasons.push('wrong_suspect_count');
  }

  // Culprit must be a known suspect
  if (!suspectIds.includes(c.culprit)) {
    reasons.push('culprit_not_suspect');
  }

  // Validate each clue
  const clues = c.clues ?? [];
  let implicateCount = 0;
  for (const cl of clues) {
    // clue.from must be a known suspect
    if (!suspectIds.includes(cl.from)) {
      reasons.push('clue_from_unknown');
    }

    // ask must be non‑empty string
    if (!cl.ask || typeof cl.ask !== 'string' || !cl.ask.trim()) {
      reasons.push('clue_missing_ask');
    }

    // keywords must be a non‑empty array of non‑empty strings
    if (
      !Array.isArray(cl.keywords) ||
      cl.keywords.length === 0 ||
      cl.keywords.some(k => typeof k !== 'string' || !k.trim())
    ) {
      reasons.push('clue_invalid_keywords');
    }

    // text.en and text.pt must be non‑empty strings
    if (!cl.text || typeof cl.text.en !== 'string' || !cl.text.en.trim()) {
      reasons.push('clue_missing_text_en');
    }
    if (!cl.text || typeof cl.text.pt !== 'string' || !cl.text.pt.trim()) {
      reasons.push('clue_missing_text_pt');
    }

    // implicates: if non‑null must be a known suspect; count those equal to culprit
    if (cl.implicates != null) {
      if (!suspectIds.includes(cl.implicates)) {
        reasons.push('clue_implicates_invalid');
      } else if (cl.implicates === c.culprit) {
        implicateCount++;
      }
    }

    // clears: if non‑null must be a known suspect
    if (cl.clears != null && !suspectIds.includes(cl.clears)) {
      reasons.push('clue_clears_invalid');
    }
  }

  // At least two clues must implicate the culprit
  if (implicateCount < 2) {
    reasons.push('not_enough_implicates');
  }

  // Every innocent suspect must be cleared by at least one clue
  const innocents = suspectIds.filter(id => id !== c.culprit);
  for (const innocentId of innocents) {
    const cleared = clues.some(cl => cl.clears === innocentId);
    if (!cleared) {
      reasons.push('suspect_not_cleared');
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}
<<<END>>>
<<<FILE package.json>>>
{
  "name": "fullcup-mystery",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node test/e2e.mjs && node test/proxy.mjs && node test/keyboard.mjs"
  },
  "dependencies": {}
}
<<<END>>>
Files in repo: public: index.html  src: case.js cli.js messages.js mock.js proxy.js scoreboard.js server.js  test: e2e.mjs keyboard.mjs proxy.mjs 
Case: The Vanishing Violin / O Violino Desaparecido; suspects: Lorenzo Moretti, Maya Santos, Carlos Mendes
# Current README.md (outdated, describes an earlier prototype)
<<<FILE README.md>>>
# Case Files: a pack of AI detective games

[![Case Files: AI detective games pack on FullCup](https://qa.fullcup.ai/projects/case-files-ai-detective-games-pack/badge.svg)](https://qa.fullcup.ai/cups/case-files-ai-detective-games-pack?ref=badge)

## Overview

Hi, I'm Caio Ventura. I make small browser mystery games where an AI plays every suspect. You ask questions, they lie, and you name the culprit.

This repo starts from **Caso em 3 Atos**, a working prototype: three suspects played by a language model, an interrogation room and a verdict. Every question is one model call through the FullCup proxy, so the game runs on capacity from backers. It uses only open models on Cloudflare Workers AI.

**The plan:** turn the prototype into a pack of four cases. I don't build ahead of the funding. Each milestone starts when its budget is funded, and I post progress, the cost of each case and play receipts as I go.

## Roadmap (funding goal: $120)

| # | Milestone | Budget | Deliverable |
|---|---|---|---|
| M1 | Caso em 3 Atos, polished | $25 | The existing case, public, in English and Portuguese, with a scoreboard and a friendly message when capacity runs out. |
| M2 | Case 2: The Night Train | $30 | A second case with 4 suspects and a moving timeline, on a shared case engine. |
| M3 | Case 3: The Generated Case | $35 | A generator that writes and validates new mysteries from a seed. |
| M4 | The Pack, published | $30 | One web app with every case, a case picker, a shared scoreboard and a public cost log for each case. |

## What backers get
- Early play links for each case, as soon as its milestone is delivered.
- Credit on the closing screen of each case.
- Monthly backers (Case Club): a vote on the next case's setting, plus developer notes.
- Everyone gets the receipts: every build and play call is signed and visible.

## Usage
```
node src/server.js                                  # mock mode, no key needed
FULLCUP_API_KEY=<your key> node src/server.js       # or put it in .fullcup-key (git-ignored)
npm test                                            # e2e in mock mode (plays the case EN + PT to a solution)
node src/cli.js --lang pt                           # play in the terminal
```
Then open http://localhost:3000. The key stays on the server, and the browser never sees it.

M1 status: bilingual (EN / PT-BR, toggle in the header), scoreboard (`data/scores.json`, git-ignored), fair-play clue check (`fairPlay()` in `src/case.js`), friendly messages for 402 / 429 capacity:empty / 401. Sprint 2 (polish): PT-BR glossary keeps place names consistent in live play. Live play needs the Cup key from qa.fullcup.ai in `FULLCUP_API_KEY` or `.fullcup-key`.

See `docs/` for the PRD, the spec and the backbone notes.
<<<END>>>
# Task
Update only the parts about the game: the current case name and premise (from content/case.json), Usage commands (key via FULLCUP_KEY env or .fullcup-key, mock when no key), test commands, and the M1 status paragraph (bilingual EN/PT, per-suspect history, answers under 60 words, keyboard and screen reader play with CDP tests, scoreboard, fair-play check, CLI, friendly capacity messages). Keep the badge, overview voice, roadmap and backer sections unchanged except renaming M1 to the current case. Output ONLY README.md, complete, starting with <<<FILE. Never include any key value.
