// M2 game feel sprint 14: the out line leaves the Ask step after the verdict, and the terminal verdict speaks the player's language
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
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
// fake DOM for setGameOver + renderBudget + showError: the same elements are kept between calls
function fakeEls() {
  const el = () => ({ hidden: false, disabled: false, textContent: '', innerHTML: '', children: [], classList: { toggle() {}, add() {}, remove() {} }, querySelector: () => ({ textContent: '' }), appendChild() {} });
  const els = { q: el(), 'ask-btn': el(), 'best-status': el(), 'budget-accuse': el(), 'ask-msg': el(), err: el(), 'q-budget': el() };
  els['ask-msg'].hidden = true;
  return els;
}
function game(els, lang = 'en') {
  const document = { getElementById: (id) => els[id] || null, querySelectorAll: () => [], createElement: () => ({ className: '', classList: { toggle() {}, add() {}, remove() {} } }) };
  const f = new Function('document', 'LABELS', 'setTimeout', `let lang = ${JSON.stringify(lang)}; let gameOver = false; let questionsUsed = 0; let questionBudget = 8; let budgetLeftShown = null; const BUDGET_LOW = 2;
    function budgetOut() { return questionBudget > 0 && questionsUsed >= questionBudget; }
    ${fnSource('showError')} ${fnSource('renderBudget')} ${fnSource('setGameOver')}
    return { spend(n) { questionsUsed = n; renderBudget(Math.max(0, questionBudget - n)); }, over(on) { setGameOver(on); }, lang(l) { lang = l; renderBudget(Math.max(0, questionBudget - questionsUsed)); } };`);
  return f(document, LABELS, () => 0);
}
const cli = (lines, args = []) => spawnSync(process.execPath, ['src/cli.js', ...args], { cwd: root, input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 15000 });

await check('budget spent: the out line shows under the box', () => {
  const els = fakeEls(); const g = game(els);
  g.spend(8);
  must(!els['ask-msg'].hidden && els['ask-msg'].textContent === LABELS.en.outOfQuestions, 'out line not shown: ' + els['ask-msg'].textContent);
});

await check('verdict after the budget hides and clears the out line (EN and PT)', () => {
  for (const l of ['en', 'pt']) {
    const els = fakeEls(); const g = game(els, l);
    g.spend(8); g.over(true);
    must(els['ask-msg'].hidden === true, `${l}: out line still shown after the verdict`);
    must(els['ask-msg'].textContent === '', `${l}: out line text kept: ` + els['ask-msg'].textContent);
  }
});

await check('a language switch after the verdict does not bring the out line back', () => {
  const els = fakeEls(); const g = game(els, 'en');
  g.spend(8); g.over(true); g.lang('pt');
  must(els['ask-msg'].hidden === true && els['ask-msg'].textContent === '', 'out line came back: ' + els['ask-msg'].textContent);
});

await check('Start over then a spent budget shows the out line again', () => {
  const els = fakeEls(); const g = game(els, 'pt');
  g.spend(8); g.over(true); g.over(false); g.spend(0);
  must(els['ask-msg'].hidden === true, 'out line on a fresh game');
  g.spend(8);
  must(!els['ask-msg'].hidden && els['ask-msg'].textContent === LABELS.pt.outOfQuestions, 'out line missing in the new game');
});

await check('CLI verdict in PT: Veredito, Culpado, Pontuação, perguntas feitas, Melhores pontuações', () => {
  const r = cli(['acusar carlos'], ['--lang', 'pt']);
  must(r.status === 0, 'cli failed: ' + r.stderr);
  for (const t of ['=== Veredito ===', 'Correto!', 'Culpado: Carlos Mendes', 'Solução: ', 'Pontuação: 100 (perguntas feitas: 0)', '--- Melhores pontuações ---']) must(r.stdout.includes(t), 'missing: ' + t);
  for (const t of ['Verdict', 'Culprit:', 'Score:', 'questions asked', 'Top Scores']) must(!r.stdout.includes(t), 'English left: ' + t);
});

await check('CLI wrong verdict in PT and the English verdict unchanged', () => {
  const pt = cli(['acusar maya'], ['--lang', 'pt']);
  must(pt.stdout.includes('Errado.') && pt.stdout.includes('Culpado: Carlos Mendes') && pt.stdout.includes('Pontuação: 0 (perguntas feitas: 0)'), 'PT wrong verdict');
  const en = cli(['accuse carlos']);
  for (const t of ['=== Verdict ===', 'Correct!', 'Culprit: Carlos Mendes', 'Solution: ', 'Score: 100 (questions asked: 0)', '--- Top Scores ---']) must(en.stdout.includes(t), 'EN missing: ' + t);
  must(!en.stdout.includes('Culpado') && !en.stdout.includes('Pontuação'), 'PT in an English game');
});

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`after-verdict: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
