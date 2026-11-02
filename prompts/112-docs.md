# Task (sprint 5): README status line and CHANGELOG entries
Facts:
- Sprint 4 (already shipped, never got a changelog entry): full PT-BR wording pass of the case and UI ("jovem violinista prodígio", PT scoreboard and verdict text), a closing "Thanks to the backers" / "Obrigado aos apoiadores" screen from data/credits.json with GET /api/credits, the case now reloads in Portuguese when you switch language, focus is kept on language switch and after the verdict; 67 automated checks.
- Sprint 5 (this one): suspects now get their private facts and their own clues in the role-play prompt, a list of the only three people in the case with a rule to never invent anyone else, and a rule to keep their story consistent; the server now remembers each question together with its answer per suspect, so a suspect sees what it was asked before (failed calls add nothing). Live check through the Cup in EN and PT: Maya kept the scratched lock story across 3 questions in both languages, Carlos named only the three people in the case and said he cleans alone (no more invented "Joe the janitor"). New offline test file test/consistency.mjs (4 tests) and a live smoke script test/live-consistency.mjs (10 checks, not part of npm test). npm test: 71 checks, all pass (was 67).
Write in plain, friendly English, no em-dashes.

Current README status line (written by you), the only README line to change:
M1 status: bilingual (EN / PT-BR) with full PT wording pass, per-suspect history, answers under 60 words, keyboard and screen reader support, CDP tests, scoreboard, fair-play check, CLI, capacity messages, and credits screen. 67 automated checks. Live play requires `FULLCUP_KEY` or `.fullcup-key`.

Current CHANGELOG.md first two lines:
# Changelog
## 0.2.2 (M1 sprint 3, wording + keyboard access)

Output ONLY literal edit blocks:
1. <<<REPLACE README.md>>> old = that exact status line, ===== , new = a status line that starts with "M1 status (v0.2.4):", mentions consistent suspects that never invent people, and says 71 automated checks; keep the other facts of the old line and the final sentence about FULLCUP_KEY. <<<END>>>
2. <<<REPLACE CHANGELOG.md>>> old = the exact line "# Changelog", ===== , new = "# Changelog", a "## 0.2.4 (M1 sprint 5, consistent suspects)" section with 3 to 4 bullets, then a "## 0.2.3 (M1 sprint 4, Portuguese wording + backer credits)" section with 3 to 4 bullets. <<<END>>>
Each block: <<<REPLACE path>>> newline, old, newline, =====, newline, new, newline, <<<END>>>. No prose.
