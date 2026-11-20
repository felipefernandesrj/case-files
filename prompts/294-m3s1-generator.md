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
