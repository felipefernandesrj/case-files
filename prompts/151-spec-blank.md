# Task (sprint 10): remove one of two empty lines in docs/SPEC.md
In docs/SPEC.md the line `6. ...keyboard...` is followed by TWO empty lines before `Total checks: 90 ...`. Keep exactly one. Do not change anything else.

Answer as one unified-diff hunk inside a REPLACE block: `-` marks a removed line, a leading space marks an unchanged context line. Output ONLY these lines, nothing else:
<<<REPLACE docs/SPEC.md>>>
@@
 6. `node test/keyboard.mjs` (Manual/Keyboard interaction)
 
-
 Total checks: 90 (e2e: 42, proxy: 12, consistency: 4, capacity: 6, scoreboard: 13, keyboard: 13).
<<<END>>>
Line 3 of the hunk is a single space (kept empty line), line 4 is a single minus sign (removed empty line). No `=====`, no prose, no fences.
