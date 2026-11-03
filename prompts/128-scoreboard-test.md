# Task (sprint 7): new offline test file test/scoreboard.mjs
Write a new Node 20 ESM test file test/scoreboard.mjs (no dependencies, no network, no real key, no browser). Same style as the project's other tests: a small `test(name, fn)` runner that prints `PASS name` or `FAIL name: message`, then `N passed, M failed`, and `process.exit(failed ? 1 : 0)`. Run tests one after another (await each). Use a tiny `assert(cond, msg)` that throws Error(msg). Always close every server in a finally block.

Project API (written by you earlier):
- `import { BEST_KEY, readBest, recordResult, resetBest, bestText, questionsText, LABELS } from '../public/best.js'` (contract below).
- `import { createServer } from '../src/server.js'` -> node http.Server (not listening). Use `createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true })`, `server.listen(0)`, wait for 'listening', port = server.address().port, then use global fetch on http://127.0.0.1:port.
- public/index.html is the page; read it with fs.readFileSync.

best.js contract: readBest(storage) -> {en: entry|null, pt: entry|null}, entry {score, questions, at}; never throws. recordResult(storage, lang, {score, questions, correct}, now) -> {best, isNew}; wrong accusations never become best; better = higher score, or same score with fewer questions; lang other than 'pt' is 'en'; never throws. resetBest(storage) -> true/false, never throws. bestText(lang, entry): EN null "No best score yet in English.", EN entry "Your best in English: 95 points with 4 questions." ("1 question"); PT null "Ainda sem recorde em português.", PT entry "Seu recorde em português: 95 pontos com 4 perguntas." ("1 pergunta"). questionsText: EN "Questions used: 3", PT "Perguntas feitas: 3". LABELS.en/pt have bestTitle, reset, confirm, done, kept.

Write a helper `fakeStorage(initial = {})` returning an object with getItem (returns null when missing), setItem, removeItem over a plain object `data`, plus `writes` counter. And `throwingStorage()` whose three methods all throw.

Tests (exactly these 10):
1. "best is kept per language": recordResult(s,'en',{score:90,questions:5,correct:true}); recordResult(s,'pt',{score:70,questions:9,correct:true}); readBest(s).en.score===90, .pt.score===70, and the stored JSON under BEST_KEY parses with both.
2. "higher score replaces, lower does not": en 80/7 then en 95/4 -> isNew true, best.score 95; then en 60/2 -> isNew false, readBest(s).en.score===95 and questions===4.
3. "same score with fewer questions wins": en 100/3 then en 100/2 -> isNew true, questions 2; en 100/2 again -> isNew false.
4. "wrong accusation never becomes best": on empty storage recordResult(s,'pt',{score:0,questions:1,correct:false}) -> isNew false, readBest(s).pt===null, s.writes===0.
5. "unknown language counts as English": recordResult(s,'fr',{score:50,questions:11,correct:true}) -> readBest(s).en.score===50 and .pt===null.
6. "corrupt or missing storage never throws": readBest(null), readBest(throwingStorage()), readBest(fakeStorage({[BEST_KEY]:'not json'})), readBest(fakeStorage({[BEST_KEY]:'null'})), readBest(fakeStorage({[BEST_KEY]:JSON.stringify({en:{score:'x',questions:2,at:'t'}})})) all return {en:null, pt:null}; recordResult on throwingStorage(), on fakeStorage({[BEST_KEY]:'null'}) and on fakeStorage({[BEST_KEY]:JSON.stringify({en:{score:'x',questions:2,at:'t'}})}) with en 40/3 correct returns isNew true and best.score 40 (no throw).
7. "reset clears both languages": record en and pt, resetBest(s)===true, readBest(s) is {en:null,pt:null}; resetBest(throwingStorage())===false; resetBest(null)===false.
8. "texts EN and PT": check the exact bestText strings above for null, 95/4 and 100/1 in both languages, and questionsText('en',3), questionsText('pt',3). For every string in LABELS.en and LABELS.pt (and the texts): non-empty, no '—'. LABELS.pt.reset must not equal LABELS.en.reset.
9. "server serves /best.js as JavaScript": GET /best.js -> status 200, content-type includes 'javascript', body contains 'export function recordResult'.
10. "page wires the personal scoreboard": index.html contains `from '/best.js'`, an element with id "best-section", a button with id "reset-best", an element with id "questions-used", the text `confirm(` and the text `localStorage`.

Output ONLY the file as <<<FILE test/scoreboard.mjs>>> newline, content, newline, <<<END>>>. No prose, no markdown fences.
