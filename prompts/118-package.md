# Task (sprint 6): add the new test file to npm test
Current line in package.json (exact, 4-space indent):
    "test": "node test/e2e.mjs && node test/proxy.mjs && node test/consistency.mjs && node test/keyboard.mjs"
Add `node test/capacity.mjs` right after test/consistency.mjs, keep the rest.
Output ONLY one literal edit block: <<<REPLACE package.json>>> newline, that exact line, newline, =====, newline, the new line, newline, <<<END>>>. No prose.
