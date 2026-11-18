// M2 game feel sprint 13: a locked question box looks locked (budget spent or game over) and the CLI uses the question budget
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
const { LABELS } = await import(path.join(root, 'public/best.js'));
const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }
function fnSource(name) {
  const i = html.indexOf(`function ${name}(`);
  must(i !== -1, `function ${name} missing`);
  let d = 0;
  for (let k = html.indexOf('{', i); k < html.length; k++) {
    if (html[k] === '{') d++;
    else if (html[k] === '}' && --d === 0) return html.slice(i, k + 1);
  }
  throw new Error('unbalanced ' + name);
}
// fake DOM for renderAskLock: one form, one input, one button
function fakeEl() {
  const attrs = {}; const cls = new Set();
  return { attrs, cls, dataset: {}, placeholder: '', classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c); } }, setAttribute: (k, v) => { attrs[k] = String(v); }, removeAttribute: (k) => { delete attrs[k]; } };
}
function runLock(state) {
  const els = { 'ask-form': fakeEl(), q: fakeEl(), 'ask-btn': fakeEl() };
  const document = { getElementById: (id) => els[id] || null };
  const f = new Function('document', 'LABELS', 'lang', 'gameOver', 'budgetOut', `${fnSource('renderAskLock')}; renderAskLock();`);
  f(document, LABELS, state.lang, state.gameOver, () => state.out);
  return els;
}
const hex = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const cssVar = (name) => { const m = css.match(new RegExp(`${name}:\\s*(#[0-9A-Fa-f]{6})`)); must(m, `${name} missing`); return m[1]; };
const lockRules = css.split('\n').filter((l) => l.includes('#ask-form.is-locked'));
const cli = (lines, args = []) => spawnSync(process.execPath, ['src/cli.js', ...args], { cwd: root, input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 15000 });

await check('LABELS have an out and a game over placeholder in EN and PT', () => {
  for (const l of ['en', 'pt']) {
    must(typeof LABELS[l].outPlaceholder === 'string' && LABELS[l].outPlaceholder.length > 0, `${l} outPlaceholder`);
    must(typeof LABELS[l].overPlaceholder === 'string' && LABELS[l].overPlaceholder.length > 0, `${l} overPlaceholder`);
  }
  must(LABELS.en.outPlaceholder === 'Out of questions', 'EN out wording');
  must(LABELS.pt.outPlaceholder !== LABELS.en.outPlaceholder && LABELS.pt.overPlaceholder !== LABELS.en.overPlaceholder, 'PT not translated');
});

await check('open game: box not locked, no placeholder, no aria-disabled', () => {
  const els = runLock({ lang: 'en', gameOver: false, out: false });
  must(!els['ask-form'].cls.has('is-locked'), 'locked class on an open game');
  must(els.q.placeholder === '', 'placeholder on an open game');
  must(!('aria-disabled' in els.q.attrs) && !('aria-disabled' in els['ask-btn'].attrs), 'aria-disabled on an open game');
});

await check('budget spent: locked, Out of questions placeholder, aria-disabled true on box and Ask', () => {
  const els = runLock({ lang: 'en', gameOver: false, out: true });
  must(els['ask-form'].cls.has('is-locked'), 'no locked class');
  must(els['ask-form'].dataset.lock === 'out', 'data-lock not out');
  must(els.q.placeholder === LABELS.en.outPlaceholder, 'placeholder: ' + els.q.placeholder);
  must(els.q.attrs['aria-disabled'] === 'true' && els['ask-btn'].attrs['aria-disabled'] === 'true', 'aria-disabled missing');
});

await check('game over wins over budget, PT placeholder follows the language', () => {
  const over = runLock({ lang: 'pt', gameOver: true, out: true });
  must(over['ask-form'].dataset.lock === 'over', 'data-lock not over');
  must(over.q.placeholder === LABELS.pt.overPlaceholder, 'PT over placeholder: ' + over.q.placeholder);
  const out = runLock({ lang: 'pt', gameOver: false, out: true });
  must(out.q.placeholder === LABELS.pt.outPlaceholder, 'PT out placeholder: ' + out.q.placeholder);
});

await check('setGameOver and renderBudget refresh the lock (Start over, language switch, new file)', () => {
  must(fnSource('setGameOver').includes('renderAskLock()'), 'setGameOver does not call renderAskLock');
  must(fnSource('renderBudget').includes('renderAskLock()'), 'renderBudget does not call renderAskLock');
  must(fnSource('setLang').includes('renderQuestions()'), 'setLang does not re-render the budget');
});

await check('locked CSS: muted colors, not-allowed cursor, dashed border, placeholder visible', () => {
  const all = lockRules.join('\n');
  must(/#ask-form\.is-locked #q, #ask-form\.is-locked #ask-btn \{[^}]*cursor: not-allowed/.test(all), 'no not-allowed cursor');
  must(/background: var\(--cf-ink-soft\)/.test(all) && /color: var\(--cf-text-dim\)/.test(all), 'no muted colors');
  must(/#ask-form\.is-locked #q \{[^}]*dashed/.test(all), 'no dashed border on the box');
  must(/#ask-form\.is-locked #q::placeholder \{[^}]*color: var\(--cf-text-dim\)[^}]*opacity: 1/.test(all), 'placeholder rule missing');
});

await check('locked text and placeholder keep AA contrast (4.5:1) on the locked background', () => {
  const r = ratio(cssVar('--cf-text-dim'), cssVar('--cf-ink-soft'));
  must(r >= 4.5, `contrast ${r.toFixed(2)}`);
  must(!/--cf-text-dim|--cf-ink-soft/.test(css.slice(css.indexOf('html[data-accent="salon"]'), css.indexOf('* { box-sizing'))), 'a case theme overrides the locked colors');
});

await check('busy ask shows a progress cursor and reduced motion has no transition on the box', () => {
  must(css.includes('#ask-form[aria-busy="true"] #q, #ask-form[aria-busy="true"] #ask-btn { cursor: progress; }'), 'no busy cursor');
  must(/@media \(prefers-reduced-motion: reduce\) \{ #ask-form #q, #ask-form #ask-btn \{ transition: none; \} \}/.test(css), 'no reduced motion rule');
  must(!lockRules.some((l) => /animation/.test(l)), 'locked state animates');
});

await check('CLI shows the budget, counts down and refuses past it with a command line, not a browser button', () => {
  const asks = Array.from({ length: 9 }, (_, i) => `ask lorenzo where were you ${i + 1}`);
  const r = cli([...asks, 'accuse carlos']);
  must(r.status === 0, 'cli failed: ' + r.stderr);
  must(r.stdout.includes('Questions left: 8 of 8'), 'no start budget');
  must(r.stdout.includes('Questions left: 0 of 8'), 'no countdown to 0');
  must(r.stdout.split('Name the culprit with: accuse <suspectId>').length - 1 === 2, 'out line not shown at 0 and on the 9th ask');
  must(!r.stderr.includes('Error') && !r.stdout.includes('Start over'), 'raw error or browser wording');
  must(r.stdout.includes('Score:') && r.stdout.includes('questions asked: 8'), 'accuse after the budget failed');
});

await check('CLI budget in PT and per case (Night Train 10)', () => {
  const pt = cli(['pergunta lorenzo onde voce estava', 'sair'], ['--lang', 'pt']);
  must(pt.stdout.includes('Perguntas restantes: 8 de 8') && pt.stdout.includes('Perguntas restantes: 7 de 8'), 'PT budget lines');
  const nt = cli(['quit'], ['--case', 'night-train']);
  must(nt.status === 0 && nt.stdout.includes('Questions left: 10 of 10'), 'Night Train budget');
});

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`ask-lock: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
