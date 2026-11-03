# Task (sprint 7): run the new test in npm test
In package.json the test script is:
    "test": "node test/e2e.mjs && node test/proxy.mjs && node test/consistency.mjs && node test/capacity.mjs && node test/keyboard.mjs"
Add `node test/scoreboard.mjs` right after `node test/capacity.mjs` (keep keyboard last).
Output ONLY one literal edit block: <<<REPLACE package.json>>> newline, the current line exactly, newline, =====, newline, the new line, newline, <<<END>>>. Separator is exactly five = characters. No prose, no fences.
