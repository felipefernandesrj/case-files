Patch docs, package.json and one test. Output exactly ten REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` (path given per block), then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. Every new text below is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Block 1 (CHANGELOG.md). Old text (exact):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.15 (M2 game feel, sprint 6: suspicion bars)
- A Suspicion panel (Suspeita in Portuguese) now sits under the conversation and above the accuse buttons, at 1280 and 390. Each suspect has a row with a three pip meter. When a question finds a clue, the pips of the suspect it points to fill up (1 lead, 2 leads; 1 pista, 2 pistas), two or more leads mark the prime suspect (red edge), and a clue that clears someone marks that row Cleared (Inocentado) in green with the name struck through. The row that changed flashes once.
- The server now says which clue a question found: POST /api/ask returns `clue` ({ id, implicates, clears } or null). A question finds a clue when it contains one of the clue keywords of the suspect being asked, ignoring case, and each clue counts once per game.
- Screen readers get a meter per suspect (value 0 to 3 with a text such as "2 leads · prime suspect") and one polite line per new lead ("New lead: points to Carlos Mendes" / "Nova pista: aponta para Carlos Mendes"). Reduced motion turns off the flash. Start over and opening another case file reset the bars; a language switch keeps them and relabels them.
- New test/suspicion.mjs with 15 checks (server: finds the clue, once per game, nothing without a keyword, clearing clue, only the suspect who holds it, new game and any case, Night Train; page: rows in both panels, one lead, prime suspect, cleared, Portuguese, three pip cap, no clue, wiring). The automated suite now has 194 checks.
FINISH

Block 2 (package.json). Old text (exact):
  "version": "0.4.14",
New text:
BEGIN
  "version": "0.4.15",
FINISH

Block 3 (README.md). Old text (exact):
(v0.4.14, game feel sprint 5)
New text:
BEGIN
(v0.4.15, game feel sprint 6)
FINISH

Block 4 (README.md). Old text (exact):
Suspicion bars come in a next sprint.
New text:
BEGIN
Suspicion bars now show, under the conversation and above the accuse buttons, which suspect each clue you found points to (three pips per suspect, prime suspect at two leads, Cleared when a clue clears someone).
FINISH

Block 5 (README.md). Old text (exact):
179 automated checks.
New text:
BEGIN
194 automated checks.
FINISH

Block 6 (docs/BUILD_LOG.md). Old text (exact):
- Details and receipts: qa/rework.md (M2 game feel sprint 5).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 5).

## M2 game feel sprint 6 (v0.4.15)

- Scope: suspicion bars (Felipi approved on 2026-11-14 showing which suspect each clue points to). The server returns the found clue on /api/ask (keyword of the asked suspect's clue, case-insensitive, once per game); the page shows a Suspicion panel under the conversation and above the accuse buttons with a three pip meter per suspect, prime suspect at two leads, Cleared rows, a one-time flash, a polite announcement, EN/PT, reduced motion, reset on Start over and new file.
- Calls 242-247 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). Checked in mock mode with headless Chrome at 1280 and 390 in English and Portuguese (tools/probe-gf6.mjs). No live play smoke (no model prompt changed).
- Result: npm test 194/194 (was 179), new test/suspicion.mjs 15 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 6).
FINISH

Block 7 (docs/SPEC.md). Old text (exact):
## Web page: closing screen
New text:
BEGIN
## Web page: suspicion bars (M2 game feel sprint 6)

- Server: each session has `found` (a Set of clue ids). After a successful answer, POST /api/ask looks for the first clue of the asked suspect that is not found yet and whose keyword appears in the question (lower case on both sides); it is added to `found` and returned as `clue: { id, implicates, clears }`, otherwise `clue: null`.
- Markup: two `.suspicion` sections (`#suspicion-talk` after `#questions-used`, `#suspicion-accuse` before `#accuse-section`), each with `h3.sus-title` and `ul.sus-list`; one visually hidden `#suspicion-live` (aria-live polite) at the top of `#play`.
- State `suspicion` maps a suspect id to `{ hits, cleared, flash }`; `SUS_MAX = 3`. `applyClue(clue)` (called by `askQuestion()` with `data.clue`) adds a hit to `implicates`, marks `clears` as cleared, flags the changed rows, renders and announces "New lead: points to {name}" / "New lead: clears {name}" (PT "Nova pista: aponta para / inocenta {name}").
- `renderSuspicion()` (called by `renderCase()`, so also on a language switch) fills every `.sus-list`: per suspect a li (`is-hot` at two or more hits, `is-cleared`, `flash` once) with `.sus-name`, `.sus-bar` (role meter, aria-valuenow 0 to 3, 0 when cleared, aria-valuetext and aria-label "Suspicion on {name}") holding three `.sus-pip` (`on` when filled) and `.sus-note` ("No leads", "1 lead", "2 leads · prime suspect", "Cleared"; PT "Sem pistas", "1 pista", "2 pistas · principal suspeito", "Inocentado"). `restartGame()` and `openPackFile()` reset `suspicion` and the live line.

## Web page: closing screen
FINISH

Block 8 (docs/SPEC.md). Old text (exact):
15. `node test/keyboard.mjs` (Manual/Keyboard interaction, including Escape twice on the continue box after a wrong verdict)
New text:
BEGIN
15. `node test/suspicion.mjs` (suspicion bars: server clue found once per game by the asked suspect, keywords ignore case, Night Train; page rows in both panels, one lead, prime suspect, cleared, Portuguese, three pip cap, no clue, wiring and reduced motion)
16. `node test/keyboard.mjs` (Manual/Keyboard interaction, including Escape twice on the continue box after a wrong verdict)
FINISH

Block 9 (docs/SPEC.md). Old text (exact):
Total checks: 179 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, keyboard 13).
New text:
BEGIN
Total checks: 194 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, suspicion 15, keyboard 13).
FINISH

Block 10 (test/suspicion.mjs). Old text (exact):
  c.api.applyClue({ id: 'c4', implicates: null, clears: 'maya' });
  const li = c.row(0, 'maya');
New text:
BEGIN
  c.api.applyClue({ id: 'x', implicates: 'maya', clears: null });
  c.api.applyClue({ id: 'c4', implicates: null, clears: 'maya' });
  const li = c.row(0, 'maya');
FINISH
