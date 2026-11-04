# Task (sprint 9): docs for v0.2.8
What changed this sprint: scoreboard player names are now shown as plain text (each cell is built with textContent), so a name like `<img src=x onerror=alert(1)>` shows up as those characters and never runs as HTML for other players. New check "scoreboard shows player names as plain text" (it runs the page's loadScores with a fake page and an HTML-looking name). Total 89 automated checks (was 88). Also two whitespace nits from sprint 8: CHANGELOG.md starts with 2 empty lines, README.md has 2 empty lines before the M1 status line.

Output ONLY these 5 literal edit blocks. Format: <<<REPLACE path>>> newline, OLD exactly as given, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. IMPORTANT: the line right after ===== is the first line of NEW; do NOT put an empty line after =====, and do not add empty lines that are not asked for. No prose, no fences, no em-dashes.

Block 1, CHANGELOG.md. The file starts with 2 empty lines, then `# Changelog`. OLD is exactly 3 lines: an empty line, an empty line, `# Changelog`. So you write `<<<REPLACE CHANGELOG.md>>>`, then 2 empty lines, then `# Changelog`, then `=====`. NEW is exactly these 6 lines (copy them, the 4th line is empty):
# Changelog

## 0.2.8 (M1 sprint 9, scoreboard names as plain text)
- Scoreboard player names are shown as plain text, never as HTML.
- Added check that runs the scoreboard with an HTML-looking name.
- Removed extra empty lines at the top of this file and in the README.
After the NEW lines (still inside NEW) put one empty line, so that the next existing line `## 0.2.7 ...` stays separated by one empty line. Note: the file already has an empty line after `# Changelog`, so NEW must end with `- Removed extra empty lines at the top of this file and in the README.` and nothing else.

Block 2, README.md. OLD is exactly these 4 lines (the 2nd and 3rd are empty):
Then open http://localhost:3000. The key stays on the server, and the browser never sees it.


M1 status (v0.2.7):
NEW is exactly these 3 lines (the 2nd is empty):
Then open http://localhost:3000. The key stays on the server, and the browser never sees it.

M1 status (v0.2.8):

Block 3, README.md. OLD is exactly `CDP tests, scoreboard, personal best` NEW is exactly `CDP tests, scoreboard (names shown as plain text), personal best`

Block 4, README.md. OLD is exactly `88 automated checks.` NEW is exactly `89 automated checks.`

Block 5, docs/SPEC.md. OLD is exactly this 1 line:
- Records player name (max 24 chars), score, questions asked, correctness, language, and case ID.
NEW is exactly these 3 lines (the 3rd is empty, so the next heading gets its blank line):
- Records player name (max 24 chars), score, questions asked, correctness, language, and case ID.
- The page renders every scoreboard cell with textContent, so player names are plain text, never HTML.

