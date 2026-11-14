Patch test/continue.mjs only. Output exactly one REPLACE block, then stop. The block is: a marker line `<<<REPLACE test/continue.mjs>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. NEVER emit <<<FILE>>>. No commentary, no markdown fences. The new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: fnSource(name) returns the source starting at `function name(`, so it never contains the word async in front. This assertion is wrong and must check the signature without async.

Old text (exact, one line):
  must(r.includes('async function restartGame(skipConfirm = false){'), 'sig mismatch');
New text:
BEGIN
  must(r.startsWith('function restartGame(skipConfirm = false){'), 'restartGame signature without skipConfirm');
FINISH
