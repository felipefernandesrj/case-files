# Task (sprint 6): README.md refresh
Facts for this release (v0.2.5, M1 sprint 6): new player guide docs/HOW_TO_PLAY.md in English and Portuguese (how to play, scoring, tips, what happens when capacity runs out, accessibility, terminal play); clearer, friendlier messages when the game cannot answer (EN/PT, "This case is out of play capacity for now. Backers can refill it on FullCup..."), PT no longer translates "Cup" as "Copo"; a failed question (no capacity, rate limit, error) is no longer counted, so it never lowers your score; new test file test/capacity.mjs (6 checks). npm test: 77 automated checks, all pass (was 71).

Two edits in README.md (current lines written by you):
Line 1 (exact):
M1 status (v0.2.4): bilingual (EN / PT-BR) with full PT wording pass, consistent suspects that never invent people, per-suspect history, answers under 60 words, keyboard and screen reader support, CDP tests, scoreboard, fair-play check, CLI, capacity messages, and credits screen. 71 automated checks. Live play requires `FULLCUP_KEY` or `.fullcup-key`.
New: starts with "M1 status (v0.2.5):", keeps all facts of the old line, replaces "capacity messages" with "clear capacity messages (failed questions never count)", says 77 automated checks, keeps the final FULLCUP_KEY sentence.
Line 2 (exact):
See `docs/` for the PRD, the spec and the backbone notes.
New: two lines: first `**New player?** Read [How to play / Como jogar](docs/HOW_TO_PLAY.md).` then the old line unchanged.

Output ONLY two literal edit blocks, each: <<<REPLACE README.md>>> newline, exact old line, newline, ===== (five =), newline, new text, newline, <<<END>>>. No prose, no em-dashes.
