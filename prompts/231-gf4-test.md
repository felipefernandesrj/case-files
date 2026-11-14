Write one new file and patch one file. Output exactly one FILE block and then exactly one REPLACE block, then stop. Formats (exactly three < characters at the start of every marker line, and only marker lines start with <<<):

<<<FILE test/legibility.mjs>>>
...full content...
<<<END>>>

<<<REPLACE package.json>>>
old text
=====
new text
<<<END>>>

No commentary, no markdown fences. Node 22 ESM, no dependencies, 2-space indent.

Context: public/index.html (one page with an inline module script) and public/css/game.css. Sprint changes to test:
- CSS: a multi-line rule `#board-title {` ... `}` now contains `color: var(--cf-text);` and `background: rgba(12,11,10,0.88);`. The one-line rule `.scene-label { ... }` now contains `color: var(--cf-text);` and `background: rgba(12,11,10,0.88);`. In `:root`, `--cf-text: #F3EADF;`. The lightest page colour is #F3EADF.
- `function showToast(text, id)` gets document.getElementById('toasts') as box; returns if no box or no text; creates div t (className 'toast'), and when id is truthy calls t.setAttribute('data-hint', id); adds a strong (className 'toast-kicker', textContent 'Pista' when lang === 'pt' else 'Hint') and a span (className 'toast-text', textContent text) via t.append(k, s); box.append(t); keeps at most two toasts; then setTimeout(..., 8000) for the fade.
- `function startHints()` calls stopHints(), empties #toasts, and for each hint pushes a setTimeout of after * 1000 ms whose callback returns when gameOver is true, otherwise finds the hint with the same id in the current caseData.hints and calls showToast(cur.text, cur.id).
- NEW `function relabelToasts()`: gets #toasts as box, returns if missing; hints = (caseData && caseData.hints) || []; for each toast t of Array.from(box.children): cur = the hint whose id equals t.getAttribute('data-hint'); k = t.children[0]; s = t.children[1]; if k, k.textContent = 'Pista' when lang === 'pt' else 'Hint'; if cur and s, s.textContent = cur.text. It never adds or removes toasts.
- `async function setLang(newLang)` calls `await loadCase();` and later `relabelToasts();`.

Test file structure: copy this harness exactly at the top (read files, fnSource, check):
```
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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
- `function hintApi(env)`: env has { doc, timers, getLang, getCase, isOver }. Build the sources: `const src = [fnSource('stopHints'), fnSource('showToast'), fnSource('startHints'), fnSource('relabelToasts')].join('\n').replace(/\bgameOver\b/g, 'isOver()').replace(/\bcaseData\b/g, 'getCase()').replace(/\blang\b/g, 'getLang()');` then `return new Function('document', 'setTimeout', 'clearTimeout', 'getLang', 'getCase', 'isOver', `let hintTimers = []; ${src} return { stopHints, showToast, startHints, relabelToasts };`)(env.doc, env.timers.set, env.timers.clear, env.getLang, env.getCase, env.isOver);`
- `const EN = { hints: [{ id: 'h1', after: 45, text: 'A silhouette passed the window.' }, { id: 'h2', after: 100, text: 'A key ring jingles.' }] };` and `const PT = { hints: [{ id: 'h1', after: 45, text: 'Uma silhueta passou pela janela.' }, { id: 'h2', after: 100, text: 'Um molho de chaves balança.' }] };`
- `function cssRule(sel)`: `const i = css.indexOf('\n' + sel + ' {'); if (i === -1) throw new Error('rule ' + sel + ' not found'); return css.substring(i + 1, css.indexOf('}', i) + 1);`
- `function plateAlpha(rule)`: `const m = rule.match(/background: rgba\(12,\s*11,\s*10,\s*([0-9.]+)\)/); if (!m) throw new Error('no ink plate background'); return Number(m[1]);`
- `function lum(rgb)`: WCAG relative luminance of [r,g,b] (0-255): each channel c = v/255, c <= 0.03928 ? c/12.92 : ((c+0.055)/1.055)**2.4, then 0.2126*R + 0.7152*G + 0.0722*B.
- `function ratio(a, b)`: `const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);`
- `function plateContrast(alpha)`: `const ink = [12, 11, 10]; const page = [243, 234, 223]; const bg = page.map((v, i) => alpha * ink[i] + (1 - alpha) * v); return ratio([243, 234, 223], bg);`
- `function toastEl(id, kicker, text)`: builds a toast by hand without showToast: `const t = new El('div'); t.className = 'toast'; if (id) t.setAttribute('data-hint', id); const k = new El('strong'); k.className = 'toast-kicker'; k.textContent = kicker; const s = new El('span'); s.className = 'toast-text'; s.textContent = text; t.append(k, s); return t;`

Every check callback is synchronous (check() is synchronous: never pass an async function, never use await or promises). Toasts in this file are read with `.className`, `.textContent` and `.getAttribute(...)` only (never classList). Write exactly these 8 checks, in this order, with these names:
1. check('board heading on an ink plate') : r = cssRule('#board-title'); throw unless r includes 'color: var(--cf-text);'; call plateAlpha(r) (it throws when the plate is missing).
2. check('scene caption uses light text') : r = cssRule('.scene-label'); throw unless r includes 'color: var(--cf-text);'; throw if r includes 'color: var(--cf-lamp-dim)'; call plateAlpha(r).
3. check('heading contrast passes AA') : c = plateContrast(plateAlpha(cssRule('#board-title'))); throw new Error('ratio ' + c.toFixed(2)) unless c >= 4.5. Also throw unless css includes '--cf-text: #F3EADF;'.
4. check('caption contrast passes AA') : same as 3 for cssRule('.scene-label') (without the --cf-text line).
5. check('hint toast remembers its hint id') : box = new El('div'); doc = { getElementById: id => id === 'toasts' ? box : null, createElement: t => new El(t) }; t = fakeTimers(); api = hintApi({ doc, timers: t, getLang: () => 'en', getCase: () => EN, isOver: () => false }); api.startHints(); t.timers[0].fn(); throw unless box.children.length === 1 and box.children[0].getAttribute('data-hint') === 'h1' (error message shows the value found).
6. check('open toast switches language') : box = new El('div'); box.append(toastEl('h1', 'Hint', 'A silhouette passed the window.'), toastEl('h2', 'Hint', 'A key ring jingles.')); doc as in 5; api = hintApi({ doc, timers: fakeTimers(), getLang: () => 'pt', getCase: () => PT, isOver: () => false }); api.relabelToasts(); throw unless box.children[0].children[0].textContent === 'Pista', box.children[0].children[1].textContent === 'Uma silhueta passou pela janela.', box.children[1].children[0].textContent === 'Pista' and box.children[1].children[1].textContent === 'Um molho de chaves balança.'; then switch back with a second api built with getLang: () => 'en', getCase: () => EN on the same box, call relabelToasts(), throw unless box.children[0].children[0].textContent === 'Hint' and box.children[0].children[1].textContent === 'A silhouette passed the window.'.
7. check('unknown toast keeps its text') : box with one toastEl('zz', 'Hint', 'Old note'); api with getLang: () => 'pt', getCase: () => PT; relabelToasts(); throw unless box.children.length === 1, box.children[0].children[1].textContent === 'Old note' and box.children[0].children[0].textContent === 'Pista'.
8. check('language switch relabels open toasts') : s = fnSource('setLang'); a = s.indexOf('await loadCase();'); b = s.indexOf('relabelToasts();'); throw unless a !== -1 and b > a.

Then the footer.

REPLACE block for package.json. Old text (exact):
node test/hints.mjs && node test/keyboard.mjs
New text:
node test/hints.mjs && node test/legibility.mjs && node test/keyboard.mjs
