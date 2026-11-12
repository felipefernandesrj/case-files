Patch docs. Output exactly six REPLACE blocks, then stop. Format: exactly three < characters at the start, then the OLD text copied exactly, then a line of exactly five equals signs, then the NEW text, then <<<END>>>. Do not write the words OLD or NEW inside a block. No commentary, no fences, no <<<FILE>>>. Plain English sentences, no shorthand, no arrows, no em dashes.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Facts for this version 0.4.10 (M2 game feel, sprint 1):
- The desktop right column is never empty any more. It shows a Case progress tracker with the six case steps (Brief, Places, People, Ask, Board, Accuse). A step is ticked with a short slide-in the first time the player opens it, the current step is highlighted, and a counter shows how many of the six are done (for example 3/6). It follows EN/PT and resets on Start over or when another case file is opened. Below it the Pins list shows a hint until the first clue is pinned.
- A correct accusation now lands a red CASE CLOSED rubber stamp (CASO ENCERRADO in Portuguese) on the verdict with a stamp-down animation; it is skipped when the player asks for reduced motion.
- Suspect roles on the light paper cards are now dark red and bold instead of light grey, so they are readable.
- On desktop the verdict box no longer collapses inside the accuse stage.
- New test/progress.mjs with 8 checks (rail never hidden, tracker ids, step order, tracker rendering, tracker safe without its list, visit recorded on step change, stamp text and animation, readable roles and reduced motion). The automated suite now has 136 checks.

Block 1 (CHANGELOG.md). Old text:
# Changelog

New text: the same heading line and blank line, then a new section "## 0.4.10 (M2 game feel, sprint 1: case progress tracker and CASE CLOSED stamp)" with one bullet per fact above, then a blank line.

Block 2 (package.json). Old text:
  "version": "0.4.9",
New text:
  "version": "0.4.10",

Block 3 (package.json). Old text:
node test/budget.mjs && node test/keyboard.mjs
New text:
node test/budget.mjs && node test/progress.mjs && node test/keyboard.mjs

Block 4 (README.md). Old text:
**M2 in progress (v0.4.8, sprint 4).**
New text:
**M2 in progress (v0.4.10, game feel sprint 1).**

Block 5 (README.md). Old text:
Game mechanics, motion and generated art are scheduled after this polish (see the run notes). Placeholder art only; generated images are not shipped yet.
New text: two or three sentences: the game now ships pixel art generated through the Cup key (portraits, rooms, case covers, icons). Game feel has started: a Case progress tracker in the desktop right column and an animated CASE CLOSED stamp on a correct accusation. Suspicion bars and a continue countdown come in the next sprints.

Block 6 (README.md). Old text:
127 automated checks.
New text:
136 automated checks.
