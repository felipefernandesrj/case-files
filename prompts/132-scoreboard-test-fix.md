# Task (sprint 7): fix one check in your test/scoreboard.mjs
In test 6 this line contradicts the contract (recordResult never throws) and is also a no-op, because the assert(false) inside the try is swallowed by the catch:
    try { recordResult(sThrow, 'en', {score: 1, questions: 1, correct: true}, NOW); assert(false, "should have thrown"); } catch (e) {}
Replace it with a check that recordResult on throwingStorage() does not throw and returns isNew true and best.score 1 (one line, 4-space indent, no try/catch).

Output ONLY one literal edit block: <<<REPLACE test/scoreboard.mjs>>> newline, the current line exactly, newline, =====, newline, the new line, newline, <<<END>>>. Separator is exactly five = characters. No prose, no fences.
