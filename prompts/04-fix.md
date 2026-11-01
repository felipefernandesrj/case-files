# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Current project files (written by you)
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
Hint from the failing assertion: /api/case correctly hides the culprit, so caseEn.culprit is undefined in the test. The test must read content/case.json from disk to know the culprit. Output the corrected test/e2e.mjs immediately, no analysis.
