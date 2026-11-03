# Task (sprint 7): new browser module public/best.js (personal best per language)
Write a new plain ES module public/best.js (no dependencies, no DOM access, works in the browser and in Node 20). It keeps the player's personal best score for each language in a Web Storage object (localStorage in the browser, a fake in tests). The storage is always passed in as the first argument (an object with getItem(key), setItem(key, value), removeItem(key)).

Exports (exactly these):
- `export const BEST_KEY = 'casefiles:best:v1';`
- `export function readBest(storage)` -> returns `{ en: entry|null, pt: entry|null }` where entry is `{ score: number, questions: number, at: string }`. Reads JSON from storage.getItem(BEST_KEY). Never throws: if storage is null/undefined, getItem throws, the value is missing, not valid JSON, or an entry has a non-number score/questions, that language is null.
- `export function recordResult(storage, lang, { score, questions, correct }, now = new Date().toISOString())` -> returns `{ best, isNew }` where best is the entry for that lang after the update and isNew is true only when this result became the new best. lang other than 'pt' is treated as 'en'. A wrong accusation (correct !== true) never becomes the best. A result becomes the best when there is no best yet, or its score is higher, or the score is equal and it used fewer questions. Writes the whole object back with storage.setItem(BEST_KEY, JSON.stringify(all)) only when it changed. Never throws (if setItem throws, still return the computed result).
- `export function resetBest(storage)` -> calls storage.removeItem(BEST_KEY); returns true on success, false if storage is missing or removeItem throws.
- `export function bestText(lang, entry)` -> one short sentence for the screen. EN: entry null -> "No best score yet in English."; else "Your best in English: 95 points with 4 questions." (use "1 question" when questions is 1). PT: null -> "Ainda sem recorde em português."; else "Seu recorde em português: 95 pontos com 4 perguntas." ("1 pergunta" when 1).
- `export function questionsText(lang, n)` -> EN "Questions used: 3", PT "Perguntas feitas: 3".
- `export const LABELS = { en: { bestTitle: 'Your best', reset: 'Reset my best scores', confirm: 'Reset your best scores for both languages? This cannot be undone.', done: 'Your best scores were reset.', kept: 'Nothing was reset.' }, pt: { bestTitle: 'Seu recorde', reset: 'Apagar meus recordes', confirm: 'Apagar seus recordes nos dois idiomas? Isso não pode ser desfeito.', done: 'Seus recordes foram apagados.', kept: 'Nada foi apagado.' } };`

No em-dashes anywhere. Short JSDoc on each export.

Output ONLY the file as <<<FILE public/best.js>>> newline, content, newline, <<<END>>>. No prose, no markdown fences.
