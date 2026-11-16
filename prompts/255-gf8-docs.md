Write zero new files and patch existing files. Output exactly eleven REPLACE blocks, then stop. Formats (only marker lines start with <<<; the old text of a REPLACE block has NO < characters added in front of it and no space added before any >):

<<<FILE path>>>
...full content...
<<<END>>>

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Do not write the words OLD or NEW inside a block. No commentary, no markdown fences. The full content of every new file and every new text are given between the lines BEGIN and FINISH: copy them exactly, character for character, and do not output the words BEGIN or FINISH.

Context: docs and version for the talking portrait sprint (v0.4.17) of a detective game. Patch only the documentation, the changelog and the package version.

Block 1 (CHANGELOG.md). Old text (exact, 1 line):
# Changelog
New text:
BEGIN
# Changelog

## 0.4.17 (M2 game feel, sprint 8: talking portraits)
- Every answer in the Conversation log now has the suspect's portrait next to it as a speaker avatar (56px on desktop, 48px on phone). While a new answer is revealed, a few characters at a time (about 1.2 seconds for a two line answer), the portrait's mouth opens and closes; when the line is complete the face is still again.
- The mouth frames are local sprite sheets, not new model calls: scripts/assets/talk_frames.py (CPU only) takes the neutral portrait of each suspect and writes <case>-<id>-talk.png, a two frame sheet (neutral, then the same face with the mouth open). The page swaps the two frames with a CSS steps() animation. Nothing extra is called while you play.
- Only the newest answer talks. Older answers, a suspect switch and a language switch show the lines at once. A click on the conversation finishes the line in progress.
- Accessibility: screen readers get the full answer at once from a hidden copy (the typed copy is aria-hidden), so the log is not read letter by letter. With reduced motion the answer appears at once and the face does not move.
- New test/talk.mjs with 10 checks (avatar and copies, talk sheet of the open case, reveal and mouth, re-render finishes the line, click to finish, reduced motion, only new answers talk, CSS frames, sheet pixels, script coverage). The automated suite now has 213 checks.
FINISH

Block 2 (package.json). Old text (exact, 1 line):
  "version": "0.4.16",
New text:
BEGIN
  "version": "0.4.17",
FINISH

Block 3 (README.md). Old text (exact, 1 line):
(v0.4.16, game feel sprint 7)
New text:
BEGIN
(v0.4.17, game feel sprint 8)
FINISH

Block 4 (README.md). Old text (exact, 1 line):
the choice is remembered and the box is checked by default.
New text:
BEGIN
the choice is remembered and the box is checked by default. Answers in the conversation now come with the suspect's portrait, whose mouth moves while the line is revealed (local two frame sprites, no extra model calls; reduced motion shows the line at once).
FINISH

Block 5 (README.md). Old text (exact, 1 line):
203 automated checks.
New text:
BEGIN
213 automated checks.
FINISH

Block 6 (docs/BUILD_LOG.md). Old text (exact, 1 line):
- Details and receipts: qa/rework.md (M2 game feel sprint 7).
New text:
BEGIN
- Details and receipts: qa/rework.md (M2 game feel sprint 7).

## M2 game feel sprint 8 (v0.4.17)

- Scope: talking portraits. Each answer in the Conversation log gets the suspect's portrait as a speaker avatar; the newest answer is revealed a few characters at a time while the mouth opens and closes (two frame sheet per suspect built locally by scripts/assets/talk_frames.py from the neutral portrait, CSS steps animation, no model call at play time). Screen readers get the full line at once; reduced motion shows it at once with a still face; a click on the log finishes the line.
- Calls 252-255 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). Reproduced first and checked after in mock mode with headless Chrome at 1280 and 390 in English and Portuguese (tools/probe-gf8.mjs). No live play smoke (no model prompt changed).
- Result: npm test 213/213 (was 203), new test/talk.mjs 10 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 8).
FINISH

Block 7 (docs/SPEC.md). Old text (exact, 1 line):
## Web page: closing screen
New text:
BEGIN
## Web page: talking portraits (M2 game feel sprint 8)

- `renderConversation(animateLast)` writes, per question, `p` "Q: ..." / "Pergunta: ..." and `p.answer` holding `span.portrait.speaker` (aria-hidden, initials until the sheet loads), `span.sr-only` with the full line and `span.answer-text` (aria-hidden) with the visible line ("A: ..." / "Resposta: ..."). It calls `stopTalk()` first. Only `askQuestion()` passes `true`, and then only the last answer talks.
- `speakerFace(id)` loads `/assets/characters/<case>-<id>-talk.png` with `whenArt()` and sets `--talk-sheet` plus `has-art has-talk`.
- `startTalk(face, shown)` empties the visible copy, adds `is-talking` and every `TALK_STEP_MS` (30) adds `TALK_CHARS` (2) characters; at the end `stopTalk()` writes the full line and removes `is-talking`. With `prefers-reduced-motion: reduce` it does nothing (line already full). A click on `#log` calls `stopTalk()` while a line is in progress.
- CSS: `#log p.answer` flex row; `#log .speaker` 48px (56px on desktop); `.has-talk` uses the sheet at `background-size: 200% 100%`; `.is-talking` runs `cf-talk` 240ms `steps(1, end)` infinite (frame 1 at 0 0, frame 2 at 100% 0); reduced motion sets `animation: none`.
- Assets: `scripts/assets/talk_frames.py` (CPU, no network) reads each `<case>-<id>-neutral.png` (128px), finds the lip line near a hand measured mouth centre and writes the 256x128 sheet: left the neutral frame unchanged, right the same frame with a small dark open mouth.

## Web page: closing screen
FINISH

Block 8 (docs/SPEC.md). Old text (exact, 1 line):
17. `node test/keyboard.mjs`
New text:
BEGIN
17. `node test/talk.mjs` (talking portraits: speaker avatar with screen reader and visible copies, talk sheet of the open case, reveal and mouth frames, re-render finishes the line, click to finish, reduced motion, only new answers talk, CSS frames, sheet pixels, script coverage)
18. `node test/keyboard.mjs`
FINISH

Block 9 (docs/SPEC.md). Old text (exact, 1 line):
Total checks: 203 (suite:
New text:
BEGIN
Total checks: 213 (suite:
FINISH

Block 10 (docs/SPEC.md). Old text (exact, 1 line):
quick-accuse 9, keyboard 13).
New text:
BEGIN
quick-accuse 9, talk 10, keyboard 13).
FINISH

Block 11 (scripts/assets/README.md). Old text (exact, 1 line):
- Single-file CLI: `process_assets.py`. Fixtures: `make_fixtures.py`.
New text:
BEGIN
- Single-file CLI: `process_assets.py`. Fixtures: `make_fixtures.py`.
- Talking portraits: `talk_frames.py` writes `<case>-<id>-talk.png` (two frames, neutral and mouth open) from each neutral portrait for the Conversation log. Mouth centres are measured by hand in the script; rerun it after a portrait changes.
FINISH
