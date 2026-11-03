# Task (sprint 6): CHANGELOG.md entry
Facts (v0.2.5, M1 sprint 6, docs + polish): new player guide docs/HOW_TO_PLAY.md in English and Portuguese (how to play, scoring, tips, what happens when capacity runs out, accessibility, terminal play), linked from the README; clearer, friendlier EN/PT messages when the game cannot answer, and PT no longer translates "Cup" as "Copo"; a failed question (no capacity, rate limit or error) is no longer counted, so it never lowers your score and the suspect does not remember it; new test file test/capacity.mjs (6 checks), npm test 77 checks, all pass (was 71).
Exact old line in CHANGELOG.md:
# Changelog
New text: "# Changelog", a blank line, then "## 0.2.5 (M1 sprint 6, player guide + fair capacity messages)" and 3 to 4 bullets starting with "- ", then a blank line. Plain friendly English, no em-dashes.
Output ONLY one literal edit block: <<<REPLACE CHANGELOG.md>>> newline, exact old line, newline, ===== (five =), newline, new text, newline, <<<END>>>. No prose.
