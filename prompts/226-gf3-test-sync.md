Patch test/hints.mjs only. Output exactly five REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE test/hints.mjs>>>
old text
=====
new text
<<<END>>>

Context: check(name, fn) is synchronous and does not await, so an async callback that throws is reported as PASS. loadCase and publicCase are synchronous. Make checks 2 and 3 synchronous.

Block 1. Old text (exact):
check('case files carry hints', async () => {
New text:
check('case files carry hints', () => {

Block 2. Old text (exact, the line inside check 2, 4 spaces of indent):
    const c = await loadCase(f);
    if
New text: the same two lines without the word await and its space:
    const c = loadCase(f);
    if

Block 3. Old text (exact):
check('publicCase localises hints', async () => {
New text:
check('publicCase localises hints', () => {

Block 4. Old text (exact, two lines inside check 3):
    const c = await loadCase(f);
    for (const l of ['en', 'pt']) {
New text:
    const c = loadCase(f);
    for (const l of ['en', 'pt']) {

Block 5. Old text (exact):
      const pc = await publicCase(c, l);
New text:
      const pc = publicCase(c, l);
