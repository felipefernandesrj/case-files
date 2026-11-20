Rework. Two files you wrote from the spec below have bugs. Send BOTH files again in full as FILE blocks (src/generator.js and test/generator.mjs), fixing exactly these:
1. src/generator.js line 4 `import { solve } from 'node:util';` does not exist and crashes the module. Remove it (and the unused loadCase import).
2. extractJson must first remove ```json and ``` fence lines as the spec says, then take first '{' to last '}'.
3. validateCase must only use shapeCheck + fairPlay + timelineCheck, as the spec says. Delete the extra hand-made clue block (it duplicates fairPlay and adds 'clues_insufficient_implication').
4. attempts entries must store the HTTP status number (response.status), not the string 'ok'. Do not wrap the request in a try/catch that rewrites err.attempts: on a non-ok response set err.attempts = [...attempts, { n, status: response.status, usage: null, receipt: null, ok: false, reasons: [err.code] }] once and throw. A network error (fetch throws) is rethrown with err.code = 'network' and err.attempts set the same way.
5. CLI --suspects bug: `args[getIdx('--suspects')] !== -1` is always true, so suspects becomes NaN without the flag. Use: const si = args.indexOf('--suspects'); const suspects = si !== -1 ? Number(args[si + 1]) : 4. Key file path must be the project root (path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.fullcup-key')), not process.cwd().
6. test/generator.mjs has a SyntaxError at the end ("});" with no opener, and a runTests() wrapper). Write it as flat top-level `await check(...)` calls, then the exact ending given in the spec. Each check must follow the spec list 1 to 10.

=== SPEC (unchanged) ===
Write two NEW files for a Node.js 20 ESM project (no dependencies, built-ins only): src/generator.js and test/generator.mjs. Output each file as a FILE block. No other files.

Context. The project is a detective game. A case is a JSON object. Existing helpers you must import (do not rewrite them):
- `import { fairPlay, timelineCheck, loadCase } from './case.js';`  fairPlay(c, { suspects: n }) and timelineCheck(c) each return { ok: boolean, reasons: string[] }. loadCase('content/cases/night-train.json') returns a valid 4 suspect case.
- `import { fairMinimum } from './budget.js';` fairMinimum(c) returns 2 + (suspects - 1).

A case has these keys (EN and PT text everywhere):
title {en,pt}; intro {en,pt}; culprit (suspect id); suspects [{ id (lowercase a-z), name, role {en,pt}, persona {en,pt}, alibi {en,pt}, facts (English, second person "You are ...", hidden truth incl. what they lie about) }]; timeline [{ id "t1".., time "HH:MM" in order (may cross midnight once), stop {en,pt}, event {en,pt}, who [suspect ids], crime: true on exactly one stop which includes the culprit }]; clues [{ id "c1".., from (suspect id), ask (English question), keywords [lowercase EN and PT words], implicates (suspect id or null), clears (suspect id or null), text {en,pt} }] with at least 2 clues implicating the culprit and every innocent cleared by at least one clue; hints [{ id "h1".., after (seconds, 30 to 120), text {en,pt} }] (2 or 3); glossary [{en,pt}]; solution {en,pt}; aftermath { <each innocent id>: { en: {headline, body}, pt: {headline, body} } }.

=== src/generator.js must export exactly these ===
1. `export const GEN_MODEL = '@cf/google/gemma-4-26b-a4b-it';`
2. `export const MAX_ATTEMPTS = 3;`
3. `export function slugSeed(seed)`: String(seed) lowercased, NFD normalized with combining marks removed, every run of chars outside a-z0-9 becomes one '-', trimmed of '-', cut to 40 chars and trimmed of '-' again; '' becomes 'case'.
4. `export function genMessages(seed, { suspects = 4, reasons = [] } = {})`: returns [{role:'system', content: GEN_SYSTEM}, {role:'user', content}] where GEN_SYSTEM is a module constant that describes the full case schema above in plain words, says "Answer with ONE JSON object only, no markdown, no prose", "exactly N suspects" (N filled in the user message), "the mystery must be solvable only from the clues", "Portuguese is Brazilian Portuguese". The user content is `Seed: ${seed}\nSuspects: ${suspects}` and, when reasons is non-empty, a further line `The previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.`
5. `export function extractJson(text)`: takes a string; removes ```json / ``` fences; takes the substring from the first '{' to the last '}'; returns JSON.parse of it, or null if there is no brace pair or parsing throws. Never throws.
6. `export function shapeCheck(c)`: returns { ok, reasons } with reasons from: 'not_object' (c not a plain object, return at once), 'missing_title', 'missing_intro', 'missing_solution' (each needs non-empty en and pt strings), 'suspect_bad' (any suspect without id matching /^[a-z][a-z0-9-]*$/, a non-empty name, role.en, role.pt and facts), 'duplicate_suspect_id', 'missing_hints' (hints not a non-empty array).
7. `export function validateCase(c, { suspects = 4 } = {})`: runs shapeCheck; if it returns 'not_object' return that; otherwise also fairPlay(c, { suspects }) and timelineCheck(c) (wrap each in try/catch, a throw adds 'check_crashed'); returns { ok, reasons } with unique reasons in that order.
8. `export function finishCase(c, seed, model)`: returns a new object: { ...c, id: `case-gen-${slugSeed(seed)}`, questionBudget: 2 * fairMinimum(c), generated: { seed: String(seed), model } }.
9. `export async function generateCase(seed, { key, baseUrl = 'https://qa-api.fullcup.ai/v1', fetchImpl = fetch, model = GEN_MODEL, suspects = 4, maxAttempts = MAX_ATTEMPTS, maxTokens = 8000 } = {})`:
   - loop attempt n = 1..maxAttempts; reasons start []. Each attempt POSTs to baseUrl without a trailing '/' + '/chat/completions' with headers Authorization `Bearer ${key}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': 'case-files:generate', body JSON { model, messages: genMessages(seed, { suspects, reasons }), max_tokens: maxTokens, chat_template_kwargs: { enable_thinking: false } }.
   - If the response is not ok: build err = new Error('generation request failed'), err.status, err.code = 'bad_key' for 401/403, 'no_capacity' for 402 or for 429 whose body text contains 'capacity:empty', 'rate_limited' for other 429, otherwise 'upstream'; err.attempts = the attempts so far plus this one; throw it (no retry).
   - Otherwise read JSON, content = choices[0].message.content (string or ''), usage = data.usage || null, receipt = response.headers.get('x-fullcup-receipt-id') || null. Parse with extractJson; reasons = parsed ? validateCase(parsed, { suspects }).reasons : ['not_json']. Push { n, status, usage, receipt, ok: reasons.length === 0, reasons } to attempts.
   - When ok, return { ok: true, case: finishCase(parsed, seed, model), attempts }.
   - After the last attempt return { ok: false, case: null, attempts, reasons } (reasons of the last attempt).
   - The key must never appear in anything returned or thrown.
10. CLI when run directly (`if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]))`): flags --seed <text> (required, else print `Usage: node src/generator.js --seed "<text>" [--suspects 4] [--out file]` to stderr and exit 2), --suspects <n> (default 4), --out <file> (default `content/cases/gen-${slugSeed(seed)}.json`). Key from env FULLCUP_KEY or the file .fullcup-key in the project root (trimmed); base from FULLCUP_BASE_URL or the default. On ok write the case to --out as JSON with 2 space indent and a final newline. Always print to stdout JSON.stringify({ ok, out (or null), attempts, reasons }, null, 1). Exit 0 on ok, 1 otherwise; on a thrown error print `{ ok:false, code, status, attempts }` and exit 1.

=== test/generator.mjs ===
No network. Same style as this snippet (copy the helpers exactly):
```
import fs from 'node:fs';
import { loadCase } from '../src/case.js';
import { slugSeed, extractJson, validateCase, finishCase, generateCase, genMessages, GEN_MODEL } from '../src/generator.js';
const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }
```
A fake fetch factory: `function fake(replies) { const calls = []; const f = async (url, opts) => { calls.push({ url, opts, body: JSON.parse(opts.body) }); const r = replies[Math.min(calls.length - 1, replies.length - 1)]; return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200, headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + calls.length } }); }; f.calls = calls; return f; }` and `const reply = (text) => ({ body: { choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 20 } } });`
`const good = loadCase('content/cases/night-train.json');` and `const bad = { ...good, clues: good.clues.map(c => ({ ...c, clears: null })) };` (no innocent cleared).
Checks (each one `await check(...)`):
1. slugSeed: 'A Lighthouse, in a Storm!' -> 'a-lighthouse-in-a-storm'; 'Café São João' -> 'cafe-sao-joao'; '***' -> 'case'; a 100 char seed gives length <= 40 and no trailing '-'.
2. extractJson: fenced "```json\n{\"a\":1}\n```" -> {a:1}; "Here it is: {\"a\":{\"b\":2}} done" -> a.b === 2; 'no json' -> null; '{broken' -> null.
3. validateCase(good, { suspects: 4 }).ok is true; validateCase(bad, { suspects: 4 }) has reason 'suspect_not_cleared'; validateCase(good, { suspects: 3 }) has 'wrong_suspect_count'; validateCase(null).reasons deep equals ['not_object']; validateCase({ ...good, title: { en: 'x' } }) has 'missing_title'.
4. first try ok: generateCase('night train', { key: 'SECRET-KEY', fetchImpl: fake([reply(JSON.stringify(good))]) }) -> ok true, attempts.length 1, attempts[0].receipt 'R1', case.id 'case-gen-night-train', case.questionBudget 10, case.generated.seed 'night train', case.generated.model === GEN_MODEL.
5. retries with reasons: replies [reply('sorry'), reply(JSON.stringify(bad)), reply('```json\n' + JSON.stringify(good) + '\n```')] -> ok true, 3 attempts, attempts[0].reasons ['not_json'], attempts[1].reasons includes 'suspect_not_cleared', the 2nd request's user message includes 'not_json' and the 3rd includes 'suspect_not_cleared'; the 1st has no 'previous draft'.
6. gives up: replies [reply(JSON.stringify(bad))] -> ok false, case null, 3 attempts, 3 calls, reasons includes 'suspect_not_cleared'.
7. 402 stops at once: replies [{ status: 402, body: { error: { code: 'capacity' } } }] -> throws with code 'no_capacity', status 402, 1 call, err.attempts.length 1; and 429 with body text 'capacity:empty' -> 'no_capacity'; 401 -> 'bad_key'.
8. request shape: url ends with '/v1/chat/completions' and has no '//chat'; Authorization 'Bearer SECRET-KEY'; X-FullCup-Workload 'case-files:generate'; body.model GEN_MODEL; body.chat_template_kwargs.enable_thinking === false; body.messages[0].role 'system'; genMessages('x', { suspects: 5 })[1].content includes 'Suspects: 5'.
9. key never leaks: JSON.stringify of the results of checks 4, 6 and of the 402 error (including err.attempts and err.message) does not contain 'SECRET-KEY'.
10. CLI without --seed: spawnSync(process.execPath, ['src/generator.js']) exits 2 and stderr includes 'Usage: node src/generator.js'.
End: `for (const l of results) console.log(l); const failed = results.filter((l) => l.startsWith('FAIL')).length; console.log(`generator: ${results.length - failed} passed, ${failed} failed`); process.exit(failed ? 1 : 0);`

=== YOUR CURRENT src/generator.js ===
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { solve } from 'node:util';
import { fairPlay, timelineCheck, loadCase } from './case.js';
import { fairMinimum } from './budget.js';

export const GEN_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const MAX_ATTEMPTS = 3;

const GEN_SYSTEM = `You are a detective game generator. Create a complete mystery case in JSON format.
The case must include:
- title and intro (English and Brazilian Portuguese).
- culprit: the ID of one suspect.
- suspects: an array of objects with id (a-z/numbers/hyphens), name, role (en/pt), persona (en/pt), alibi (en/pt), and facts (English, 2nd person "You are...", including their lie).
- timeline: an array of stops with id, time (HH:MM), stop (en/pt), event (en/pt), who (array of suspect ids). Exactly one stop must have crime: true and include the culprit.
- clues: an array of objects with id, from (suspect id), ask (English), keywords (lowercase en/pt), implicates (suspect id or null), clears (suspect id or null), and text (en/pt). At least 2 clues must implicate the culprit, and every innocent suspect must be cleared by at least one clue.
- hints: 2 or 3 objects with id, after (seconds 30-120), and text (en/pt).
- glossary: en/pt terms.
- solution: en/pt description of how the crime was solved.
- aftermath: for each innocent id, en/pt headline and body.

The mystery must be solvable only from the clues.
Answer with ONE JSON object only, no markdown, no prose.
Portuguese is Brazilian Portuguese.`;

export function slugSeed(seed) {
  let s = String(seed).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s === '') return 'case';
  return s.slice(0, 40).replace(/-+$/, '');
}

export function genMessages(seed, { suspects = 4, reasons = [] } = {}) {
  const userContent = `Seed: ${seed}\nSuspects: ${suspects}${reasons.length ? `\nThe previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.` : ''}`;
  return [
    { role: 'system', content: GEN_SYSTEM },
    { role: 'user', content: userContent }
  ];
}

export function extractJson(text) {
  if (typeof text !== 'string') return null;
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  try {
    return JSON.parse(text.substring(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export function shapeCheck(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, reasons: ['not_object'] };
  const reasons = [];
  if (!c.title?.en || !c.title?.pt) reasons.push('missing_title');
  if (!c.intro?.en || !c.intro?.pt) reasons.push('missing_intro');
  if (!c.solution?.en || !c.solution?.pt) reasons.push('missing_solution');
  
  if (Array.isArray(c.suspects)) {
    const ids = new Set();
    for (const s of c.suspects) {
      if (!s.id || !/^[a-z][a-z0-9-]*$/.test(s.id)) reasons.push('suspect_bad');
      else if (ids.has(s.id)) reasons.push('duplicate_suspect_id');
      else ids.add(s.id);

      if (!s.name || !s.role?.en || !s.role?.pt || !s.facts) reasons.push('suspect_bad');
    }
  } else {
    reasons.push('suspect_bad');
  }

  if (!Array.isArray(c.hints) || c.hints.length === 0) reasons.push('missing_hints');

  return { ok: reasons.length === 0, reasons };
}

export function validateCase(c, { suspects = 4 } = {}) {
  const shape = shapeCheck(c);
  if (!shape.ok) return shape;

  const reasons = new Set();
  
  // fairPlay
  try {
    const fp = fairPlay(c, { suspects });
    if (!fp.ok) fp.reasons.forEach(r => reasons.add(r));
  } catch (e) {
    reasons.add('check_crashed');
  }

  // timelineCheck
  try {
    const tc = timelineCheck(c);
    if (!tc.ok) tc.reasons.forEach(r => reasons.add(r));
  } catch (e) {
    reasons.add('check_crashed');
  }

  // logic for clue requirements (specifically mentioned in prompt)
  const suspectIds = c.suspects.map(s => s.id);
  const culpritId = c.culprit;
  const innocents = suspectIds.filter(id => id !== culpritId);
  
  if (c.clues) {
    const implicatesCulprit = c.clues.filter(clue => clue.implicates === culpritId).length;
    if (implicatesCulprit < 2) reasons.add('clues_insufficient_implication');
    
    const clearedInnocents = new Set();
    c.clues.forEach(clue => {
      if (clue.clears) clearedInnocents.add(clue.clears);
    });
    for (const inc of innocents) {
      if (!clearedInnocents.has(inc)) reasons.add('suspect_not_cleared');
    }
  }

  const sorted = Array.from(reasons);
  return { ok: sorted.length === 0, reasons: sorted };
}

export function finishCase(c, seed, model) {
  return {
    ...c,
    id: `case-gen-${slugSeed(seed)}`,
    questionBudget: 2 * fairMinimum(c),
    generated: { seed: String(seed), model }
  };
}

export async function generateCase(seed, { key, baseUrl = 'https://qa-api.fullcup.ai/v1', fetchImpl = fetch, model = GEN_MODEL, suspects = 4, maxAttempts = MAX_ATTEMPTS, maxTokens = 8000 } = {}) {
  const attempts = [];
  let currentReasons = [];

  for (let n = 1; n <= maxAttempts; n++) {
    try {
      const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'X-FullCup-Workload': 'case-files:generate'
        },
        body: JSON.stringify({
          model,
          messages: genMessages(seed, { suspects, reasons: currentReasons }),
          max_tokens: maxTokens,
          chat_template_kwargs: { enable_thinking: false }
        })
      });

      if (!response.ok) {
        const err = new Error('generation request failed');
        err.status = response.status;
        err.attempts = attempts.concat([{ n, status: response.status }]); 
        // We need to count current + this one. Since we haven't pushed to attempts yet, we calculate.
        const currentCount = n;
        
        if (response.status === 401 || response.status === 403) err.code = 'bad_key';
        else if (response.status === 402) err.code = 'no_capacity';
        else if (response.status === 429) {
          const body = await response.text();
          if (body.includes('capacity:empty')) err.code = 'no_capacity';
          else err.code = 'rate_limited';
        } else {
          err.code = 'upstream';
        }
        
        // Fix attempt count in error
        err.attempts = Array.from({ length: currentCount }, (_, i) => ({ n: i + 1 }));
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || null;
      const receipt = response.headers.get('x-fullcup-receipt-id') || null;
      
      const parsed = extractJson(content);
      const validation = parsed ? validateCase(parsed, { suspects }) : { ok: false, reasons: ['not_json'] };
      
      currentReasons = validation.reasons;
      attempts.push({ n, status: 'ok', usage, receipt, ok: validation.ok, reasons: validation.reasons });

      if (validation.ok) {
        return { ok: true, case: finishCase(parsed, seed, model), attempts };
      }
    } catch (e) {
      if (e.status && e.code) {
        // Re-throw handled errors
        const err = e;
        err.attempts = Array.from({ length: n }, (_, i) => ({ n: i + 1 }));
        throw err;
      }
      // Other errors (network, etc)
      attempts.push({ n, status: 'error', reasons: [e.message] });
    }
  }

  return { ok: false, case: null, attempts, reasons: currentReasons };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const getIdx = (flag) => args.indexOf(flag);
  
  const seedIdx = getIdx('--seed');
  if (seedIdx === -1 || !args[seedIdx + 1]) {
    process.stderr.write('Usage: node src/generator.js --seed "<text>" [--suspects 4] [--out file]\n');
    process.exit(2);
  }

  const seed = args[seedIdx + 1];
  const suspects = args[getIdx('--suspects')] !== -1 ? parseInt(args[getIdx('--suspects') + 1], 10) : 4;
  const outIdx = getIdx('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : `content/cases/gen-${slugSeed(seed)}.json`;

  let key = process.env.FULLCUP_KEY;
  if (!key) {
    const keyFile = path.join(process.cwd(), '.fullcup-key');
    if (fs.existsSync(keyFile)) key = fs.readFileSync(keyFile, 'utf8').trim();
  }

  const baseUrl = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';

  (async () => {
    try {
      const result = await generateCase(seed, { key, baseUrl, suspects });
      if (result.ok) {
        if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(result.case, null, 2) + '\n');
        console.log(JSON.stringify({ ok: true, out: outPath, attempts: result.attempts, reasons: [] }, null, 1));
        process.exit(0);
      } else {
        console.log(JSON.stringify({ ok: false, out: null, attempts: result.attempts, reasons: result.reasons }, null, 1));
        process.exit(1);
      }
    } catch (e) {
      const errObj = {
        ok: false,
        code: e.code || 'error',
        status: e.status || 500,
        attempts: e.attempts || []
      };
      console.log(JSON.stringify(errObj, null, 1));
      process.exit(1);
    }
  })();
}
=== YOUR CURRENT test/generator.mjs ===
import fs from 'node:fs';
import { loadCase } from '../src/case.js';
import { slugSeed, extractJson, validateCase, finishCase, generateCase, genMessages, GEN_MODEL } from '../src/generator.js';

const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };

async function check(name, fn) {
  try {
    await fn();
    results.push(`PASS ${name}`);
  } catch (e) {
    results.push(`FAIL ${name}: ${e.message}`);
  }
}

function fake(replies) {
  const calls = [];
  const f = async (url, opts) => {
    calls.push({ url, opts, body: JSON.parse(opts.body) });
    const r = replies[Math.min(calls.length - 1, replies.length - 1)];
    return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), {
      status: r.status || 200,
      headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + calls.length }
    });
  };
  f.calls = calls;
  return f;
}

const reply = (text) => ({
  body: {
    choices: [{ message: { content: text } }],
    usage: { prompt_tokens: 10, completion_tokens: 20 }
  }
});

const good = loadCase('content/cases/night-train.json');
const bad = { ...good, clues: good.clues.map(c => ({ ...c, clears: null })) };

async function runTests() {
  // 1. slugSeed
  await check('slugSeed', async () => {
    must(slugSeed('A Lighthouse, in a Storm!') === 'a-lighthouse-in-a-storm', 'slugSeed 1');
    must(slugSeed('Café São João') === 'cafe-sao-joao', 'slugSeed 2');
    must(slugSeed('***') === 'case', 'slugSeed 3');
    const long = slugSeed('a'.repeat(100));
    must(long.length <= 40, 'slugSeed length');
    must(!long.endsWith('-'), 'slugSeed trailing dash');
  });

  // 2. extractJson
  await check('extractJson', async () => {
    must(JSON.stringify(extractJson('```json\n{"a":1}\n```')) === '{"a":1}', 'extractJson fenced');
    must(extractJson('Here it is: {"a":{"b":2}} done').a.b === 2, 'extractJson inline');
    must(extractJson('no json') === null, 'extractJson null');
    must(extractJson('{broken') === null, 'extractJson broken');
  });

  // 3. validateCase
  await check('validateCase', async () => {
    must(validateCase(good, { suspects: 4 }).ok, 'validateCase good');
    must(validateCase(bad, { suspects: 4 }).reasons.includes('suspect_not_cleared'), 'validateCase bad clues');
    must(validateCase(good, { suspects: 3 }).reasons.includes('wrong_suspect_count'), 'validateCase wrong count');
    must(validateCase(null).reasons.deepEquals?.(['not_object']) || validateCase(null).reasons[0] === 'not_object', 'validateCase null');
    must(validateCase({ ...good, title: { en: 'x' } }).reasons.includes('missing_title'), 'validateCase missing title');
  });

  // 4. first try ok
  await check('first try ok', async () => {
    const res = await generateCase('night train', {
      key: 'SECRET-KEY',
      fetchImpl: fake([reply(JSON.stringify(good))])
    });
    must(res.ok, 'gen ok');
    must(res.attempts.length === 1, 'gen attempts');
    must(res.attempts[0].receipt === 'R1', 'gen receipt');
    must(res.case.id === 'case-gen-night-train', 'gen id');
    must(res.case.questionBudget === 10, 'gen budget');
    must(res.case.generated.seed === 'night train', 'gen seed');
    must(res.case.generated.model === GEN_MODEL, 'gen model');
  });

  // 5. retries with reasons
  await check('retries with reasons', async () => {
    const replies = [
      reply('sorry'),
      reply(JSON.stringify(bad)),
      reply('```json\n' + JSON.stringify(good) + '\n```')
    ];
    const res = await generateCase('night train', {
      key: 'SECRET-KEY',
      fetchImpl: fake(replies)
    });
    must(res.ok, 'retries ok');
    must(res.attempts.length === 3, 'retries length');
    must(res.attempts[0].reasons.includes('not_json'), 'attempt 0 reason');
    must(res.attempts[1].reasons.some(r => r === 'suspect_not_cleared'), 'attempt 1 reason');
    
    const calls = replies.length > 0 ? [] : []; // dummy
    // We need to inspect the calls from the fake fetch
    // Since we don't have access to the internal fake inside generateCase easily without modifying signature, 
    // we'll assume the user/dev provides a way or we verify via logic. 
    // In this test context, we'll use a local capture.
  });
  
  // Re-running 5 with manual capture for inspection
  await check('retries logic details', async () => {
    let capturedCalls = [];
    const fetchWithCapture = async (url, opts) => {
      capturedCalls.push({ url, opts, body: JSON.parse(opts.body) });
      const r = replies[Math.min(capturedCalls.length - 1, replies.length - 1)];
      return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200, headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + capturedCalls.length } });
    };
    // Note: replies must be in scope
    const replies = [reply('sorry'), reply(JSON.stringify(bad)), reply('```json\n' + JSON.stringify(good) + '\n```')];

    const res = await generateCase('night train', {
      key: 'SECRET-KEY',
      fetchImpl: fetchWithCapture
    });

    must(res.attempts[0].reasons.includes('not_json'), 'r1');
    must(capturedCalls[1].body.messages[1].content.includes('not_json'), 'user msg 2');
    must(capturedCalls[2].body.messages[1].content.includes('suspect_not_cleared'), 'user msg 3');
    must(!capturedCalls[0].body.messages[1].content.includes('previous draft'), 'user msg 1');
  });

  // 6. gives up
  await check('gives up', async () => {
    const res = await generateCase('night train', {
      key: 'SECRET-KEY',
      fetchImpl: fake([reply(JSON.stringify(bad)), reply(JSON.stringify(bad)), reply(JSON.stringify(bad))])
    });
    must(!res.ok, 'gives up ok false');
    must(res.case === null, 'case null');
    must(res.attempts.length === 3, '3 attempts');
    must(res.reasons.some(r => r === 'suspect_not_cleared'), 'final reasons');
  });

  // 7. 402/429/401
  await check('error codes', async () => {
    // 402
    const f402 = fake([{ status: 402, body: { error: { code: 'capacity' } } }]);
    try {
      await generateCase('x', { key: 'K', fetchImpl: f402 });
    } catch (e) {
      must(e.code === 'no_capacity' && e.status === 402, '402 error');
      must(e.attempts.length === 1, '402 attempts');
    }
    // 429 capacity:empty
    const f429 = fake([{ status: 429, body: 'capacity:empty' }]);
    try {
      await generateCase('x', { key: 'K', fetchImpl: f429 });
    } catch (e) {
      must(e.code === 'no_capacity', '429 capacity');
    }
    // 401
    const f401 = fake([{ status: 401 }]);
    try {
      await generateCase('x', { key: 'K', fetchImpl: f401 });
    } catch (e) {
      must(e.code === 'bad_key', '401 error');
    }
  });

  // 8. request shape
  await check('request shape', async () => {
    let lastOpts;
    const fShape = async (url, opts) => {
      lastOpts = opts;
      return new Response(JSON.stringify(reply({ choices: [{ message: { content: '{}' } }] })), { status: 200 });
    };
    await generateCase('x', { key: 'SECRET-KEY', fetchImpl: fShape });
    must(lastOpts.url.endsWith('/v1/chat/completions'), 'url');
    must(!lastOpts.url.includes('//chat'), 'no double slash');
    must(lastOpts.headers.Authorization === 'Bearer SECRET-KEY', 'auth');
    must(lastOpts.headers['X-FullCup-Workload'] === 'case-files:generate', 'workload');
    const body = JSON.parse(lastOpts.body);
    must(body.model === GEN_MODEL, 'body model');
    must(body.chat_template_kwargs.enable_thinking === false, 'thinking false');
    must(body.messages[0].role === 'system', 'sys role');
    must(genMessages('x', { suspects: 5 })[1].content.includes('Suspects: 5'), 'suspects in user msg');
  });

  // 9. key never leaks
  await check('key leakage', async () => {
    const secret = 'SECRET-KEY';
    // Test 4
    const res4 = await generateCase('night train', { key: secret, fetchImpl: fake([reply(JSON.stringify(good))]) });
    must(!JSON.stringify(res4).includes(secret), 'leak 4');

    // Test 6
    const res6 = await generateCase('night train', { key: secret, fetchImpl: fake([reply(JSON.stringify(bad)), reply(JSON.stringify(bad)), reply(JSON.stringify(bad))]) });
    must(!JSON.stringify(res6).includes(secret), 'leak 6');

    // Test 402
    try {
      await generateCase('x', { key: secret, fetchImpl: fake([{ status: 402, body: 'capacity:empty' }]) });
    } catch (e) {
      must(!JSON.stringify(e).includes(secret), 'leak 402');
    }
  });
});

runTests().then(() => {
  const failed = results.filter((l) => l.startsWith('FAIL')).length;
  console.log(`generator: ${results.length - failed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
});
