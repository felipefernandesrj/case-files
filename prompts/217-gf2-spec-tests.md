Patch two files. Output exactly three REPLACE blocks, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. The new text of blocks 2 and 3 is given in full: copy it exactly.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Block 1 (docs/SPEC.md). Old text (exact):
11. `node test/keyboard.mjs` (Manual/Keyboard interaction)
New text (exact, two lines):
11. `node test/scene.mjs` (scene backdrop: markup, driven by the room list, first room and caption, crossfade and no new fade for the same room, Portuguese caption, cleared on reset, dimmed backdrop with fade and reduced motion, CASE CLOSED stamp below the score)
12. `node test/keyboard.mjs` (Manual/Keyboard interaction)

Block 2 (docs/SPEC.md). Old text (exact):
Total checks: 136 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, keyboard 13).
New text (exact):
Total checks: 144 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, keyboard 13).

Block 3 (CHANGELOG.md). The new 0.4.11 section ends with two blank lines; make it one. Old text (exact, the last bullet line, then two empty lines, then the next heading):
 The automated suite now has 144 checks.


## 0.4.10
New text (exact):
 The automated suite now has 144 checks.

## 0.4.10
