Patch public/css/game.css only. Output exactly one REPLACE block, then stop. Each block is: a marker line `<<<REPLACE public/css/game.css>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game. Style new suspicion bars: .suspicion panel with h3.sus-title and ul.sus-list; each li has span.sus-name, span.sus-bar (three span.sus-pip, filled ones have class on) and span.sus-note; li classes is-hot (two or more leads), is-cleared, flash (just changed); p.sus-live is a visually hidden live region. Reduced motion removes the flash and the pip transition.

Block 1. Old text (exact, 1 line):
.continue-live { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
New text:
BEGIN
.continue-live { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.suspicion { margin-top: 12px; padding: 8px 10px; border: 1px solid var(--cf-line); background: rgba(12,11,10,0.86); }
.sus-title { margin: 0 0 6px; font-family: monospace; font-size: 0.8rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cf-lamp); }
.sus-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.sus-list li { display: grid; grid-template-columns: minmax(0, 1fr) auto; grid-template-areas: "name bar" "note note"; gap: 2px 8px; align-items: center; padding: 4px 6px; border-left: 3px solid var(--cf-line); color: var(--cf-text); }
.sus-name { grid-area: name; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 700; }
.sus-bar { grid-area: bar; display: inline-flex; gap: 3px; }
.sus-pip { width: 18px; height: 10px; box-sizing: border-box; background: rgba(243,234,223,0.12); border: 1px solid rgba(243,234,223,0.4); transition: background 300ms, box-shadow 300ms; }
.sus-pip.on { background: #E2675E; border-color: #E2675E; box-shadow: 0 0 6px rgba(226,103,94,0.6); }
.sus-note { grid-area: note; font-size: 0.75rem; color: var(--cf-text-dim); }
.sus-list li.is-hot { border-left-color: #E2675E; }
.sus-list li.is-hot .sus-note { color: #F0A39C; }
.sus-list li.is-cleared { border-left-color: #7FB77E; }
.sus-list li.is-cleared .sus-name { text-decoration: line-through; color: var(--cf-text-dim); }
.sus-list li.is-cleared .sus-note { color: #A8D5A6; }
.sus-list li.flash { animation: cf-sus-flash 900ms ease-out; }
@keyframes cf-sus-flash { 0% { background: rgba(232,184,109,0.45); } 100% { background: transparent; } }
.sus-live { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { .sus-list li.flash { animation: none; } .sus-pip { transition: none; } }
FINISH
