Write one new file and patch one file. Output exactly one FILE block and then exactly one REPLACE block, then stop. Formats (exactly three < characters at the start of every marker line):

<<<FILE test/hints.mjs>>>
...full content...
<<<END>>>

<<<REPLACE package.json>>>
old text
=====
new text
<<<END>>>

No commentary, no markdown fences. Node 22 ESM, no dependencies, 2-space indent.

Context: public/index.html (one page with an inline module script) now has timed hint toasts and pins that follow the language. Functions in the page script (top level, so their source can be cut out of the HTML):
- `function stopHints()` clears every id in the top-level `hintTimers` array with clearTimeout and sets hintTimers = [].
- `function showToast(text)` gets document.getElementById('toasts') as box; returns if no box or no text; creates div (className 'toast') with a strong (className 'toast-kicker', textContent 'Pista' when lang === 'pt' else 'Hint') and a span (className 'toast-text', textContent text) via t.append(k, s); box.append(t); while box.children.length > 2 removes box.firstElementChild with box.removeChild; then setTimeout(() => { t.classList.add('is-out'); setTimeout(() => t.remove(), 400); }, 8000).
- `function startHints()` calls stopHints(), sets box.innerHTML = '' when #toasts exists, then for each h of (caseData && caseData.hints) || [] pushes onto hintTimers a setTimeout of (Number(h.after) || 0) * 1000 ms whose callback returns when gameOver is true, otherwise finds the hint with the same id in the CURRENT caseData.hints and calls showToast(cur.text).
- `function renderBoard()` renders `pins` (array of {id, label}) into #board-grid tiles and #pin-rail chips; each label is the name of the room with the same id in caseData.rooms (array of {id, name}), falling back to the stored label. It uses document.getElementById for 'board-grid', 'pin-rail', 'rail-right', 'pin-empty', document.createElement, document.createTextNode, el.appendChild, el.setAttribute, el.addEventListener, el.innerHTML = '', and the globals iconSvg(id), PIN_ICONS (object), UI (UI[lang].unpin and UI[lang].emptyBoard strings), lang, pins, caseData.
- init(), openPackFile(id) and restartGame() each call startHints().
Markup: `<div id="toasts" class="toasts" role="status" aria-live="polite"></div>` right before `<script type="module">`.
Server: `publicCase(c, lang)` exported from src/case.js returns `hints` as an array of {id, after, text} with text as a string in that language. `loadCase(file)` exported from src/case.js loads a case JSON (files 'content/case.json' and 'content/cases/night-train.json').

Test file structure: copy this harness exactly at the top (read files, fnSource, check):
```
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { publicCase, loadCase } from '../src/case.js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(join(__dirname, '../public/index.html'), 'utf8');
const css = fs.readFileSync(join(__dirname, '../public/css/game.css'), 'utf8');
function fnSource(name) {
  const startIdx = html.indexOf(`function ${name}(`);
  if (startIdx === -1) throw new Error(`Function ${name} not found`);
  let depth = 0;
  for (let i = html.indexOf('{', startIdx); i < html.length; i++) {
    if (html[i] === '{') depth++;
    else if (html[i] === '}') { depth--; if (depth === 0) return html.substring(startIdx, i + 1); }
  }
  throw new Error(`Unmatched braces in ${name}`);
}
const results = [];
function check(name, fn) { try { fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }
```
(without the fence lines). And copy this footer exactly at the end:
```
results.forEach(r => console.log(r));
const passed = results.filter(r => r.startsWith('PASS')).length;
const failed = results.length - passed;
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
```

Helpers to write after the harness:
- `class El` with constructor(tag) setting this.tagName = tag, this.className = '', this.textContent = '', this.children = [], this.attrs = {}, this.parent = null, this.cls = new Set(), and this.classList = { add: c => this.cls.add(c), remove: c => this.cls.delete(c), contains: c => this.cls.has(c) }. Methods: append(...nodes) { for each node: node.parent = this; this.children.push(node) }; appendChild(n) { this.append(n); return n; }; removeChild(n) { const i = this.children.indexOf(n); if (i >= 0) this.children.splice(i, 1); n.parent = null; return n; }; remove() { if (this.parent) this.parent.removeChild(this); }; get firstElementChild() { return this.children[0] || null; }; set innerHTML(v) { this.children = []; }; get innerHTML() { return ''; }; setAttribute(k, v) { this.attrs[k] = String(v); }; getAttribute(k) { return this.attrs[k]; }; addEventListener() {}; get text() { return this.children.map(c => c.text !== undefined ? c.text : c.textContent).join('') || this.textContent; }.
- `function fakeTimers()` returning { timers, set, clear } where timers is an array of {id, fn, ms, cleared}, set(fn, ms) pushes {id: next id starting at 1, fn, ms, cleared: false} and returns the id, clear(id) marks that timer cleared.
- `function hintApi(env)`: env has { doc, timers, getLang, getCase, isOver }. Build the sources: `const src = [fnSource('stopHints'), fnSource('showToast'), fnSource('startHints')].join('\n').replace(/\bgameOver\b/g, 'isOver()').replace(/\bcaseData\b/g, 'getCase()').replace(/\blang\b/g, 'getLang()');` then `return new Function('document', 'setTimeout', 'clearTimeout', 'getLang', 'getCase', 'isOver', `let hintTimers = []; ${src} return { stopHints, showToast, startHints, timers: () => hintTimers };`)(env.doc, env.timers.set, env.timers.clear, env.getLang, env.getCase, env.isOver);`
- `const EN = { hints: [{ id: 'h1', after: 45, text: 'A silhouette passed the window.' }, { id: 'h2', after: 100, text: 'A key ring jingles.' }] };` and `const PT = { hints: [{ id: 'h1', after: 45, text: 'Uma silhueta passou pela janela.' }, { id: 'h2', after: 100, text: 'Um molho de chaves balança.' }] };`

Checks, in this order (12 checks, each a check(name, fn) call):
1. 'toast markup': html includes the exact markup string above; and html.indexOf of that markup is less than html.indexOf('<script type="module">') and greater than html.indexOf('</main>').
2. 'case files carry hints': for each of the two case files via loadCase: c.hints is an array of length 3; ids are unique; every after is an integer greater than 0 and strictly increasing; every text.en and text.pt is a non-empty string.
3. 'publicCase localises hints': for each case file and for each of 'en' and 'pt': publicCase(c, l).hints has length 3 and every item has typeof text === 'string' equal to the matching c.hints[i].text[l], and after equal to c.hints[i].after.
4. 'one timer per hint': box = new El('div'); doc = { getElementById: id => id === 'toasts' ? box : null, createElement: t => new El(t) }; t = fakeTimers(); api = hintApi({ doc, timers: t, getLang: () => 'en', getCase: () => EN, isOver: () => false }); api.startHints(); the ms of the timers must equal [45000, 100000]; api.timers().length must be 2.
5. 'hint fires as an English toast': same setup; startHints(); call t.timers[0].fn(); box.children.length must be 1; that toast has className 'toast'; its children[0] has className 'toast-kicker' and textContent 'Hint'; its children[1] has className 'toast-text' and textContent 'A silhouette passed the window.'.
6. 'hint reads the current language': let cur = EN and let L = 'en'; getCase: () => cur, getLang: () => L; startHints(); then set cur = PT and L = 'pt'; fire t.timers[0].fn(); the toast kicker must be 'Pista' and its text 'Uma silhueta passou pela janela.'.
7. 'no hint after the verdict': isOver: () => true; startHints(); fire both hint timers; box.children.length must be 0.
8. 'restart clears pending hints': startHints() twice; the first two timers (ids 1 and 2) must have cleared === true; api.timers().length must be 2; also put a stale El in box before the second call and check box.children.length is 0 right after the second call.
9. 'at most two toasts': call api.showToast('a'), api.showToast('b'), api.showToast('c'); box.children.length must be 2 and the texts of children[1] of each remaining toast must be ['b', 'c'].
10. 'toast fades then goes': api.showToast('x'); find the timer with ms 8000 (the last one in t.timers) and fire it; the toast must have class 'is-out' and still be in box; then the newest timer must have ms 400; fire it; box.children.length must be 0.
11. 'hints start on every new game': fnSource('init'), fnSource('openPackFile') and fnSource('restartGame') each include 'startHints()'; css includes '.toasts {' and the rule text from '.toasts {' to the next '}' includes 'position: fixed'; css includes 'bottom: calc(var(--dock-h)'; css has a prefers-reduced-motion rule that contains '.toast' and 'animation: none'.
12. 'pins follow the language': grid = new El('div'), rail = new El('div'), side = new El('aside'), empty = new El('p'); doc = { getElementById: id => ({ 'board-grid': grid, 'pin-rail': rail, 'rail-right': side, 'pin-empty': empty })[id] || null, createElement: t => new El(t), createTextNode: s => ({ text: s }) }; src = fnSource('renderBoard'); run = new Function('document', 'iconSvg', 'PIN_ICONS', 'UI', 'lang', 'pins', 'caseData', `${src} renderBoard();`); call run(doc, () => new El('svg'), {}, { pt: { unpin: 'Retirar', emptyBoard: 'Nada' } }, 'pt', [{ id: 'instrument-room', label: 'Instrument room' }, { id: 'gone', label: 'Old note' }], { rooms: [{ id: 'instrument-room', name: 'Sala de instrumentos' }] }); grid.children.map(c => c.text) must equal ['Sala de instrumentos', 'Old note']; rail.children.map(c => c.text) must equal the same; grid.children[0].attrs['aria-label'] must be 'Retirar: Sala de instrumentos'.
Compare arrays with JSON.stringify. Each failing assertion throws an Error naming what was expected and what was found.

REPLACE block for package.json. Old text (exact):
node test/scene.mjs && node test/keyboard.mjs
New text:
node test/scene.mjs && node test/hints.mjs && node test/keyboard.mjs
