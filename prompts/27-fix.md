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
  return words.slice(0, maxWords).join(' ');
}

/**
 * Validate that a case follows the "fair play" rules.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c) {
  const reasons = [];

  const suspectIds = (c.suspects ?? []).map(s => s.id);

  // Culprit must be among suspects
  if (!suspectIds.includes(c.culprit)) {
    reasons.push('culprit_not_suspect');
  }

  // Every clue must reference a known suspect
  if ((c.clues ?? []).some(cl => !suspectIds.includes(cl.from))) {
    reasons.push('clue_from_unknown');
  }

  return { ok: reasons.length === 0, reasons };
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

// Central command processor (shared between interactive & piped mode)
async function processCommand(line) {
  const parts = line.trim().split(' ');
  const cmd = parts[0].toLowerCase();

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
    return false;
  }

  try {
    if (action === 'ask') {
      const suspectId = parts[1];
      const question = parts.slice(2).join(' ');
      if (!suspectId || !question) {
        console.log('Usage: ask <suspectId> <question>');
      } else {
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
      }
    } else if (action === 'accuse') {
      const suspectId = parts[1];
      if (!suspectId) {
        console.log('Usage: accuse <suspectId>');
      } else {
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

        const top = await getJSON(`${baseUrl}/api/scores`);
        console.log('--- Top Scores ---');
        top.forEach((e, idx) => {
          console.log(
            `${idx + 1}. ${e.player} - ${e.score} pts (${e.questions} Q) [${e.lang}]`,
          );
        });
        return true; // signal termination
      }
    } else if (action === 'history') {
      const suspectId = parts[1];
      if (!suspectId) {
        console.log('Usage: history <suspectId>');
      } else {
        const hist = histories.get(suspectId) || [];
        if (hist.length === 0) {
          console.log('No history for this suspect.');
        } else {
          hist.forEach((pair, i) => {
            console.log(`${i + 1}. Q: ${pair.q}`);
            console.log(`   A: ${pair.a}`);
          });
        }
      }
    } else if (action === 'quit') {
      return true;
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  return false;
}

// Main flow
await displayIntro();

// Create a session
const { sessionId } = await postJSON(`${baseUrl}/api/session`, {});

let terminated = false;

// Interactive (TTY) mode
if (process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  rl.setPrompt('> ');
  rl.prompt();

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) {
      rl.prompt();
      continue;
    }
    terminated = await processCommand(line);
    if (terminated) {
      rl.close();
      break;
    }
    rl.prompt();
  }
} else {
  // Piped / non‑interactive mode: read all stdin at once
  let stdinData = '';
  for await (const chunk of process.stdin) {
    stdinData += typeof chunk === 'string' ? chunk : chunk.toString();
  }
  const lines = stdinData.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    terminated = await processCommand(line);
    if (terminated) break;
  }
}

// Cleanup
server.close();
process.exit(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  sharedServer.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
  server.listen(0);
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
PASS status mock mode
PASS case EN public fields
PASS case PT public fields differ from EN
PASS public index.html contains required ids and attributes
PASS session creation
PASS ask returns answer and counts questions
PASS answer is capped at 80 words
PASS 400 on unknown suspect
PASS 400 on empty question
PASS 400 on over‑500‑char question
PASS 400 on unknown session
PASS mock answer includes clue text when keyword matches (EN)
PASS mock answer includes clue text when keyword matches (PT)
PASS full mock playthrough EN correct accusation
PASS full mock playthrough PT correct accusation
PASS wrong accusation yields score 0
PASS double accuse returns 409
PASS scoreboard persists and ranks correctly
PASS scoreFor matches specification
PASS fairPlay passes on original case
PASS fairPlay fails when culprit not a suspect
FAIL fairPlay fails when a clue does not implicate culprit: should fail implicates
FAIL fairPlay fails when innocent never cleared: should fail clears
PASS fairPlay fails when clue.from unknown suspect
PASS each clue ask triggers its text in mock answer (EN)
PASS proxy maps 402 to no_capacity
PASS proxy maps 429 capacity:empty to no_capacity
PASS proxy maps other 429 to rate_limited
PASS proxy maps 401 to bad_key
PASS proxy maps other 5xx to upstream
PASS server returns friendly messages for proxy errors EN
PASS server returns friendly messages for proxy errors PT
PASS systemPrompt EN has no glossary
PASS systemPrompt PT includes glossary and correct term
PASS CLI EN playthrough outputs solution
FAIL CLI PT aliases work: solution PT not printed
33 passed, 3 failed

# Task
Fix the bug(s). Output ONLY the files you change, full content, OR for small changes literal edits in this format: <<<REPLACE path>>> newline, exact old text, newline, =====, newline, new text, newline, <<<END>>> (old text is replaced at every occurrence). Never output content/case.json (it is real data, do not touch).
Spec reminder: tests must follow the spec; if the test is wrong fix the test, if the code is wrong fix the code. Start your reply directly with <<<FILE. No analysis text.
