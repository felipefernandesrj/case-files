Patch public/index.html only. Output exactly five REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, a separator line of exactly five equals signs, and OLD copied exactly as given:

<<<REPLACE public/index.html>>>
OLD
=====
NEW
<<<END>>>

NEVER emit <<<FILE>>>. NEVER rewrite the file. No commentary, no markdown fences. New top-level code starts at column 0. Do not add the strings night-train, caseId, or CASE_ID. Use only textContent, createElement and appendChild (no innerHTML with data).

Goal: game feel. The desktop right column must never be empty, it shows a "Case progress" tracker of the six case steps (Brief, Places, People, Ask, Board, Accuse); a step gets ticked the first time the player opens it. A correct accusation shows an animated CASE CLOSED rubber stamp.

Block 1. OLD (exact):
    <aside id="rail-right" hidden>
      <h2 id="pin-rail-title" class="with-icon"><svg class="icon" aria-hidden="true" focusable="false"><use href="#i-pin"></use></svg> <span data-label="Pinned">Pinned</span></h2>
      <div id="pin-rail"></div>
    </aside>
NEW: the same aside WITHOUT the hidden attribute. Before the h2 add <section id="case-progress" aria-labelledby="progress-title"> holding <h2 id="progress-title" class="with-icon"> (svg icon using #i-board, same markup as the pin h2) with <span data-label="Case progress">Case progress</span>, an empty <ol id="progress-list"></ol>, and an empty <p id="progress-count" aria-live="polite"></p>, then </section>. After <div id="pin-rail"></div> add <p id="pin-empty" class="pin-empty">Pin clues from rooms to see them here.</p>.

Block 2. OLD (exact):
let pins = [];
NEW: keep that line, then add at column 0:
const visitedSteps = new Set(['briefing']);
const STEP_ORDER = ['briefing', 'locations', 'suspects', 'talk', 'board', 'accuse'];
function renderProgress() {
  // fills #progress-list with one <li> per STEP_ORDER item. Label = textContent of the element [data-step-label="<step>"] (so EN/PT follow the buttons). Visited li gets class "done" and data-done="true" and its label is prefixed with a check mark character "✓ "; unvisited li gets class "todo" and prefix "○ ". The li for document.body.dataset.step also gets aria-current="step". #progress-count textContent = `${n}/6` where n is visitedSteps.size. Return silently if #progress-list is missing.
}
Write the full function body.

Block 3. OLD (exact):
  if (name === 'board' && typeof renderBoard === 'function') renderBoard();
NEW: first add the two lines
  visitedSteps.add(name);
  if (typeof renderProgress === 'function') renderProgress();
then keep the OLD line unchanged.

Block 4. OLD (exact):
  if (side) side.hidden = pins.length === 0;
NEW:
  const pinEmpty = document.getElementById('pin-empty');
  if (pinEmpty) pinEmpty.hidden = pins.length > 0;
(the variable side stays declared and unused; that is fine.)

Block 5. OLD (exact):
  verdict.appendChild(p4);
  showStep('accuse');
NEW: keep verdict.appendChild(p4); then, only when correct is truthy, create a div with className 'case-closed-stamp', aria-hidden 'true', textContent lang==='pt' ? 'CASO ENCERRADO' : 'CASE CLOSED', and append it to verdict. Then keep showStep('accuse');

No other edits.
