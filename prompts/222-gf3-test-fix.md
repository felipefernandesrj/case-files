Patch two files. Output exactly three REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Block 1 (test/hints.mjs). The page sets the class with `t.className = 'toast'`, so the fake element has className, not a classList entry. Old text (exact):
  if (!toast.classList.contains('toast')) throw new Error('Missing toast class');
New text:
  if (toast.className !== 'toast') throw new Error(`Expected className toast, found ${toast.className}`);

Block 2 (test/hints.mjs). The CSS has several prefers-reduced-motion rules; the toast one is a single line. Old text (exact, two lines):
  const motionRule = css.substring(css.indexOf('prefers-reduced-motion'), css.indexOf('}', css.indexOf('prefers-reduced-motion')));
  if (!motionRule.includes('.toast') || !motionRule.includes('animation: none')) throw new Error('Motion rule invalid');
New text (two lines, same 2-space indent):
  const motionRule = css.split('\n').find(l => l.includes('prefers-reduced-motion') && l.includes('.toast'));
  if (!motionRule || !motionRule.includes('animation: none')) throw new Error(`Expected a one-line reduced motion rule for .toast with animation: none, found ${motionRule}`);

Block 3 (package.json). Old text (exact, it is inside the "test" script line):
node test/scene.mjs && node test/keyboard.mjs
New text:
node test/scene.mjs && node test/hints.mjs && node test/keyboard.mjs
