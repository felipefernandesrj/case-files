Patch test/scoreboard.mjs only. Output exactly one REPLACE block, then stop. Format: exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE test/scoreboard.mjs>>>
old text
=====
new text
<<<END>>>

Context: restartGame() in the page now ends with a call to startHints() (it restarts the timed hint toasts). The "restartGame start over" check builds restartGame inside new Function with stub globals, and it now fails with "startHints is not defined". Add a no-op stub next to the existing setGameOver stub, inside the same JavaScript string literal.

Old text (exact, this is part of a single-quoted string on one line; the backslash n is the two characters backslash and n):
function setGameOver(on){ gameOver = !!on; }\n
New text:
function setGameOver(on){ gameOver = !!on; } function startHints(){}\n
