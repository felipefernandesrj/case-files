Write one new file. Output exactly one block:
<<<FILE test/progress.mjs>>>
...full content...
<<<END>>>
No commentary, no fences.

Node 24 ESM test, no dependencies, no browser. Print one line per check as `PASS <name>` or `FAIL <name>: <reason>`, then `<n> passed, <m> failed`, and exit 1 if any failed.

Facts about the product (public/index.html and public/css/game.css, read them with fs):
- The page has `<aside id="rail-right">` (it must NOT carry the hidden attribute) containing `id="case-progress"`, `id="progress-list"`, `id="progress-count"` and `id="pin-empty"`.
- The inline script defines `const visitedSteps = new Set(['briefing']);`, `const STEP_ORDER = [...]` with the six steps briefing, locations, suspects, talk, board, accuse, and `function renderProgress() { ... }`, and `showStep(name)` calls `visitedSteps.add(name)`.
- On a correct verdict the script creates an element with className 'case-closed-stamp' and text 'CASE CLOSED' / 'CASO ENCERRADO'.
- game.css has `@keyframes cf-stamp`, a `.case-closed-stamp` rule using `animation: cf-stamp`, a `@media (prefers-reduced-motion: reduce)` block, and the rule `#suspect-buttons .role {` whose color must not be var(--cf-text-dim) (that was light text on a light card).

Checks (8):
1 rail is never hidden: the rail-right aside tag has no hidden attribute.
2 rail has progress list, count and pin-empty hint ids.
3 STEP_ORDER lists exactly the six steps in that order (parse the array literal with a regex and JSON.parse after replacing single quotes).
4 renderProgress behaves: extract the source of `function renderProgress() {` up to its matching closing brace (count braces), and run it with `new Function` against a tiny fake document you write (getElementById, querySelector for [data-step-label="x"] returning {textContent: label}, createElement returning objects with className, textContent, setAttribute storing attributes, appendChild pushing children; body.dataset.step = 'talk'), visitedSteps = new Set(['briefing','talk']), STEP_ORDER as above. Expect 6 li, li 0 and 3 have className 'done' and text starting with '✓ ', the others 'todo' with '○ ', li 3 has aria-current 'step', count text '2/6'.
5 renderProgress returns without throwing when #progress-list is missing.
6 showStep marks the step visited (source of showStep contains visitedSteps.add(name)).
7 verdict stamp: script contains 'case-closed-stamp', 'CASE CLOSED' and 'CASO ENCERRADO'; css has @keyframes cf-stamp and .case-closed-stamp with animation cf-stamp.
8 readable roles and reduced motion: the #suspect-buttons .role rule body does not contain --cf-text-dim, and css contains @media (prefers-reduced-motion: reduce).
