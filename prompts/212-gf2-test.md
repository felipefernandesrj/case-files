Write one new file and patch one file. Output exactly one FILE block and then exactly one REPLACE block, then stop. Formats (exactly three < characters at the start of every marker line):

<<<FILE test/scene.mjs>>>
...full content...
<<<END>>>

<<<REPLACE package.json>>>
old text
=====
new text
<<<END>>>

Do not write the words OLD or NEW inside the REPLACE block. No commentary, no markdown fences.

test/scene.mjs: Node 24 ESM test, no dependencies, no browser. Read public/index.html and public/css/game.css with fs (paths relative to this file via fileURLToPath(import.meta.url)). Print one line per check as `PASS <name>` or `FAIL <name>: <reason>`, then `<n> passed, <m> failed`, and exit 1 if any failed. Wrap each check in try/catch so one failure does not stop the others.

Define at column 0 a helper function fnSource(name): find the index of `function ${name}(` in html, throw if missing, then from the first '{' after it count '{' and '}' until depth returns to 0, and return the substring from the function keyword through that closing brace.

Facts about the product:
- Inside `<main id="play">` the first children are `<div id="scene" aria-hidden="true"><div class="scene-layer"></div><div class="scene-layer"></div></div>` and `<p id="scene-label" class="scene-label" hidden></p>`.
- The inline script has top-level `let sceneRoom = null;`, `let sceneFront = 0;` and `function syncScene() {...}`. syncScene reads the globals document, caseData (with rooms [{id, name}]), currentRoom, lang, locArt(roomId) and whenArt(url, apply). With no matching room it removes class is-on from both layers, empties and hides the label and removes class has-scene from #play. With a room it sets the label to `Scene: <name>` (or `Cena: <name>` when lang is 'pt'), adds has-scene to #play and, only when the room id differs from sceneRoom, calls whenArt(locArt(id), apply); apply flips sceneFront, sets style.backgroundImage `url(...)` on the new front layer, adds is-on to it and removes is-on from the other layer.
- function renderRooms() calls syncScene() (Start over, opening a file, opening a room and switching language all end in renderRooms).
- game.css has a rule starting `.scene-layer {` with `transition: opacity`, a rule `.scene-layer.is-on { opacity: X; }`, `#play { position: relative; isolation: isolate; }`, a `@media (prefers-reduced-motion: reduce)` block that contains `.scene-layer`, and the one-line rule starting `.case-closed-stamp {`.

Fake DOM for the behaviour checks (write it yourself): a function makeEl() returning { classes: new Set(), style: {}, textContent: '', hidden: true, classList: { add: c => classes.add(c), remove: c => classes.delete(c), contains: c => classes.has(c) } } (classList must use the same Set as classes). layers = [makeEl(), makeEl()]; scene = makeEl() with querySelectorAll() returning layers (layers also needs forEach, a plain array has it); label = makeEl(); play = makeEl(); document = { getElementById: id => ({ scene, 'scene-label': label, play })[id] || null }.
Build a runner with new Function: the body is `let sceneRoom = null; let sceneFront = 0;\n` + fnSource('syncScene') + `\nreturn { sync: () => syncScene(), state: () => ({ sceneRoom, sceneFront }) };`, with parameters document, caseData, getRoom, lang, locArt, whenArt. Because currentRoom must change between calls, replace every occurrence of the word currentRoom in the function source with getRoom() before building (use a regex with word boundaries). Use caseData = { rooms: [{ id: 'a', name: 'Hall' }, { id: 'b', name: 'Cellar' }] }, locArt = id => `/assets/loc/x-${id}.png`, and a whenArt that counts its calls and calls apply(url) at once when url is truthy.

Checks (7):
1 scene markup: html contains `<div id="scene" aria-hidden="true">`, exactly two occurrences of `class="scene-layer"`, and `id="scene-label"`; and the index of `id="scene"` is after the index of `<main id="play">`.
2 renderRooms hooks the scene: fnSource('renderRooms') includes `syncScene()`.
3 first room shows: with room 'a' and lang 'en', after sync exactly one layer has is-on, its style.backgroundImage includes `x-a.png`, label.textContent is `Scene: Hall`, label.hidden is false, play has class has-scene.
4 crossfade and same room: continuing the same runner, switch to room 'b' and sync: now the other layer has is-on and includes `x-b.png`, the first layer has no is-on; then sync again with room 'b': whenArt call count does not grow and the on layer is unchanged.
5 Portuguese caption: a fresh runner with lang 'pt' and room 'b': label.textContent is `Cena: Cellar`.
6 cleared on reset: continuing the runner of check 4, set room null and sync: no layer has is-on, label.textContent is '', label.hidden is true, play has no has-scene, state().sceneRoom is null.
7 css: the `.scene-layer {` rule body includes `transition: opacity`; the opacity number in `.scene-layer.is-on` is greater than 0 and at most 0.5 (a dimmed backdrop); css includes `#play { position: relative; isolation: isolate; }`; the text of the reduced-motion media block (from `@media (prefers-reduced-motion: reduce)` to the next line that is exactly `}` or to the end of that line when it is a one-line block) includes `.scene-layer` (simplest: some occurrence of `@media (prefers-reduced-motion: reduce)` is followed within 200 characters by `.scene-layer`).
8 stamp below the score: the line starting `.case-closed-stamp {` includes `display: block` and does not include `inline-block`, and its margin-top is at least 28px (read the first number of `margin: Npx` or of `margin-top: Npx`).

(That is 8 checks; print all 8.)

package.json block. Old text (exact):
node test/progress.mjs && node test/keyboard.mjs
New text:
node test/progress.mjs && node test/scene.mjs && node test/keyboard.mjs
