# Task (sprint 7): the personal best section is never shown
In public/index.html your new section is `  <section id="best-section" hidden>` but no code ever un-hides it, so players never see their best scores or the reset button. It must be visible from the start (it shows "No best score yet" texts) and keep aria-labelledby="best-title". Also add a check to test 10 of test/scoreboard.mjs so this cannot come back.

Output ONLY two literal edit blocks:
1. <<<REPLACE public/index.html>>> newline, `  <section id="best-section" hidden>` exactly, newline, =====, newline, `  <section id="best-section" aria-labelledby="best-title">`, newline, <<<END>>>
2. <<<REPLACE test/scoreboard.mjs>>> newline, the exact line `    assert(html.includes('id="best-section"'), "missing best-section");`, newline, =====, newline, that same line, newline, a new line (4-space indent) asserting that the `<section id="best-section" ...>` opening tag (find it with a regex like /<section id="best-section"[^>]*>/) does not contain the word hidden and does contain aria-labelledby="best-title", newline, <<<END>>>
Separator is exactly five = characters on its own line. No prose, no fences.
