Patch docs. Output exactly nine REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` (path given per block), then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. Every new text below is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Block 1 (CHANGELOG.md). Old text (exact, one line):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.13 (M2 game feel, sprint 4: readable board heading and caption, toasts follow the language)
- The Evidence board heading (Quadro de evidências in Portuguese) and the scene caption (Scene: Instrument room, or Cena: Sala de instrumentos) were light text on the light cork texture and hard to read (measured contrast 1.68:1 and 2.15:1). Both now sit on a dark ink plate with light text, about 13.7:1, well above the WCAG AA 4.5:1 minimum, checked at 1280 and 390 wide in English and Portuguese. The heading plate is only as wide as its text and keeps a small lamp-coloured edge.
- A hint toast that is already on screen now switches language when the player switches EN/PT (before, only the next toast used the new language). Each toast remembers which hint it shows, and after the switch its label (Hint or Pista) and its text are rewritten in the new language. A toast whose hint is not in the case keeps its text.
- New test/legibility.mjs with 8 checks (heading on an ink plate, light caption text, heading contrast AA, caption contrast AA, toast remembers its hint id, open toast switches language and back, unknown toast keeps its text, language switch relabels open toasts). The automated suite now has 164 checks.
FINISH

Block 2 (package.json). Old text (exact):
  "version": "0.4.12",
New text:
BEGIN
  "version": "0.4.13",
FINISH

Block 3 (README.md). Old text (exact):
**M2 in progress (v0.4.12, game feel sprint 3).**
New text:
BEGIN
**M2 in progress (v0.4.13, game feel sprint 4).**
FINISH

Block 4 (README.md). Old text (exact):
Suspicion bars and a continue countdown come in the next sprints.
New text:
BEGIN
The board heading and the scene caption now sit on a dark plate so they stay readable on the cork, and a hint toast already on screen switches language with the page. Suspicion bars and a continue countdown come in the next sprints.
FINISH

Block 5 (README.md). Old text (exact):
156 automated checks.
New text:
BEGIN
164 automated checks.
FINISH

Block 6 (docs/BUILD_LOG.md). Old text (exact, one line):
- Details and receipts: qa/rework.md (M2 game feel sprint 3).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 3).

## M2 game feel sprint 4 (v0.4.13)

- Scope: readable Evidence board heading and scene caption (dark ink plate rgba(12,11,10,0.88) with light text, contrast from 1.68:1 and 2.15:1 to about 13.7:1, 1280 and 390, EN and PT); a hint toast already on screen follows a language switch (data-hint id on each toast, relabelToasts() after setLang reloads the case).
- Calls 228-233 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). No live play smoke (no model prompt changed, checked in mock mode with headless Chrome at 1280 and 390 in English and Portuguese, tools/probe-gf4.mjs).
- Result: npm test 164/164 (was 156), new test/legibility.mjs 8 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 4).
FINISH

Block 7 (docs/SPEC.md). Old text (exact, one line):
## Web page: closing screen
New text:
BEGIN
## Web page: readable board heading and toast language (M2 game feel sprint 4)

- CSS: `#board-title` sits on an ink plate (`background: rgba(12,11,10,0.88)`, `color: var(--cf-text)`, lamp left border, width fit-content); `.scene-label` uses `color: var(--cf-text)` on `rgba(12,11,10,0.88)`. Both keep at least 4.5:1 contrast even over the lightest page colour #F3EADF.
- `showToast(text, id)` stores the hint id in `data-hint`; `startHints()` passes `cur.id`.
- `relabelToasts()` rewrites the kicker (Hint or Pista) of every toast in `#toasts` and its text from the hint with the same id in the current `caseData.hints`; a toast with an unknown id keeps its text. It never adds or removes toasts. `setLang()` calls it after the case is reloaded in the new language.

## Web page: closing screen
FINISH

Block 8 (docs/SPEC.md). Old text (exact):
13. `node test/keyboard.mjs` (Manual/Keyboard interaction)
New text:
BEGIN
13. `node test/legibility.mjs` (board heading and scene caption on an ink plate with AA contrast, toast remembers its hint id, open toast switches language and back, unknown toast keeps its text, language switch relabels open toasts)
14. `node test/keyboard.mjs` (Manual/Keyboard interaction)
FINISH

Block 9 (docs/SPEC.md). Old text (exact):
Total checks: 156 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, keyboard 13).
New text:
BEGIN
Total checks: 164 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, keyboard 13).
FINISH
