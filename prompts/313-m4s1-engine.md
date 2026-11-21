Product: Case Files, a pack of browser detective games (Node.js 20 ESM, no dependencies, built-ins only). Every model call goes through a FullCup API key; each call returns a signed receipt id in the response header `x-fullcup-receipt-id`, and its cost is neurons x US$0.011 per 1000 neurons. Milestone M4 "The Pack, published": one web app with every case, a case picker, a shared scoreboard and a public cost log for each case.

This task: the cost log engine, the shared pack scoreboard, server routes, and the real credits. Output FILE blocks for new files and REPLACE blocks for edits, nothing else.

Block shapes (copy OLD exactly from the text given here, then a line of =====, then NEW):
<<<FILE path>>>
full content
<<<END>>>
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

=== 1. NEW FILE src/costs.js ===
Imports: `import { readFileSync, writeFileSync, existsSync } from 'node:fs';` `import { CASES, loadCase } from './case.js';`
Exports:
- `export const NEURON_USD = 0.011 / 1000;`
- `export const RECEIPT_URL = 'https://qa.fullcup.ai/receipts/';`
- `export const RULES` an array of { re, case, kind } checked in order against the call purpose string:
  { re: /^m2gf\d+-art:violin-/, case: 'violin', kind: 'art' },
  { re: /^m2gf\d+-art:night-train-/, case: 'night-train', kind: 'art' },
  { re: /^(interrogate|m1-acceptance|sprint\d+-smoke|sprint5-consistency)(:|$)/, case: 'violin', kind: 'play' },
  { re: /^(author-case|revise-case)(:|$)/, case: 'violin', kind: 'author' },
  { re: /^(m2-acceptance|m2s\d+-smoke|m2-shots)(:|$)/, case: 'night-train', kind: 'play' },
  { re: /^(m3-acceptance|m3s2-shots)(:|$)/, case: 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', kind: 'play' }
- `export function round6(x)` Math.round(x * 1e6) / 1e6.
- `export function entryUsd(e)`: if e.usage and Number.isFinite(e.usage.neurons) return round6(e.usage.neurons * NEURON_USD); else if typeof e.cost === 'number' return round6(e.cost); else 0.
- `export function receiptOf(e)`: e.headers?.['x-fullcup-receipt-id'] || e.headers?.['x-fullcup-receipt'] || null.
- `export function classify(purpose, rules = RULES)`: first rule whose re tests String(purpose || '') gives { case, kind }; otherwise { case: 'pack', kind: /build/.test(purpose) ? 'build' : 'dev' }.
- `export function buildCostLog({ usage = [], build = [], cases = {}, now = new Date().toISOString() })`:
  `cases` maps a case key to its loaded case object (with title {en,pt} and, for generated cases, generated.cost.receipts array).
  - Make a bucket for every key of `cases` in insertion order: { id: key, title: { en, pt } from the case, generated: Boolean(case.generated), entries: [] }, and a bucket 'pack' with title { en: 'The whole pack (shared build and tools)', pt: 'O pacote inteiro (construção e ferramentas compartilhadas)' }, generated false.
  - A map receipt id -> case key from every case's generated?.cost?.receipts.
  - For each usage entry with a `status` field (skip others): receipt = receiptOf(e); if the receipt is in that map -> that case, kind 'generate'; else classify(e.purpose); if the class case is not a bucket, use 'pack'. Push { at: e.at, kind, purpose: e.purpose, model: e.model || null, status: e.status, usd: entryUsd(e), receipt }.
  - Then each build entry (fields label, at, model, status, usage, headers): skip it when its receipt is non-null and already seen in the usage pass; else push into 'pack' { at, kind: 'build', purpose: 'build:' + label, model, status, usd: entryUsd(e), receipt }.
  - Sort each bucket's entries by `at` ascending (string compare). Totals per bucket: { usd: round6(sum), calls: entries.length, receipts: count with receipt, byKind: { <kind>: { usd, calls } } } (usd rounded with round6).
  - Return { version: 1, generatedAt: now, usdPer1000Neurons: 0.011, receiptUrl: RECEIPT_URL, cases: [case buckets in order], pack: the pack bucket, total: { usd: round6(sum of every bucket), calls, receipts } } with `totals` set on each bucket.
- `export function costsFor(log, key)`: key 'pack' returns log.pack; otherwise the case bucket with id === key, or null.
- `export function writeCostLog({ usageFile = 'qa/key-usage-log.json', buildFile = 'qa/build-log.json', outFile = 'data/cost-log.json' } = {})`: read both JSON arrays (a missing file counts as []), cases = Object.fromEntries of CASES keys -> loadCase(file), buildCostLog, write JSON.stringify(log, null, 1) + '\n' to outFile, return log.
- When run directly (`import.meta.url === \`file://${process.argv[1]}\``): writeCostLog() and print one line per bucket `${id}: US$ ${totals.usd.toFixed(6)} over ${totals.calls} calls (${totals.receipts} receipts)` and a final `total: ...` line.

=== 2. EDIT src/scoreboard.js: add a shared pack scoreboard ===
Existing code (exact): the factory ends with
  return { add, top };
}
Add, before that return, `function packTop(n = 10)`: group current entries by player name trimmed and lowercased; skip names that are empty or equal to 'anon'. For each player: best score per caseId (entries without caseId use 'unknown'), name = the trimmed player text of that player's newest entry (by `at`), cases = number of distinct caseIds, solved = number of caseIds whose best score > 0, total = sum of the best scores, last = newest `at`. Sort by total desc, then solved desc, then name asc (localeCompare); return the first n as { player: name, total, solved, cases }. Then return { add, top, packTop }.

=== 3. EDIT src/server.js ===
(a) Replace the import line
import { createScoreboard, scoreFor } from './scoreboard.js';
with that line plus a new line `import { costsFor } from './costs.js';`

(b) In the options of createServer, replace
  creditsFile = 'data/credits.json',
  key,
with
  creditsFile = 'data/credits.json',
  costFile = 'data/cost-log.json',
  key,

(c) Replace
      if (req.method === 'GET' && pathname === '/') {
with new code placed before it:
      if (req.method === 'GET' && pathname === '/costs') -> Content-Type text/html; charset=utf-8, sendFile(res, resolve(__dirname, '..', 'public', 'costs.html')).
      if (req.method === 'GET' && pathname === '/api/costs') -> read costFile (resolve(__dirname, '..', costFile) when it is not absolute) with readFileSync + JSON.parse inside try/catch; on failure sendJSON 404 { error: 'no_cost_log' }. If the query has `case`: costsFor(log, value); null -> sendJSON 404 { error: 'unknown_case' }; else 200 with that bucket. Without `case` 200 with the whole log.
     followed by the original line `      if (req.method === 'GET' && pathname === '/') {`.

(d) Replace
      if (req.method === 'GET' && pathname === '/api/scores') {
        const wanted = resolveFile(url.searchParams.get('case'));
with
      if (req.method === 'GET' && pathname === '/api/scores') {
        if (url.searchParams.get('case') === 'all') return sendJSON(res, 200, scoreboard.packTop(10));
        const wanted = resolveFile(url.searchParams.get('case'));

(e) Replace
          backers: credits.backers || [],
          example: !!credits.example,
with
          backers: credits.backers || [],
          others: Number(credits.others) || 0,
          example: !!credits.example,

=== 4. NEW FILE data/credits.json ===
JSON: { "example": false, "title": { "en": "This case was funded by", "pt": "Este caso foi financiado por" }, "backers": [ "Bia Klein", "Helô Igreja", "Yago Lopes", "Bernardo Domínguez", "Nico Rocha", "Leo Quintal", "Duda Ochoa", "Leandro Vieira", "Gabriela Pires", "Brian Umpiérrez", "Giovana Macedo", "Citlali Ríos" ], "others": 26, "source": "Public backers of the Case Files Cup on qa.fullcup.ai, 2026-11-21; 26 more backers chose not to appear." }
Start your reply directly with <<<FILE. No analysis text.
