Patch public/css/game.css only. Output exactly two REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE public/css/game.css>>>
old text
=====
new text
<<<END>>>

Context: gothic-noir pixel-art detective game. CSS tokens: --cf-ink #0C0B0A, --cf-ink-soft #1A1714, --cf-blotter #241F1A, --cf-lamp (amber), --cf-lamp-dim, --cf-text-dim, --cf-line. The page now has, as the first children of `<main id="play">` (the play area, a flex column that scrolls on desktop and phone): `<div id="scene" aria-hidden="true">` holding two `div.scene-layer` (the script sets background-image on one layer and adds class is-on, removing it from the other, to crossfade), and `<p id="scene-label" class="scene-label">` (caption such as `Scene: Instrument room`). While a scene is shown, #play has class has-scene. The panel #conversation has an opaque background var(--cf-blotter) and its #log has var(--cf-ink-soft), which would hide the scene.

Block 1. Fix a visual bug. In the verdict, the Score line is an inline-flex paragraph and the CASE CLOSED stamp is an inline-block rotated by -8deg right after it, so on desktop the stamp sits on the same line and overlaps the Score text by about 24px. Old text (exact, one line):
.case-closed-stamp { display: inline-block; margin-top: 16px; padding: 6px 18px; border: 4px solid var(--cf-seal-bright); color: var(--cf-seal-bright); font-family: monospace; font-weight: 700; font-size: 1.6rem; letter-spacing: 0.2em; text-transform: uppercase; transform: rotate(-8deg); background: rgba(12,11,10,0.35); animation: cf-stamp 600ms cubic-bezier(.2,1.4,.4,1) both; }
New text: the same one-line rule, but `display: inline-block; margin-top: 16px;` becomes `display: block; width: fit-content; margin: 32px auto 8px;` (block on its own line, centred, with room for the rotation). Everything else in the rule stays identical.

Block 2. Old text (exact):
/* Utility */
New text: insert new CSS BEFORE that line, then keep the line /* Utility */. New CSS (one rule per line is fine):
- #play { position: relative; isolation: isolate; }
- #scene { position: absolute; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: var(--cf-ink); }
- #scene::after { content: ""; position: absolute; inset: 0; background: radial-gradient(ellipse at center, rgba(12,11,10,0.2) 0%, rgba(12,11,10,0.85) 100%); }
- .scene-layer { position: absolute; inset: 0; background-position: center; background-size: cover; background-repeat: no-repeat; image-rendering: pixelated; opacity: 0; transition: opacity 700ms ease; }
- .scene-layer.is-on { opacity: 0.35; }
- .scene-label { position: absolute; top: 8px; right: 12px; z-index: 1; margin: 0; padding: 2px 8px; font-size: 0.7rem; letter-spacing: 0.15em; text-transform: uppercase; color: var(--cf-lamp-dim); background: rgba(12,11,10,0.6); border: 1px solid var(--cf-line); pointer-events: none; }
- .scene-label[hidden] { display: none; }
- #play.has-scene #conversation { background: rgba(36,31,26,0.72); }
- #play.has-scene #log { background: rgba(26,23,20,0.62); }
- @media (prefers-reduced-motion: reduce) { .scene-layer { transition: none; } }
