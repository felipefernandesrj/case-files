# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Current project files (written by you)
<<<FILE src/server.js>>>
import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { env } from 'process';
import { URL } from 'url';

// Resolve directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..', '..');

// Load case data
let caseData;
try {
  const casePath = join(__dirname, 'content', 'case.json');
  const raw = await readFile(casePath, 'utf8');
  caseData = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load case data:', e);
  process.exit(1);
}

// Determine key / mock mode
let fullcupKey = env.FULLCUP_KEY?.trim();
if (!fullcupKey) {
  try {
    const keyFile = await readFile('.fullcup-key', 'utf8');
    fullcupKey = keyFile.trim();
  } catch (_) {
    fullcupKey = '';
  }
}
const MOCK = env.MOCK === '1' || !fullcupKey;
const BASE_URL = env.FULLCUP_BASE_URL?.replace(/\/+$/, '') || 'https://qa-api.fullcup.ai/v1';
const PORT = Number(env.PORT) || 3000;

// Helper: send JSON response
function json(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// Helper: parse JSON body
async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString();
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Helper: friendly capacity message
function capacityMessage(lang) {
  const msgs = {
    en: 'The game is currently out of capacity. Please try again later.',
    pt: 'O jogo está sem capacidade no momento. Por favor, tente novamente mais tarde.',
  };
  return msgs[lang] || msgs.en;
}

// Helper: friendly upstream error
function upstreamMessage(lang) {
  const msgs = {
    en: 'There was an error contacting the AI service. Please try again later.',
    pt: 'Ocorreu um erro ao contatar o serviço de IA. Por favor, tente novamente mais tarde.',
  };
  return msgs[lang] || msgs.en;
}

// Main request handler
const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Serve static index.html
  if (req.method === 'GET' && pathname === '/') {
    try {
      const htmlPath = join(__dirname, 'public', 'index.html');
      const data = await readFile(htmlPath);
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    } catch (e) {
      res.writeHead(500);
      res.end('Server error');
    }
    return;
  }

  // API routes
  if (pathname.startsWith('/api/')) {
    // CORS preflight (not strictly needed but harmless)
    if (req.method === 'OPTIONS') {
      res.writeHead(204, {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      });
      res.end();
      return;
    }

    // GET case info
    if (req.method === 'GET' && pathname === '/api/case') {
      const lang = url.searchParams.get('lang')?.toLowerCase() === 'pt' ? 'pt' : 'en';
      const { title, intro, suspects } = caseData;
      const outSuspects = suspects.map(s => ({
        id: s.id,
        name: s.name,
        role: s.role[lang],
        persona: s.persona[lang],
      }));
      json(res, 200, {
        title: title[lang],
        intro: intro[lang],
        suspects: outSuspects,
      });
      return;
    }

    // POST ask
    if (req.method === 'POST' && pathname === '/api/ask') {
      const body = await parseJson(req);
      if (!body || typeof body.suspectId !== 'string' || typeof body.question !== 'string' || !body.question.trim()) {
        json(res, 400, { error: 'bad_request', message: 'Missing or empty suspectId/question' });
        return;
      }
      const lang = body.lang?.toLowerCase() === 'pt' ? 'pt' : 'en';
      const suspect = caseData.suspects.find(s => s.id === body.suspectId);
      if (!suspect) {
        json(res, 400, { error: 'bad_request', message: 'Invalid suspectId' });
        return;
      }

      // Mock mode handling
      if (MOCK) {
        const canned = {
          en: `${suspect.name} says nothing of interest.`,
          pt: `${suspect.name} não tem nada a dizer.`,
        };
        json(res, 200, { answer: canned[lang] });
        return;
      }

      // Build messages for FullCup proxy
      const systemPrompt = `You are ${suspect.name}, ${suspect.role[lang]}. Facts: ${suspect.facts.join(' ')}`;
      const messages = [{ role: 'system', content: systemPrompt }];

      // History if provided
      if (Array.isArray(body.history)) {
        for (const turn of body.history) {
          if (turn.q) messages.push({ role: 'user', content: turn.q });
          if (turn.a) messages.push({ role: 'assistant', content: turn.a });
        }
      }

      messages.push({ role: 'user', content: body.question });

      const payload = {
        model: '@cf/meta/llama-4-scout-17b-16e-instruct',
        messages,
        max_tokens: 300,
      };

      try {
        const resp = await fetch(`${BASE_URL}/chat/completions`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${fullcupKey}`,
            'Content-Type': 'application/json',
            'X-FullCup-Workload': 'caso-3-atos',
          },
          body: JSON.stringify(payload),
        });

        const respJson = await resp.json();

        // Capacity handling
        if (resp.status === 402 ||
          (resp.status === 429 && respJson?.error?.message?.includes('capacity:empty'))) {
          json(res, 402, { error: 'capacity', message: capacityMessage(lang) });
          return;
        }

        if (!resp.ok) {
          json(res, 502, { error: 'upstream', message: upstreamMessage(lang) });
          return;
        }

        const answer = respJson?.choices?.[0]?.message?.content?.trim() ?? '';
        json(res, 200, { answer });
      } catch (e) {
        json(res, 502, { error: 'upstream', message: upstreamMessage(lang) });
      }
      return;
    }

    // POST accuse
    if (req.method === 'POST' && pathname === '/api/accuse') {
      const body = await parseJson(req);
      if (!body || typeof body.suspectId !== 'string') {
        json(res, 400, { error: 'bad_request', message: 'Missing suspectId' });
        return;
      }
      const lang = body.lang?.toLowerCase() === 'pt' ? 'pt' : 'en';
      const isCorrect = body.suspectId === caseData.culprit;
      const response = {
        correct: isCorrect,
        culprit: caseData.culprit,
        solution: caseData.solution[lang],
      };
      json(res, 200, response);
      return;
    }

    // Unknown API route
    json(res, 404, { error: 'not_found' });
    return;
  }

  // Fallback 404
  json(res, 404, { error: 'not_found' });
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
<<<END>>>
<<<FILE test/e2e.mjs>>>
import { spawn } from 'child_process';
import { setTimeout as delay } from 'timers/promises';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { resolve, join } from 'path';
import process from 'process';
import { createServer } from 'http';

// Helper to wait for server readiness
async function waitForServer(port, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/`);
      if (res.ok) return true;
    } catch (_) {
      // ignore
    }
    await delay(200);
  }
  return false;
}

// Determine random port
const PORT = 30000 + Math.floor(Math.random() * 10000);

// Spawn server
const serverProc = spawn('node', [join(resolve(fileURLToPath(import.meta.url), '..', '..'), 'src', 'server.js')], {
  env: { ...process.env, MOCK: '1', PORT: String(PORT) },
  stdio: ['ignore', 'pipe', 'pipe'],
});

let stdout = '';
serverProc.stdout.on('data', chunk => {
  stdout += chunk.toString();
});

serverProc.stderr.on('data', chunk => {
  // ignore for now
});

async function runTests() {
  const base = `http://127.0.0.1:${PORT}`;

  // Wait for server
  const ready = await waitForServer(PORT);
  if (!ready) {
    console.error('Server did not start');
    process.exit(1);
  }

  // 1. Root HTML contains language toggle
  const rootRes = await fetch(`${base}/`);
  assert.strictEqual(rootRes.status, 200, 'GET / should return 200');
  const html = await rootRes.text();
  assert.ok(html.includes('id="lang-toggle"'), 'HTML should contain language toggle');

  // Helper to fetch case
  async function fetchCase(lang) {
    const r = await fetch(`${base}/api/case?lang=${lang}`);
    assert.strictEqual(r.status, 200, `/api/case ${lang}`);
    const data = await r.json();
    assert.ok(data.title, 'case title');
    assert.ok(Array.isArray(data.suspects) && data.suspects.length === 3, '3 suspects');
    // ensure no facts / culprit
    data.suspects.forEach(s => {
      assert.ok(s.id && s.name && s.role && s.persona, 'suspect fields');
      assert.strictEqual(s.facts, undefined, 'facts not exposed');
    });
    return data;
  }

  const caseEn = await fetchCase('en');
  const casePt = await fetchCase('pt');

  // 2. Ask each suspect in both languages
  for (const suspect of caseEn.suspects) {
    for (const lang of ['en', 'pt']) {
      const askRes = await fetch(`${base}/api/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suspectId: suspect.id,
          question: 'What is your alibi?',
          lang,
          history: [],
        }),
      });
      assert.strictEqual(askRes.status, 200, `ask ${suspect.id} ${lang}`);
      const ans = await askRes.json();
      assert.ok(typeof ans.answer === 'string' && ans.answer.length > 0, 'answer present');
    }
  }

  // 3. Bad inputs
  const bad1 = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: 'Hi', lang: 'en', history: [] }),
  });
  assert.strictEqual(bad1.status, 400, 'missing suspectId -> 400');

  const bad2 = await fetch(`${base}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspectId: caseEn.suspects[0].id, question: '   ', lang: 'en', history: [] }),
  });
  assert.strictEqual(bad2.status, 400, 'empty question -> 400');

  // 4. Accuse wrong and correct
  const wrongId = caseEn.suspects.find(s => s.id !== caseEn.culprit)?.id || caseEn.suspects[0].id;
  const accuseWrong = await fetch(`${base}/api/accuse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspectId: wrongId, lang: 'en' }),
  });
  const resWrong = await accuseWrong.json();
  assert.strictEqual(resWrong.correct, false, 'wrong accusation');

  const accuseRight = await fetch(`${base}/api/accuse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ suspectId: caseEn.culprit, lang: 'en' }),
  });
  const resRight = await accuseRight.json();
  assert.strictEqual(resRight.correct, true, 'correct accusation');
  assert.ok(resRight.solution, 'solution present');

  console.log('PASS');
}

// Run and ensure cleanup
runTests()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('FAIL', err);
    process.exit(1);
  })
  .finally(() => {
    serverProc.kill();
  });
<<<END>>>

# Test output

> test
> node test/e2e.mjs

FAIL AssertionError [ERR_ASSERTION]: correct accusation
+ actual - expected

+ undefined
- true

    at runTests (file:///workspace/case-files/test/e2e.mjs:126:10)
    at process.processTicksAndRejections (node:internal/process/task_queues:104:5) {
  generatedMessage: false,
  code: 'ERR_ASSERTION',
  actual: undefined,
  expected: true,
  operator: 'strictEqual',
  diff: 'simple'
}

# Task
Fix the bug(s). Output ONLY the files you change, full content. Never output content/case.json (it is real data, do not touch).
Note: the test must not hardcode suspect ids or the culprit; read content/case.json from disk to know the culprit.
