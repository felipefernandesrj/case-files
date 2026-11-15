Patch public/index.html only. Output exactly eight REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE public/index.html>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game (one HTML page with an inline module script). New feature: suspicion bars. The server's /api/ask answer now carries `clue` ({ id, implicates, clears } or null). Each suspect gets a row with a three pip meter that fills when a found clue points to them; a clue that clears a suspect marks the row Cleared. The bars appear under the conversation and above the accuse buttons, follow the language (EN/PT), announce each new lead once in a polite live region, and reset on Start over and when another file opens. Existing globals: lang ('en' or 'pt'), caseData (with suspects [{id,name}]), pins. Block 8 matches two places (Start over and opening a file): that is intended, write it once.

Block 1. Old text (exact, 1 line):
        <p id="questions-used" aria-live="polite"></p>
New text:
BEGIN
        <p id="questions-used" aria-live="polite"></p>
        <section id="suspicion-talk" class="suspicion" aria-labelledby="suspicion-title-talk">
          <h3 id="suspicion-title-talk" class="sus-title">Suspicion</h3>
          <ul class="sus-list"></ul>
        </section>
FINISH

Block 2. Old text (exact, 1 line):
        <div id="accuse-section">
New text:
BEGIN
        <section id="suspicion-accuse" class="suspicion" aria-labelledby="suspicion-title-accuse">
          <h3 id="suspicion-title-accuse" class="sus-title">Suspicion</h3>
          <ul class="sus-list"></ul>
        </section>
        <div id="accuse-section">
FINISH

Block 3. Old text (exact, 1 line):
      <section id="briefing" class="panel is-on" data-panel="briefing">
New text:
BEGIN
      <p id="suspicion-live" class="sus-live" aria-live="polite"></p>
      <section id="briefing" class="panel is-on" data-panel="briefing">
FINISH

Block 4. Old text (exact, 1 line):
let pins = [];
New text:
BEGIN
let pins = [];
let suspicion = {};
const SUS_MAX = 3;
FINISH

Block 5. Old text (exact, 1 line):
function renderProgress() {
New text:
BEGIN
function susLabels() {
  return lang === 'pt'
    ? { title: 'Suspeita', cleared: 'Inocentado', none: 'Sem pistas', leads: '{n} pista(s)', prime: 'principal suspeito', meter: 'Suspeita sobre {name}', lead: 'Nova pista: aponta para {name}', clear: 'Nova pista: inocenta {name}' }
    : { title: 'Suspicion', cleared: 'Cleared', none: 'No leads', leads: '{n} lead(s)', prime: 'prime suspect', meter: 'Suspicion on {name}', lead: 'New lead: points to {name}', clear: 'New lead: clears {name}' };
}
function susNote(st) {
  const L = susLabels();
  if (st.cleared) return L.cleared;
  if (!st.hits) return L.none;
  return L.leads.replace('{n}', st.hits) + (st.hits >= 2 ? ' · ' + L.prime : '');
}
function renderSuspicion() {
  const L = susLabels();
  document.querySelectorAll('.sus-title').forEach(t => { t.textContent = L.title; });
  document.querySelectorAll('.sus-list').forEach(list => {
    list.textContent = '';
    ((caseData && caseData.suspects) || []).forEach(s => {
      const st = suspicion[s.id] || { hits: 0, cleared: false };
      const n = st.cleared ? 0 : Math.min(st.hits, SUS_MAX);
      const li = document.createElement('li');
      li.className = (st.cleared ? 'is-cleared' : (st.hits >= 2 ? 'is-hot' : '')) + (st.flash ? ' flash' : '');
      li.dataset.suspect = s.id;
      const name = document.createElement('span');
      name.className = 'sus-name';
      name.textContent = s.name;
      const bar = document.createElement('span');
      bar.className = 'sus-bar';
      bar.setAttribute('role', 'meter');
      bar.setAttribute('aria-valuemin', '0');
      bar.setAttribute('aria-valuemax', String(SUS_MAX));
      bar.setAttribute('aria-valuenow', String(n));
      bar.setAttribute('aria-valuetext', susNote(st));
      bar.setAttribute('aria-label', L.meter.replace('{name}', s.name));
      for (let i = 0; i < SUS_MAX; i++) {
        const pip = document.createElement('span');
        pip.className = i < n ? 'sus-pip on' : 'sus-pip';
        bar.appendChild(pip);
      }
      const note = document.createElement('span');
      note.className = 'sus-note';
      note.textContent = susNote(st);
      li.appendChild(name);
      li.appendChild(bar);
      li.appendChild(note);
      list.appendChild(li);
    });
  });
}
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
function renderProgress() {
FINISH

Block 6. Old text (exact, 2 lines):
    renderQuestions();
    if (!histories[selectedSuspect]) histories[selectedSuspect]=[];
New text:
BEGIN
    renderQuestions();
    applyClue(data.clue);
    if (!histories[selectedSuspect]) histories[selectedSuspect]=[];
FINISH

Block 7. Old text (exact, 2 lines):
  if (typeof renderProgress === 'function') renderProgress();
  document.documentElement.setAttribute('data-accent'
New text:
BEGIN
  if (typeof renderProgress === 'function') renderProgress();
  renderSuspicion();
  document.documentElement.setAttribute('data-accent'
FINISH

Block 8. Old text (exact, 2 lines):
  stopContinue();
  const sessRes = await fetch(API + '/session'
New text:
BEGIN
  stopContinue();
  suspicion = {};
  const live = document.getElementById('suspicion-live');
  if (live) live.textContent = '';
  const sessRes = await fetch(API + '/session'
FINISH
