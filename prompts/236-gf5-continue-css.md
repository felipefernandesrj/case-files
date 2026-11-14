Patch public/css/game.css only. Output exactly one REPLACE block, then stop. The block is: a marker line `<<<REPLACE public/css/game.css>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside the block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. The new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game. Style a new arcade CONTINUE countdown box (#continue with .continue-title, .continue-num, .continue-note, .continue-actions holding #continue-yes, #continue-no, #continue-close, and a visually hidden live region .continue-live). It floats in the middle of the screen above everything (header z-index is 100), a big number pulses on every tick (class tick added each second), and reduced motion removes the pulse. GAME OVER state adds the class is-over.

Old text (exact, one line):
@media (prefers-reduced-motion: reduce) { .toast, .toast.is-out { animation: none; } }
New text:
BEGIN
@media (prefers-reduced-motion: reduce) { .toast, .toast.is-out { animation: none; } }
.continue { position: fixed; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 120; width: min(360px, calc(100vw - 32px)); box-sizing: border-box; padding: 20px 24px; text-align: center; color: var(--cf-text); background: rgba(12,11,10,0.94); border: 2px solid var(--cf-lamp); box-shadow: 0 0 0 4px rgba(12,11,10,0.6), 0 0 40px rgba(232,184,109,0.25); }
.continue-title { margin: 0; font-family: monospace; font-weight: 700; font-size: 1.6rem; letter-spacing: 0.2em; color: var(--cf-lamp); }
.continue.is-over { border-color: var(--cf-seal-bright); }
.continue.is-over .continue-title { color: #E2675E; }
.continue-num { margin: 6px 0; font-family: monospace; font-weight: 700; font-size: 4.5rem; line-height: 1; color: var(--cf-text); text-shadow: 0 0 18px rgba(232,184,109,0.45); }
.continue-num.tick { animation: cf-cont-tick 450ms ease-out; }
@keyframes cf-cont-tick { 0% { transform: scale(1.4); opacity: 0.5; } 100% { transform: none; opacity: 1; } }
.continue-note { margin: 10px 0 0; font-size: 0.95rem; line-height: 1.4; }
.continue-note:empty { display: none; }
.continue-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; margin-top: 14px; }
.continue-actions button { padding: 0 16px; border: 1px solid var(--cf-line); }
#continue-yes { background: var(--cf-lamp); color: var(--cf-ink); font-weight: 700; }
.continue-live { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { .continue-num, .continue-num.tick { animation: none; } }
FINISH
