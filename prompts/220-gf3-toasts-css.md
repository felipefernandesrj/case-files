Patch public/css/game.css only. Output exactly one REPLACE block, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE public/css/game.css>>>
old text
=====
new text
<<<END>>>

Context: a gothic-noir pixel-art detective game. New on-screen hint toasts: markup is `<div id="toasts" class="toasts" role="status" aria-live="polite">` (direct child of body) holding up to two `<div class="toast"><strong class="toast-kicker">Hint</strong><span class="toast-text">...</span></div>`; a toast gets class `is-out` 400ms before it is removed. Existing CSS variables: --cf-ink-soft, --cf-lamp, --cf-lamp-dim, --cf-text, --cf-line; phones (max-width: 767px) have a bottom dock of height var(--dock-h).

Old text (exact, one line):
@media (prefers-reduced-motion: reduce) { .scene-layer { transition: none; } }
New text: that same line unchanged, then these rules, one rule per line at column 0:
- `.toasts` fixed, left 50%, bottom 24px, transform translateX(-50%), z-index 60, display flex, flex-direction column, gap 8px, width min(440px, calc(100vw - 32px)), pointer-events none.
- `.toast` display flex, gap 10px, align-items baseline, padding 10px 14px, background rgba(26,23,20,0.94), color var(--cf-text), border 1px solid var(--cf-line), border-left 4px solid var(--cf-lamp), box-shadow 0 0 18px rgba(232,184,109,0.25), font-size 0.95rem, line-height 1.35, animation cf-toast-in 350ms ease-out both.
- `.toast-kicker` flex none, font-family monospace, font-size 0.72rem, letter-spacing 0.18em, text-transform uppercase, color var(--cf-lamp).
- `.toast.is-out` animation cf-toast-out 400ms ease-in forwards.
- `@keyframes cf-toast-in { 0% { opacity: 0; transform: translateY(12px); } 100% { opacity: 1; transform: none; } }`
- `@keyframes cf-toast-out { 0% { opacity: 1; } 100% { opacity: 0; transform: translateY(8px); } }`
- `@media (max-width: 767px) { .toasts { bottom: calc(var(--dock-h) + 12px); } }`
- `@media (prefers-reduced-motion: reduce) { .toast, .toast.is-out { animation: none; } }`
