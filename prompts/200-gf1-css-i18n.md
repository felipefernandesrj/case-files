Patch two files. Output exactly five REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, a separator line of exactly five equals signs, and OLD copied exactly as given (character for character, no extra spaces):

<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

NEVER emit <<<FILE>>>. No commentary, no markdown fences. Do not add the strings night-train, caseId, or CASE_ID.

Context: a gothic-noir pixel-art detective game. CSS tokens exist: --cf-ink #0C0B0A, --cf-ink-soft, --cf-paper (light), --cf-text-on-paper (dark), --cf-text, --cf-text-dim, --cf-lamp (amber), --cf-lamp-dim, --cf-seal #8C2F2B, --cf-seal-bright #B54741, --cf-line, --cf-folder-dark. The page just gained a right-rail "Case progress" list (#case-progress, #progress-list li.done / li.todo, li[aria-current="step"], #progress-count), a #pin-empty hint, and, on a correct verdict, a div.case-closed-stamp inside #verdict (#verdict has text-align center and padding 24px).

Block 1, file public/index.html. OLD (exact):
  if (document.getElementById('pin-rail-title')) setText('pin-rail-title', UI[newLang].pins || (newLang === 'pt' ? 'Alfinetes' : 'Pins'));
NEW: keep that line, then add:
  setText('progress-title', newLang === 'pt' ? 'Progresso do caso' : 'Case progress');
  const pinEmptyEl = document.getElementById('pin-empty');
  if (pinEmptyEl) pinEmptyEl.textContent = newLang === 'pt' ? 'Fixe pistas dos cômodos para vê-las aqui.' : 'Pin clues from rooms to see them here.';

Block 2, file public/index.html. OLD (exact):
  syncTitle();
NEW: keep syncTitle(); then add on the next line:
  if (typeof renderProgress === 'function') renderProgress();

Block 3, file public/index.html. OLD (exact):
  lastAccuseResult = null;
  gameOver = false;
  setGameOver(false);
NEW: the same three lines, then:
  visitedSteps.clear();
  visitedSteps.add('briefing');
  renderProgress();

Block 4, file public/css/game.css. OLD (exact):
#suspect-buttons .role {
  grid-column: 2;
  grid-row: 2;
  font-size: 0.75rem;
  color: var(--cf-text-dim);
}
NEW: same rule but the role text must be readable on the light paper card: color var(--cf-seal) and font-weight 600. Also add `#suspect-buttons .role .icon { color: var(--cf-text-on-paper); }`.

Block 5, file public/css/game.css. OLD (exact):
/* Utility */
NEW: insert new CSS BEFORE the line /* Utility */, then keep /* Utility */. New CSS:
- #case-progress: margin-bottom 16px; padding 8px; border 1px solid var(--cf-line); background var(--cf-ink-soft).
- #progress-list: list-style none, margin 0, padding 0, display grid, gap 4px, font-size 0.85rem.
- #progress-list li: padding 4px 6px; border-left 3px solid var(--cf-line); color var(--cf-text-dim); transition background 200ms, color 200ms.
- #progress-list li.done: color var(--cf-lamp); border-left-color var(--cf-lamp); animation cf-tick 400ms ease-out.
- #progress-list li[aria-current="step"]: background rgba(232,184,109,0.12); color var(--cf-text).
- #progress-count: margin 6px 0 0; font-size 0.75rem; color var(--cf-text-dim); text-align right; letter-spacing 0.1em.
- .pin-empty: font-size 0.8rem; color var(--cf-text-dim); font-style italic. .pin-empty[hidden] { display: none; }
- #verdict { position: relative; overflow: hidden; }
- .case-closed-stamp: display inline-block; margin-top 16px; padding 6px 18px; border 4px solid var(--cf-seal-bright); color var(--cf-seal-bright); font-family monospace; font-weight 700; font-size 1.6rem; letter-spacing 0.2em; text-transform uppercase; transform rotate(-8deg); background rgba(12,11,10,0.35); animation cf-stamp 600ms cubic-bezier(.2,1.4,.4,1) both.
- @keyframes cf-stamp: 0% opacity 0, transform scale(2.6) rotate(-18deg); 60% opacity 1, transform scale(0.92) rotate(-7deg); 100% opacity 1, transform scale(1) rotate(-8deg).
- @keyframes cf-tick: 0% transform translateX(-6px), opacity 0.4; 100% transform none, opacity 1.
