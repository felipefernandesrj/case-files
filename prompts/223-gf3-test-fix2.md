Patch two files. Output exactly three REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Block 1 (test/hints.mjs). The page sets classes with className, so the fake elements must be checked with className. Old text (exact):
  if (toast.children[0].classList.contains('toast-kicker') === false || toast.children[0].textContent !== 'Hint') throw new Error('Kicker error');
New text:
  if (toast.children[0].className !== 'toast-kicker' || toast.children[0].textContent !== 'Hint') throw new Error(`Expected kicker Hint, found ${toast.children[0].className} ${toast.children[0].textContent}`);

Block 2 (test/hints.mjs). Old text (exact):
  if (toast.children[1].classList.contains('toast-text') === false || toast.children[1].textContent !== 'A silhouette passed the window.') throw new Error('Text error');
New text:
  if (toast.children[1].className !== 'toast-text' || toast.children[1].textContent !== 'A silhouette passed the window.') throw new Error(`Expected toast text, found ${toast.children[1].className} ${toast.children[1].textContent}`);

Block 3 (public/index.html). There is a double blank line before the toasts markup; keep one blank line. Old text (exact, four lines: closing div, empty line, empty line, toasts div):
</div>


<div id="toasts" class="toasts" role="status" aria-live="polite"></div>
New text (three lines):
</div>

<div id="toasts" class="toasts" role="status" aria-live="polite"></div>
