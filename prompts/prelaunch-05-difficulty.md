# Task (pre-launch QA fix 3, difficulty). Output ONLY these blocks, no prose, never repeat a block. Format for edits: a line `<<<REPLACE path>>>`, the old text copied exactly (keep its leading spaces), a line `=====`, the new text, a line `<<<END>>>`. Format for the new file: `<<<FILE path>>>` ... `<<<END>>>`.

Findings from 82 LLM bot games: (a) an accusation with 0 questions scores 100, the top score, so a blind guess plus Start over tops the scoreboard; (b) both generated cases have a first hint (45 s) that gives the culprit away: Samba "the dancer's shoe part" (only Marta dances), Lapa "Arthur, Daniela, and Claudio all have witnesses" (names every innocent, so the 4th is guilty). Win rate on those cases was 100% for every bot.

Block 1, src/scoreboard.js. Old:
  if (!correct) return 0;
  return Math.max(10, 100 - 5 * Math.max(0, questions - 3));
New:
  if (!correct) return 0;
  // pre-launch QA: a right name with fewer than 2 answered questions is a hunch, not a deduction
  if (questions < 2) return HUNCH_SCORE;
  return Math.max(10, 100 - 5 * Math.max(0, questions - 3));

Block 2, src/scoreboard.js. Old (first line of the file):
import { readFile, writeFile, mkdir } from 'node:fs/promises';
New:
import { readFile, writeFile, mkdir } from 'node:fs/promises';

/** Score for a right accusation after fewer than 2 answered questions (pre-launch QA difficulty pass). */
export const HUNCH_SCORE = 25;

Block 3, src/generator.js. Old:
  return { ok: reasons.length === 0, reasons };
}

export function validateCase(c, { suspects = 4 } = {}) {
New: the same, but before the return insert:
  // pre-launch QA: a hint may not name the culprit or the culprit's role, and may not name every innocent suspect
  const leak = hintLeak(c);
  if (leak) reasons.push(leak);

Block 4, src/generator.js. Old:
export function isTestimony(clue, c) {
New: insert this exported function BEFORE that line, then the old line again:
/** 'hint_names_culprit' when a hint (en or pt) contains the culprit's name or a word of 5+ letters from the culprit's role; 'hint_lists_innocents' when one hint names every innocent suspect; else null. Names may be a string or {en, pt}. Matching is case-insensitive on whole words, and 'dancer' also matches "dancer's". */
export function hintLeak(c) { ... }

Block 5, src/generator.js. Old:
  clue_not_testimony:
New:
  hint_names_culprit: 'hints must not contain the culprit name or role; describe a sound, a mark or an object instead and let the player connect it',
  hint_lists_innocents: 'a hint must never list every innocent suspect; at most one hint may point at one witness',
  clue_not_testimony:

Block 6, new file test/prelaunch-difficulty.mjs (plain node; `check(name, fn)` collecting PASS/FAIL lines like the other tests, print all, `process.exit(1)` on any FAIL). Imports: `scoreFor, HUNCH_SCORE` from '../src/scoreboard.js'; `hintLeak, validateCase` from '../src/generator.js'; `loadCase, CASES` from '../src/case.js'. Checks:
 1 "a blind or one-question right guess scores the hunch score": scoreFor(true,0) === 25, scoreFor(true,1) === 25, HUNCH_SCORE === 25.
 2 "deduction keeps the old curve": scoreFor(true,2) === 100, scoreFor(true,3) === 100, scoreFor(true,8) === 75, scoreFor(true,30) === 10, scoreFor(false,5) === 0.
 3 "hint naming the culprit or role is refused": a case object `{ culprit: 'm', suspects: [{ id: 'm', name: 'Marta', role: { en: 'Lead Dancer', pt: 'Passista' } }, { id: 'r', name: 'Ricardo', role: { en: 'Drummer', pt: 'Percussionista' } }, { id: 'l', name: 'Lucas', role: { en: 'Manager', pt: 'Diretor' } }], hints: [{ id: 'h1', after: 45, text: { en: "Note the dancer's shoe.", pt: 'Note o sapato.' } }] }` -> hintLeak === 'hint_names_culprit'; same with text en 'Marta was nervous.' -> 'hint_names_culprit'.
 4 "hint listing every innocent is refused": same suspects, text en 'Ricardo and Lucas have witnesses.' -> 'hint_lists_innocents'; text en 'A sharp sound came from the drum room.' pt 'Um som seco veio da sala.' -> null.
 5 "every case in the pack passes the hint check": for each file of Object.values(CASES), hintLeak(loadCase(file)) === null.
Also block 7, package.json: old `node test/prelaunch-ui.mjs"` new `node test/prelaunch-ui.mjs && node test/prelaunch-difficulty.mjs"`.
