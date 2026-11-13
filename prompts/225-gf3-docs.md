Patch docs. Output exactly ten REPLACE blocks, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. Every new text below is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Block 1 (CHANGELOG.md). Old text (exact, one line):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.12 (M2 game feel, sprint 3: timed hint toasts)
- Timed hint events now appear as on-screen toasts while the player works the case. Each case file has three hints (for example "A silhouette pushing a cart passed the instrument room window." in The Vanishing Violin, or "A silhouette in a white apron passed the luggage car window." in The Night Train) that show up 45, 100 and 160 seconds into a game. A toast carries a Hint label (Pista in Portuguese), slides in at the bottom of the screen above the phone dock, stays for 8 seconds and fades out; at most two are on screen. Toasts are announced politely to screen readers and do not move when the player asks for reduced motion.
- Hints follow the language of the moment they appear, stop after the verdict, and start again from zero on Start over and when another case file is opened.
- Pins now follow the language: a room pinned in English shows its Portuguese name on the board and in the rail after a switch to Portuguese, and back.
- New test/hints.mjs with 12 checks (toast markup, hints in both case files, hints in the public case per language, one timer per hint, English toast, current language at fire time, no hint after the verdict, restart clears pending hints, at most two toasts, fade then removal, hints start on every new game with toast CSS, pins follow the language). The automated suite now has 156 checks.
FINISH

Block 2 (package.json). Old text (exact):
  "version": "0.4.11",
New text:
BEGIN
  "version": "0.4.12",
FINISH

Block 3 (README.md). Old text (exact):
**M2 in progress (v0.4.11, game feel sprint 2).**
New text:
BEGIN
**M2 in progress (v0.4.12, game feel sprint 3).**
FINISH

Block 4 (README.md). Old text (exact):
Suspicion bars and a continue countdown come in the next sprints.
New text:
BEGIN
Timed hint events now pop up as toasts during a game (three per case, in the current language, never after the verdict), and pinned rooms follow the language switch. Suspicion bars and a continue countdown come in the next sprints.
FINISH

Block 5 (README.md). Old text (exact):
144 automated checks.
New text:
BEGIN
156 automated checks.
FINISH

Block 6 (docs/BUILD_LOG.md). Old text (exact, one line):
- Details and receipts: qa/rework.md (M2 game feel sprint 2).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 2).

## M2 game feel sprint 3 (v0.4.12)

- Scope: timed hint events shown as on-screen toasts (three hints per case in the case JSON, served localised by publicCase, one timer per hint from the start of a game, current language at fire time, none after the verdict, restarted on Start over and on opening another file, at most two toasts, reduced motion respected); pins follow the current language on the board and in the rail.
- Calls 218-225 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). No live play smoke (no model prompt changed, checked in mock mode with headless Chrome screenshots at 1280 and 390 in English and Portuguese).
- Result: npm test 156/156 (was 144), new test/hints.mjs 12 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 3).
FINISH

Block 7 (docs/SPEC.md). Old text (exact, one line):
## Web page: closing screen
New text:
BEGIN
## Web page: hint toasts and pin language (M2 game feel sprint 3)

- Data: each case JSON has `hints`, an array of `{id, after, text{en,pt}}` where `after` is seconds from the start of a game; `publicCase(c, lang)` returns `hints` as `{id, after, text}` with text in that language.
- Markup: `#toasts` (class `toasts`, role status, aria-live polite) is a direct child of body, right before the page script.
- `startHints()` clears pending timers (`stopHints()`), empties `#toasts` and sets one timer per hint at `after * 1000` ms. When a timer fires it does nothing if `gameOver` is true; otherwise it reads the hint with the same id from the current `caseData` (so a language switch is respected) and calls `showToast(text)`. `init()`, `openPackFile(id)` and `restartGame()` call `startHints()`.
- `showToast(text)` appends a `.toast` with a `.toast-kicker` (Hint or Pista) and a `.toast-text`, keeps at most two toasts, adds `is-out` after 8000 ms and removes the toast 400 ms later.
- CSS: `.toasts` is fixed at the bottom centre (above `--dock-h` on phones), toasts slide in over 350 ms and fade out over 400 ms, no animation with reduced motion.
- Pins: `renderBoard()` shows each pin with the name of the room with the same id in the current `caseData.rooms`, falling back to the stored label.

## Web page: closing screen
FINISH

Block 8 (docs/SPEC.md). Old text (exact):
12. `node test/keyboard.mjs` (Manual/Keyboard interaction)
New text:
BEGIN
12. `node test/hints.mjs` (hint toasts: markup, hints in both case files, localised in the public case, one timer per hint, English toast, current language at fire time, none after the verdict, restart clears pending hints, at most two toasts, fade then removal, started on every new game with toast CSS, pins follow the language)
13. `node test/keyboard.mjs` (Manual/Keyboard interaction)
FINISH

Block 9 (docs/SPEC.md). Old text (exact):
Total checks: 144 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, keyboard 13).
New text:
BEGIN
Total checks: 156 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, keyboard 13).
FINISH

Block 10 (docs/SPEC.md). Old text (exact, one line):
### Case engine (`src/case.js`, M2)
New text:
BEGIN
### Case engine (`src/case.js`, M2)
- `hints`: optional array in a case JSON of `{id, after, text{en,pt}}` timed hint events; `publicCase` passes them on localised (an empty array when missing).
FINISH
