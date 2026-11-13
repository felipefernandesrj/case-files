Patch public/index.html only. Output exactly six REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE public/index.html>>>
old text
=====
new text
<<<END>>>

Context: a gothic-noir detective game (one HTML page with an inline module script). Two product asks. (A) Timed hint events shown as on-screen toasts: `caseData.hints` is an array of {id (string), after (seconds, number), text (string already in the current language)}; while the player is in a game, each hint appears as a toast `after` seconds after the game started, never after the verdict. (B) Pins on the board must follow the current language: a pin stores {id, label} with the room name in the language it was pinned in; the board and the rail must show the room name of the current language (from `caseData.rooms`, array of {id, name}), falling back to the stored label. Existing globals: `caseData`, `lang` ('en' or 'pt'), `gameOver` (boolean), `pins`. A language switch reloads caseData in the new language, so a hint must read its text from caseData at the moment it fires.

Block 1. Old text (exact):
<script type="module">
New text: one new line before it, then the same line:
<div id="toasts" class="toasts" role="status" aria-live="polite"></div>
<script type="module">

Block 2. Old text (exact):
let sceneFront = 0;
New text: keep that line unchanged, then add new top-level code at column 0 (2 spaces per indent level inside functions):
- `let hintTimers = [];`
- `function stopHints() { hintTimers.forEach(t => clearTimeout(t)); hintTimers = []; }`
- `function showToast(text) { ... }` that does, in order: get #toasts as box; if no box or no text, return. Create a div t with className 'toast'. Create a strong k with className 'toast-kicker' and textContent (lang === 'pt' ? 'Pista' : 'Hint'). Create a span s with className 'toast-text' and textContent text. Append k then s to t, append t to box. While box.children.length > 2, remove box.firstElementChild. Then `setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 400); }, 8000);`
- `function startHints() { ... }` that does, in order: stopHints(); get #toasts as box and if it exists set box.innerHTML = ''; const hints = (caseData && caseData.hints) || []; for each h of hints: const id = h.id; push onto hintTimers the result of `setTimeout(() => { if (gameOver) return; const cur = ((caseData && caseData.hints) || []).find(x => x.id === id); if (cur) showToast(cur.text); }, (Number(h.after) || 0) * 1000)`.

Block 3. Old text (exact):
  await setLang('en');
New text: the same line, then a new line `  startHints();` (2 spaces of indent).

Block 4. Old text (exact):
  showStep('briefing');
New text: the same line, then a new line `  startHints();` (2 spaces of indent).

Block 5. Old text (exact):
  if (typeof showStep === 'function') showStep('briefing');
New text: the same line, then a new line `  startHints();` (2 spaces of indent).

Block 6. Old text (exact):
  pins.forEach((p, i) => {
New text (one line, same 2-space indent; it maps each pin to the current-language label while keeping the index order, so removal by index still works):
  pins.map(p => { const room = ((caseData && caseData.rooms) || []).find(r => r.id === p.id); return { id: p.id, label: room ? room.name : p.label }; }).forEach((p, i) => {
