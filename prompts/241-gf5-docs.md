Patch docs and one blank line. Output exactly ten REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` (path given per block), then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. Every new text below is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Block 1 (CHANGELOG.md). Old text (exact, one line):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.14 (M2 game feel, sprint 5: continue countdown after a wrong verdict)
- A wrong accusation now opens an arcade style CONTINUE? box (CONTINUAR? in Portuguese) in the middle of the screen with a big number that counts down from 9 to 0, one step per second, with a short pulse on every step. Try again (Tentar de novo) has the focus, so Enter or Space starts the same case file again right away, without the Start over question. Give up (Desistir) or Escape ends the countdown.
- While the countdown runs, the verdict only says Wrong! and the score; the culprit and the solution stay hidden so a retry is still a real retry. When the count passes 0, or the player gives up, the box turns into GAME OVER (FIM DE JOGO) with "The culprit got away. Use Start over to reopen the case.", the culprit and solution appear in the verdict, and a Close button (Escape also closes) puts the focus back on Start over.
- Screen readers hear one polite announcement when the box opens ("Continue? You have 10 seconds. Enter tries the case again, Escape gives up.") and one at GAME OVER, not every number. With reduced motion the pulse is off and the countdown still runs. A correct accusation never shows the box, and Start over, opening another case file and a language switch keep it right (cleared or relabelled).
- Fix: Start over and a link with ?case= created the game session without the case id, so the server played the default file while the page showed another one (accusing a Night Train suspect after Start over failed with "unknown suspect"). Both now send the case id.
- New test/continue.mjs with 15 checks (markup and live region, starts at 9 with focus on Try again, counts down to 0 then GAME OVER, pulse on every tick, Portuguese labels, game over reveals the verdict, Try again restarts the same case without asking, Close returns focus, only a wrong verdict starts it, culprit hidden while counting, Start over and new file stop it, sessions carry the case id, Escape gives up then closes, reduced motion drops only the pulse, language switch relabels it). The keyboard test now walks the wrong verdict with Escape twice. The automated suite now has 179 checks.
FINISH

Block 2 (package.json). Old text (exact):
  "version": "0.4.13",
New text:
BEGIN
  "version": "0.4.14",
FINISH

Block 3 (README.md). Old text (exact):
(v0.4.13, game feel sprint 4)
New text:
BEGIN
(v0.4.14, game feel sprint 5)
FINISH

Block 4 (README.md). Old text (exact):
Suspicion bars and a continue countdown come in the next sprints.
New text:
BEGIN
A wrong accusation now opens an arcade CONTINUE? countdown from 9 to 0: Try again replays the same file, Give up or the end of the count shows GAME OVER with the culprit and the solution. Suspicion bars come in a next sprint.
FINISH

Block 5 (README.md). Old text (exact):
164 automated checks.
New text:
BEGIN
179 automated checks.
FINISH

Block 6 (docs/BUILD_LOG.md). Old text (exact, one line):
- Details and receipts: qa/rework.md (M2 game feel sprint 4).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 4).

## M2 game feel sprint 5 (v0.4.14)

- Scope: arcade CONTINUE countdown after a wrong verdict (9 to 0, Try again replays the same file without the confirm, Give up or Escape or the end of the count shows GAME OVER and reveals the culprit and solution, Close returns focus to Start over, one polite announcement at start and at game over, reduced motion drops only the pulse, never after a correct verdict, cleared by Start over and by opening another file, relabelled on a language switch); fix: Start over and ?case= links now create the session with the case id.
- Calls 234-241 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). No live play smoke (no model prompt changed, checked in mock mode with headless Chrome at 1280 and 390 in English and Portuguese, tools/probe-gf5.mjs and tools/probe-gf5-urlcase.mjs).
- Result: npm test 179/179 (was 164), new test/continue.mjs 15 checks, test/keyboard.mjs step 6 updated.
- Details and receipts: qa/rework.md (M2 game feel sprint 5).
FINISH

Block 7 (docs/SPEC.md). Old text (exact, one line):
## Web page: closing screen
New text:
BEGIN
## Web page: continue countdown (M2 game feel sprint 5)

- Markup: `#continue` (role group, labelled by `#continue-title`, hidden by default) with `#continue-num` (aria-hidden), `#continue-note` and the buttons `#continue-yes`, `#continue-no`, `#continue-close`; a visually hidden `#continue-live` (aria-live polite) outside it.
- State `contState` is 'off', 'run' or 'over'; `CONT_FROM = 9`. `accuse()` calls `startContinue()` only when the verdict is wrong, before `renderVerdict()`; on a wrong verdict the verdict and the credits do not take the focus. `startContinue()` shows 9, announces once, ticks every 1000 ms (pulse class `tick`), focuses Try again; after 0 it calls `endContinue()` (GAME OVER, `renderVerdict(false)`, announce, focus Close). While 'run', `renderVerdict()` leaves out the culprit and solution lines.
- `continueGame()` (Try again) runs only while 'run': `stopContinue()` then `restartGame(true)` (no confirm). Give up and Escape call `endContinue()` while 'run'; Close and Escape while 'over' call `closeContinue()` (focus `#restart-btn`). `restartGame()`, `openPackFile()` stop it, `setLang()` relabels it with `renderContinue()`.
- `restartGame()` posts `{ case: openFile }` to `/api/session`; `init()` posts the `?case=` value. Before, both posted no case and the session played the default file.

## Web page: closing screen
FINISH

Block 8 (docs/SPEC.md). Old text (exact):
14. `node test/keyboard.mjs` (Manual/Keyboard interaction)
New text:
BEGIN
14. `node test/continue.mjs` (continue countdown: markup, 9 to 0 then GAME OVER, pulse, Portuguese labels, verdict reveal, Try again without confirm, Close focus, only after a wrong verdict, culprit hidden while counting, stop on Start over and new file, sessions carry the case id, Escape, reduced motion, language switch)
15. `node test/keyboard.mjs` (Manual/Keyboard interaction, including Escape twice on the continue box after a wrong verdict)
FINISH

Block 9 (docs/SPEC.md). Old text (exact):
Total checks: 164 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, keyboard 13).
New text:
BEGIN
Total checks: 179 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, keyboard 13).
FINISH

Block 10 (public/index.html, remove one empty line). Old text (exact, three lines, the middle line is empty):
document.getElementById('continue-close').addEventListener('click', closeContinue);

document.getElementById('ask-form').addEventListener('submit',askQuestion);
New text:
BEGIN
document.getElementById('continue-close').addEventListener('click', closeContinue);
document.getElementById('ask-form').addEventListener('submit',askQuestion);
FINISH
