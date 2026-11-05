# Task (sprint 10): docs for v0.2.9
Output ONLY these 5 literal edit blocks. Format: <<<REPLACE path>>> newline, OLD exactly as given, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. The line right after ===== is the first line of NEW; do NOT put an empty line after =====. No prose, no fences, no em-dashes.

Block 1, CHANGELOG.md. OLD is exactly this 1 line:
## 0.2.8 (M1 sprint 9, scoreboard names as plain text)
NEW is a new entry, then an empty line, then that same OLD line. The new entry is exactly:
## 0.2.9 (M1 sprint 10, tidy-up)
- Scoreboard code indentation fixed (no behaviour change).
- package.json version now follows this changelog (was 1.0.0).
- Added check that package.json and the latest changelog entry share the same version.
- SPEC testing section lists all six test files and the real check count.

Block 2, README.md. OLD is exactly: M1 status (v0.2.8):
NEW is exactly: M1 status (v0.2.9):

Block 3, README.md. OLD is exactly: 89 automated checks.
NEW is exactly: 90 automated checks.

Block 4, docs/SPEC.md. OLD is exactly these 2 lines:
3. `node test/keyboard.mjs` (Manual/Keyboard interaction)

NEW is exactly these 4 lines (then the same empty line):
3. `node test/consistency.mjs` (Case consistency)
4. `node test/capacity.mjs` (Capacity messages)
5. `node test/scoreboard.mjs` (Scoreboard, personal best, version check)
6. `node test/keyboard.mjs` (Manual/Keyboard interaction)

Block 5, docs/SPEC.md. OLD is exactly this 1 line:
Total checks: 67 (e2e: 42, proxy: 12, keyboard: 13).
NEW is exactly this 1 line:
Total checks: 90 (e2e: 42, proxy: 12, consistency: 4, capacity: 6, scoreboard: 13, keyboard: 13).
