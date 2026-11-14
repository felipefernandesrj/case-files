Patch public/index.html only. Output exactly two REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE public/index.html>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game. The Escape handler of the new CONTINUE countdown was added before the older Escape handler of the question box, and an existing test reads the first keydown listener of the page. Move the countdown Escape handler so it comes after the older one, just before the final init(); call. Behaviour does not change.

Block 1 (remove the handler from its current place). Old text (exact, six lines):
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || contState === 'off') return;
  e.preventDefault();
  if (contState === 'run') endContinue();
  else closeContinue();
});
New text (empty: write nothing between the five equals signs line and the <<<END>>> line).

Block 2. Old text (exact, two lines):
});
init();
New text:
BEGIN
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || contState === 'off') return;
  e.preventDefault();
  if (contState === 'run') endContinue();
  else closeContinue();
});
init();
FINISH
