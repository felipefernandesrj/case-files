Patch public/index.html only. Output exactly five REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE public/index.html>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game (one HTML page with an inline module script). Timed hint toasts already exist (showToast, startHints). Bug: a toast already on screen keeps its language after the player switches EN/PT (only new toasts use the new language). Fix: each toast remembers its hint id in a data-hint attribute, and after a language switch reloads caseData, relabelToasts() rewrites the kicker and the text of every toast on screen from the current caseData.hints. Existing globals: caseData, lang ('en' or 'pt').

Block 1. Old text (exact, two lines):
function showToast(text) {
  const box = document.getElementById('toasts');
New text:
BEGIN
function showToast(text, id) {
  const box = document.getElementById('toasts');
FINISH

Block 2. Old text (exact, one line):
  t.className = 'toast';
New text:
BEGIN
  t.className = 'toast';
  if (id) t.setAttribute('data-hint', id);
FINISH

Block 3. Old text (exact, one line):
      if (cur) showToast(cur.text);
New text:
BEGIN
      if (cur) showToast(cur.text, cur.id);
FINISH

Block 4. Old text (exact, two lines):
  renderCabinet();
  if (lastAccuseResult) renderVerdict(false);
New text:
BEGIN
  renderCabinet();
  relabelToasts();
  if (lastAccuseResult) renderVerdict(false);
FINISH

Block 5. Old text (exact, one line):
async function setLang(newLang) {
New text (a new top-level function at column 0, 2 spaces per indent level, then the same old line unchanged):
BEGIN
function relabelToasts() {
  const box = document.getElementById('toasts');
  if (!box) return;
  const hints = (caseData && caseData.hints) || [];
  for (const t of Array.from(box.children)) {
    const cur = hints.find(x => x.id === t.getAttribute('data-hint'));
    const k = t.children[0];
    const s = t.children[1];
    if (k) k.textContent = lang === 'pt' ? 'Pista' : 'Hint';
    if (cur && s) s.textContent = cur.text;
  }
}
async function setLang(newLang) {
FINISH
