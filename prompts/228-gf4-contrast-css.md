Patch public/css/game.css only. Output exactly two REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

<<<REPLACE public/css/game.css>>>
old text
=====
new text
<<<END>>>

Context: a gothic-noir detective game. Bug: the "Evidence board" heading (#board-title, light text #F3EADF) sits directly on a light cork texture (measured contrast 1.68:1), and the scene caption (.scene-label, text var(--cf-lamp-dim) on rgba(12,11,10,0.6) over the light texture) measures 2.15:1. Fix: put both on a dark ink plate with light text so contrast passes WCAG AA (4.5:1) even over the lightest page colour.

Block 1. Old text (exact, one line):
.scene-label { position: absolute; top: 8px; right: 12px; z-index: 1; margin: 0; padding: 2px 8px; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cf-lamp-dim); background: rgba(12,11,10,0.6); border: 1px solid var(--cf-line); pointer-events: none; }
New text:
BEGIN
.scene-label { position: absolute; top: 8px; right: 12px; z-index: 1; margin: 0; padding: 2px 8px; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cf-text); background: rgba(12,11,10,0.88); border: 1px solid var(--cf-lamp-dim); pointer-events: none; }
FINISH

Block 2. Old text (exact, two lines):
.ev-tile {
  background: var(--cf-paper);
New text:
BEGIN
#board-title {
  align-self: flex-start;
  width: fit-content;
  margin-top: 0;
  padding: 4px 12px;
  color: var(--cf-text);
  background: rgba(12,11,10,0.88);
  border-left: 3px solid var(--cf-lamp);
  box-shadow: var(--shadow-file);
}

.ev-tile {
  background: var(--cf-paper);
FINISH
