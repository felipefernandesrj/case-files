Patch public/css/game.css, public/index.html. Output exactly eight REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` with the path given for the block, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game (one HTML page with an inline module script, plus its stylesheet). Three small changes. (1) Players who accuse quickly can turn off the accuse confirmation: a checkbox 'Confirm before accusing' (Portuguese 'Confirmar antes de acusar') under the accuse buttons, checked by default, remembered in localStorage (key cf-confirm-accuse, value off when unchecked); unchecking it skips the confirm dialog, checking it again brings the dialog back. (2) The one-time row flash of the suspicion bars is only added to lists that are on screen, so a hidden panel does not replay the flash when it is opened later. (3) The polite live line of the last lead is rewritten in the current language after a language switch. Existing globals: lang ('en' or 'pt'), caseData, store (localStorage or null), suspicion, LABELS. Old texts with closing tags have no space before >.

Block 1 (path public/index.html). Old text (exact, 1 line):
          <div id="accuse-buttons"></div>
New text:
BEGIN
          <div id="accuse-buttons"></div>
          <label id="ask-confirm-row" class="ask-confirm" for="ask-confirm"><input type="checkbox" id="ask-confirm" checked> <span id="ask-confirm-text">Confirm before accusing</span></label>
FINISH

Block 2 (path public/index.html). Old text (exact, 2 lines):
let suspicion = {};
const SUS_MAX = 3;
New text:
BEGIN
let suspicion = {};
let susLast = null;
const SUS_MAX = 3;
const CONFIRM_KEY = 'cf-confirm-accuse';
FINISH

Block 3 (path public/index.html). Old text (exact, 1 line):
      li.className = (st.cleared ? 'is-cleared' : (st.hits >= 2 ? 'is-hot' : '')) + (st.flash ? ' flash' : '');
New text:
BEGIN
      li.className = (st.cleared ? 'is-cleared' : (st.hits >= 2 ? 'is-hot' : '')) + (st.flash && list.offsetParent !== null ? ' flash' : '');
FINISH

Block 4 (path public/index.html). Old text (exact, 13 lines):
function applyClue(clue) {
  if (!clue || !caseData) return;
  const L = susLabels();
  const nameOf = id => ((caseData.suspects || []).find(s => s.id === id) || {}).name || id;
  const get = id => suspicion[id] || (suspicion[id] = { hits: 0, cleared: false });
  Object.values(suspicion).forEach(st => { st.flash = false; });
  const said = [];
  if (clue.implicates) { const st = get(clue.implicates); st.hits += 1; st.flash = true; said.push(L.lead.replace('{name}', nameOf(clue.implicates))); }
  if (clue.clears) { const st = get(clue.clears); st.cleared = true; st.flash = true; said.push(L.clear.replace('{name}', nameOf(clue.clears))); }
  renderSuspicion();
  const live = document.getElementById('suspicion-live');
  if (live && said.length) live.textContent = said.join('. ');
}
New text:
BEGIN
function susSaid(clue) {
  const L = susLabels();
  const nameOf = id => (((caseData && caseData.suspects) || []).find(s => s.id === id) || {}).name || id;
  const said = [];
  if (clue.implicates) said.push(L.lead.replace('{name}', nameOf(clue.implicates)));
  if (clue.clears) said.push(L.clear.replace('{name}', nameOf(clue.clears)));
  return said.join('. ');
}
function applyClue(clue) {
  if (!clue || !caseData) return;
  const get = id => suspicion[id] || (suspicion[id] = { hits: 0, cleared: false });
  Object.values(suspicion).forEach(st => { st.flash = false; });
  if (clue.implicates) { const st = get(clue.implicates); st.hits += 1; st.flash = true; }
  if (clue.clears) { const st = get(clue.clears); st.cleared = true; st.flash = true; }
  renderSuspicion();
  const text = susSaid(clue);
  if (!text) return;
  susLast = { implicates: clue.implicates || null, clears: clue.clears || null };
  const live = document.getElementById('suspicion-live');
  if (live) live.textContent = text;
}
function relabelSuspicionLive() {
  const live = document.getElementById('suspicion-live');
  if (live && live.textContent && susLast) live.textContent = susSaid(susLast);
}
function confirmOn() {
  try { return !(store && store.getItem(CONFIRM_KEY) === 'off'); } catch { return true; }
}
function setConfirmOn(on) {
  try { if (store) { if (on) store.removeItem(CONFIRM_KEY); else store.setItem(CONFIRM_KEY, 'off'); } } catch {}
  renderConfirmToggle();
}
function renderConfirmToggle() {
  const box = document.getElementById('ask-confirm');
  if (box) box.checked = confirmOn();
  const text = document.getElementById('ask-confirm-text');
  if (text) text.textContent = lang === 'pt' ? 'Confirmar antes de acusar' : 'Confirm before accusing';
}
FINISH

Block 5 (path public/index.html). Old text (exact, 1 line):
      if (confirm(LABELS[lang].confirmAccuse.replace('{name}', s.name))) {
New text:
BEGIN
      if (!confirmOn() || confirm(LABELS[lang].confirmAccuse.replace('{name}', s.name))) {
FINISH

Block 6 (path public/index.html). Old text (exact, 2 lines):
  relabelToasts();
  renderContinue();
New text:
BEGIN
  relabelToasts();
  relabelSuspicionLive();
  renderConfirmToggle();
  renderContinue();
FINISH

Block 7 (path public/index.html). Old text (exact, 1 line):
document.getElementById('ask-form').addEventListener('submit',askQuestion);
New text:
BEGIN
document.getElementById('ask-form').addEventListener('submit',askQuestion);
document.getElementById('ask-confirm').addEventListener('change', (e) => setConfirmOn(e.target.checked));
renderConfirmToggle();
FINISH

Block 8 (path public/css/game.css). Old text (exact, 1 line):
@media (prefers-reduced-motion: reduce) { .sus-list li.flash { animation: none; } .sus-pip { transition: none; } }
New text:
BEGIN
@media (prefers-reduced-motion: reduce) { .sus-list li.flash { animation: none; } .sus-pip { transition: none; } }
.ask-confirm { display: inline-flex; align-items: center; gap: 8px; min-height: var(--touch-min); margin-top: 8px; font-size: 0.85rem; color: var(--cf-text-dim); cursor: pointer; }
.ask-confirm input[type="checkbox"] { width: 20px; height: 20px; min-height: 0; margin: 0; padding: 0; accent-color: #E2675E; cursor: pointer; }
.ask-confirm input[type="checkbox"]:focus-visible { outline: 3px solid var(--cf-focus); outline-offset: 2px; }
FINISH
