Patch CHANGELOG.md, README.md, docs/BUILD_LOG.md, docs/SPEC.md, package.json, test/quick-accuse.mjs. Output exactly eleven REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` with the path given for the block, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: docs for version 0.4.16 of a detective game (quick accusations and two suspicion bar fixes), plus one test gap found by a mutation check (an empty clue must keep the last announced line).

Block 1 (path CHANGELOG.md). Old text (exact, 1 line):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.16 (M2 game feel, sprint 7: quicker accusations)
- Backer feedback: the accuse confirmation slowed down quick players. A checkbox "Confirm before accusing" ("Confirmar antes de acusar") now sits under the accuse buttons. It is checked by default, so nothing changes unless you uncheck it; unchecked, an accuse button accuses at once with no dialog. The choice is remembered in this browser (localStorage key cf-confirm-accuse), survives Start over and a reload, and checking the box again brings the confirmation back. It is a normal labelled checkbox (Tab to reach it, Space to toggle, visible focus ring, 44px tall touch target).
- Fix: the one-time flash of a suspicion row no longer replays when you open the Accuse step later. The flash is only added to a Suspicion panel that is on screen when the lead is found.
- Fix: after a language switch, the screen reader line of the last lead is rewritten in the new language ("New lead: points to Carlos Mendes" becomes "Nova pista: aponta para Carlos Mendes"). It stays empty after Start over.
- New test/quick-accuse.mjs with 9 checks (default on, stored off, turning it back on, reload and language, accuse with and without the dialog, no accusation after the verdict, markup and focus style, flash only on screen, live line language). The automated suite now has 203 checks.
FINISH

Block 2 (path package.json). Old text (exact, 1 line):
  "version": "0.4.15",
New text:
BEGIN
  "version": "0.4.16",
FINISH

Block 3 (path README.md). Old text (exact, 1 line):
(v0.4.15, game feel sprint 6)
New text:
BEGIN
(v0.4.16, game feel sprint 7)
FINISH

Block 4 (path README.md). Old text (exact, 1 line):
Cleared when a clue clears someone).
New text:
BEGIN
Cleared when a clue clears someone). Quick players can uncheck "Confirm before accusing" under the accuse buttons to accuse without the dialog; the choice is remembered and the box is checked by default.
FINISH

Block 5 (path README.md). Old text (exact, 1 line):
194 automated checks.
New text:
BEGIN
203 automated checks.
FINISH

Block 6 (path docs/BUILD_LOG.md). Old text (exact, 1 line):
- Details and receipts: qa/rework.md (M2 game feel sprint 6).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 6).

## M2 game feel sprint 7 (v0.4.16)

- Scope: an optional, remembered skip of the accuse confirmation (backer feedback from Raquel Mattos: the confirm step slows quick players). Checkbox "Confirm before accusing" under the accuse buttons, checked by default, localStorage cf-confirm-accuse, EN/PT, keyboard accessible, checking it again restores the dialog. Fixes from sprint 6: the suspicion row flash no longer replays when the Accuse step opens, and the live line of the last lead follows a language switch.
- Calls 248-251 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). Reproduced first and checked after in mock mode with headless Chrome at 1280 and 390 in English and Portuguese (tools/probe-gf7.mjs). No live play smoke (no model prompt changed).
- Result: npm test 203/203 (was 194), new test/quick-accuse.mjs 9 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 7).
FINISH

Block 7 (path docs/SPEC.md). Old text (exact, 1 line):
- Accuse: the page shows a native confirm (EN "Accuse {name}? You only get one accusation." / PT "Acusar {name}? Você só tem uma acusação.") before POST /api/accuse; Cancel does nothing.
New text:
BEGIN
- Accuse: the page shows a native confirm (EN "Accuse {name}? You only get one accusation." / PT "Acusar {name}? Você só tem uma acusação.") before POST /api/accuse; Cancel does nothing. The confirm is skipped only when the player unchecked "Confirm before accusing" (see quick accusations, sprint 7).
FINISH

Block 8 (path docs/SPEC.md). Old text (exact, 1 line):
## Web page: closing screen
New text:
BEGIN
## Web page: quick accusations (M2 game feel sprint 7)

- Markup: `label#ask-confirm-row.ask-confirm[for=ask-confirm]` right after `#accuse-buttons`, holding `input#ask-confirm` (checkbox, `checked` in the markup) and `span#ask-confirm-text` (EN "Confirm before accusing" / PT "Confirmar antes de acusar").
- `confirmOn()` is false only when localStorage `cf-confirm-accuse` is `off` (no storage or a storage error means on). `setConfirmOn(on)` removes the key when on, stores `off` when off, then `renderConfirmToggle()` sets the checkbox and the label in the current language. The checkbox `change` listener calls `setConfirmOn(checked)`; `renderConfirmToggle()` runs at load and in `setLang()`. Start over does not touch the choice.
- An accuse button does nothing after the verdict; otherwise it calls `accuse(id)` when `!confirmOn()` or the native confirm returns true.
- Suspicion fixes: `renderSuspicion()` adds `flash` only to a `.sus-list` whose `offsetParent` is not null (on screen), so a hidden panel never replays it. `applyClue()` keeps the last announced clue in `susLast` and writes `susSaid(clue)`; an empty clue changes nothing. `relabelSuspicionLive()` (called by `setLang()`) rewrites a non-empty live line in the current language.
- CSS: `.ask-confirm` inline-flex, min-height `var(--touch-min)`; the checkbox is 20px with a 3px `var(--cf-focus)` focus ring.

## Web page: closing screen
FINISH

Block 9 (path docs/SPEC.md). Old text (exact, 1 line):
16. `node test/keyboard.mjs`
New text:
BEGIN
16. `node test/quick-accuse.mjs` (quick accusations: on by default, stored off, back on, reload and Portuguese label, accuse with and without the dialog, nothing after the verdict, markup and focus style, suspicion flash only on screen, live line language)
17. `node test/keyboard.mjs`
FINISH

Block 10 (path docs/SPEC.md). Old text (exact, 1 line):
Total checks: 194 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, suspicion 15, keyboard 13).
New text:
BEGIN
Total checks: 203 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, suspicion 15, quick-accuse 9, keyboard 13).
FINISH

Block 11 (path test/quick-accuse.mjs). Old text (exact, 1 line):
  must(c.live.textContent === 'New lead: clears Maya Santos', 'last lead only ' + c.live.textContent);
New text:
BEGIN
  must(c.live.textContent === 'New lead: clears Maya Santos', 'last lead only ' + c.live.textContent);
  c.api.applyClue({ id: 'z', implicates: null, clears: null });
  must(c.live.textContent === 'New lead: clears Maya Santos', 'an empty clue keeps the last line ' + c.live.textContent);
FINISH
