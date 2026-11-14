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

class El {
  constructor(tag) {
    this.tagName = tag;
    this.className = '';
    this.textContent = '';
    this.children = [];
    this.attrs = {};
    this.parent = null;
    this.cls = new Set();
    this.classList = { add: c => this.cls.add(c), remove: c => this.cls.delete(c), contains: c => this.cls.has(c) };
  }
  append(...nodes) {
    for (const node of nodes) {
      node.parent = this;
      this.children.push(node);
    }
  }
  appendChild(n) {
    this.append(n);
    return n;
  }
  removeChild(n) {
    const i = this.children.indexOf(n);
    if (i >= 0) this.children.splice(i, 1);
    n.parent = null;
    return n;
  }
  remove() {
    if (this.parent) this.parent.removeChild(this);
  }
  get firstElementChild() {
    return this.children[0] || null;
  }
  set innerHTML(v) {
    this.children = [];
  }
  get innerHTML() {
    return '';
  }
  setAttribute(k, v) {
    this.attrs[k] = String(v);
  }
  getAttribute(k) {
    return this.attrs[k];
  }
  addEventListener() {}
  get text() {
    return this.children.map(c => c.text !== undefined ? c.text : c.textContent).join('') || this.textContent;
  }
}

function fakeTimers() {
  let nextId = 1;
  const timers = [];
  return {
    timers,
    set(fn, ms) {
      const id = nextId++;
      const entry = { id, fn, ms, cleared: false };
      timers.push(entry);
      return id;
    },
    clear(id) {
      const entry = timers.find(t => t.id === id);
      if (entry) entry.cleared = true;
    }
  };
}

function hintApi(env) {
  const src = [fnSource('stopHints'), fnSource('showToast'), fnSource('startHints'), fnSource('relabelToasts')].join('\n').replace(/\bgameOver\b/g, 'isOver()').replace(/\bcaseData\b/g, 'getCase()').replace(/\blang\b/g, 'getLang()');
  return new Function('document', 'setTimeout', 'clearTimeout', 'getLang', 'getCase', 'isOver', `let hintTimers = []; ${src} return { stopHints, showToast, startHints, relabelToasts };`)(env.doc, env.timers.set, env.timers.clear, env.getLang, env.getCase, env.isOver);
}

const EN = { hints: [{ id: 'h1', after: 45, text: 'A silhouette passed the window.' }, { id: 'h2', after: 100, text: 'A key ring jingles.' }] };
const PT = { hints: [{ id: 'h1', after: 45, text: 'Uma silhueta passou pela janela.' }, { id: 'h2', after: 100, text: 'Um molho de chaves balança.' }] };

function cssRule(sel) {
  const i = css.indexOf('\n' + sel + ' {');
  if (i === -1) throw new Error('rule ' + sel + ' not found');
  return css.substring(i + 1, css.indexOf('}', i) + 1);
}

function plateAlpha(rule) {
  const m = rule.match(/background: rgba\(12,\s*11,\s*10,\s*([0-9.]+)\)/);
  if (!m) throw new Error('no ink plate background');
  return Number(m[1]);
}

function lum(rgb) {
  const c = rgb.map(v => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function ratio(a, b) {
  const x = lum(a), y = lum(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

function plateContrast(alpha) {
  const ink = [12, 11, 10];
  const page = [243, 234, 223];
  const bg = page.map((v, i) => alpha * ink[i] + (1 - alpha) * v);
  return ratio([243, 234, 223], bg);
}

function toastEl(id, kicker, text) {
  const t = new El('div');
  t.className = 'toast';
  if (id) t.setAttribute('data-hint', id);
  const k = new El('strong');
  k.className = 'toast-kicker';
  k.textContent = kicker;
  const s = new El('span');
  s.className = 'toast-text';
  s.textContent = text;
  t.append(k, s);
  return t;
}

check('board heading on an ink plate', () => {
  const r = cssRule('#board-title');
  if (!r.includes('color: var(--cf-text);')) throw new Error('missing color var');
  plateAlpha(r);
});

check('scene caption uses light text', () => {
  const r = cssRule('.scene-label');
  if (!r.includes('color: var(--cf-text);')) throw new Error('missing color var');
  if (r.includes('color: var(--cf-lamp-dim)')) throw new Error('should not use dim lamp color');
  plateAlpha(r);
});

check('heading contrast passes AA', () => {
  const c = plateContrast(plateAlpha(cssRule('#board-title')));
  if (c < 4.5) throw new Error('ratio ' + c.toFixed(2));
  if (!css.includes('--cf-text: #F3EADF;')) throw new Error('missing --cf-text var');
});

check('caption contrast passes AA', () => {
  const c = plateContrast(plateAlpha(cssRule('.scene-label')));
  if (c < 4.5) throw new Error('ratio ' + c.toFixed(2));
});

check('hint toast remembers its hint id', () => {
  const box = new El('div');
  const doc = { getElementById: id => id === 'toasts' ? box : null, createElement: t => new El(t) };
  const t = fakeTimers();
  const api = hintApi({ doc, timers: t, getLang: () => 'en', getCase: () => EN, isOver: () => false });
  api.startHints();
  t.timers[0].fn();
  if (box.children.length !== 1) throw new Error('expected 1 toast, got ' + box.children.length);
  const idFound = box.children[0].getAttribute('data-hint');
  if (idFound !== 'h1') throw new Error('found ' + idFound);
});

check('open toast switches language', () => {
  const box = new El('div');
  box.append(toastEl('h1', 'Hint', 'A silhouette passed the window.'), toastEl('h2', 'Hint', 'A key ring jingles.'));
  const doc = { getElementById: id => id === 'toasts' ? box : null, createElement: t => new El(t) };
  const apiPt = hintApi({ doc, timers: fakeTimers(), getLang: () => 'pt', getCase: () => PT, isOver: () => false });
  apiPt.relabelToasts();
  if (box.children[0].children[0].textContent !== 'Pista') throw new Error('kicker not Pista');
  if (box.children[0].children[1].textContent !== 'Uma silhueta passou pela janela.') throw new Error('text mismatch pt1');
  if (box.children[1].children[0].textContent !== 'Pista') throw new Error('kicker not Pista 2');
  if (box.children[1].children[1].textContent !== 'Um molho de chaves balança.') throw new Error('text mismatch pt2');

  const apiEn = hintApi({ doc, timers: fakeTimers(), getLang: () => 'en', getCase: () => EN, isOver: () => false });
  apiEn.relabelToasts();
  if (box.children[0].children[0].textContent !== 'Hint') throw new Error('kicker not Hint');
  if (box.children[0].children[1].textContent !== 'A silhouette passed the window.') throw new Error('text mismatch en');
});

check('unknown toast keeps its text', () => {
  const box = new El('div');
  box.append(toastEl('zz', 'Hint', 'Old note'));
  const doc = { getElementById: id => id === 'toasts' ? box : null, createElement: t => new El(t) };
  const api = hintApi({ doc, timers: fakeTimers(), getLang: () => 'pt', getCase: () => PT, isOver: () => false });
  api.relabelToasts();
  if (box.children.length !== 1) throw new Error('length mismatch');
  if (box.children[0].children[1].textContent !== 'Old note') throw new Error('text changed');
  if (box.children[0].children[0].textContent !== 'Pista') throw new Error('kicker changed');
});

check('language switch relabels open toasts', () => {
  const s = fnSource('setLang');
  const a = s.indexOf('await loadCase();');
  const b = s.indexOf('relabelToasts();');
  if (a === -1 || b === -1 || b <= a) throw new Error('relabel order wrong');
});

results.forEach(r => console.log(r));
const passed = results.filter(r => r.startsWith('PASS')).length;
const failed = results.length - passed;
console.log(`${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
