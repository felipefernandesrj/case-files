// M2 game feel sprint 12: harder game, a per-case question budget you can see (pips that burn, low and out states, Name the culprit)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.js';
import { friendly } from '../src/messages.js';
import { CASES, loadCase } from '../src/case.js';
import { DEFAULT_QUESTION_BUDGET, maxCallsFor, fairMinimum, questionBudgetFor } from '../src/budget.js';
import { scoreFor } from '../src/scoreboard.js';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
const { LABELS, budgetText } = await import(path.join(root, 'public/best.js'));
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

// fake model: counts calls, fail=true answers 502
const fake = { calls: 0, fail: false };
const fetchImpl = async () => {
  fake.calls += 1;
  if (fake.fail) return new Response(JSON.stringify({ error: { message: 'boom' } }), { status: 502, headers: { 'Content-Type': 'application/json' } });
  return new Response(JSON.stringify({ choices: [{ message: { content: 'I was in the hall all evening.' } }] }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
const server = createServer({ caseFile: 'content/case.json', scoreFile: null, key: 'test-key', baseUrl: 'http://fake.local/v1', fetchImpl, mock: false });
await new Promise(r => server.listen(0, r));
const B = `http://127.0.0.1:${server.address().port}/api`;
const post = async (p, b) => { const r = await fetch(B + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return [r.status, await r.json()]; };
const ask = (sessionId, lang = 'en') => post('/ask', { sessionId, suspectId: 'lorenzo', question: 'Where were you?', lang });

await check('every case has a fair budget: at least twice the fewest questions that solve it, under its call cap and under the old 20', () => {
  for (const file of Object.values(CASES)) {
    const c = loadCase(file);
    const b = questionBudgetFor(c);
    must(b >= 2 * fairMinimum(c), `${file}: budget ${b} under 2 x ${fairMinimum(c)}`);
    must(b <= maxCallsFor(c) && b < 20, `${file}: budget ${b} not under the cap`);
  }
  must(questionBudgetFor(loadCase(CASES.violin)) === 8 && questionBudgetFor(loadCase(CASES['night-train'])) === 10, 'violin 8, night train 10');
});

await check('questionBudgetFor falls back to the default (never above the cap) for a missing or bad value', () => {
  must(DEFAULT_QUESTION_BUDGET === 10, 'default');
  for (const bad of [undefined, 0, -1, '8', 2.5, 21]) must(questionBudgetFor({ questionBudget: bad }) === 10, `bad ${bad}`);
  must(questionBudgetFor({ questionBudget: 5 }) === 5, 'custom');
  must(questionBudgetFor({ maxCalls: 4 }) === 4, 'capped by maxCalls');
  must(fairMinimum({ suspects: [1, 2, 3] }) === 4 && fairMinimum({ suspects: [1, 2, 3, 4] }) === 5, 'fairMinimum');
});

await check('a new game reports its budget per file and every answer reports what is left', async () => {
  const [, s1] = await post('/session', {});
  const [, s2] = await post('/session', { case: 'night-train' });
  must(s1.budget === 8 && s2.budget === 10, `session budgets ${s1.budget} ${s2.budget}`);
  const [st, a] = await ask(s1.sessionId);
  must(st === 200 && a.budget === 8 && a.left === 7 && a.questions === 1, JSON.stringify(a));
});

await check('the question after the last one is refused with out_of_questions in EN and PT and no model call', async () => {
  const [, { sessionId }] = await post('/session', {});
  for (let i = 0; i < 8; i++) { const [st, a] = await ask(sessionId); must(st === 200 && a.left === 7 - i, `answer ${i}`); }
  fake.calls = 0;
  for (const lang of ['en', 'pt']) {
    const [st, j] = await ask(sessionId, lang);
    must(st === 409 && j.code === 'out_of_questions' && j.left === 0 && j.questions === 8 && j.budget === 8, `${lang} ${st} ${JSON.stringify(j)}`);
    must(j.message === friendly('out_of_questions', lang), `${lang} message`);
  }
  must(fake.calls === 0, 'model called after the budget');
  must(friendly('out_of_questions', 'en') !== friendly('out_of_questions', 'pt'), 'not translated');
});

await check('you can still accuse after the last question, scored on 8 questions', async () => {
  const [, { sessionId }] = await post('/session', {});
  for (let i = 0; i < 9; i++) await ask(sessionId);
  const [st, v] = await post('/accuse', { sessionId, suspectId: 'carlos', player: 'budget', lang: 'en' });
  must(st === 200 && v.correct === true && v.questions === 8 && v.score === scoreFor(true, 8), JSON.stringify(v));
});

await check('a failed model call does not spend the budget and Start over gives a full one', async () => {
  const [, { sessionId }] = await post('/session', {});
  fake.fail = true;
  const [st] = await ask(sessionId);
  fake.fail = false;
  must(st === 502, 'should fail');
  const [, a] = await ask(sessionId);
  must(a.left === 7, `left ${a.left}`);
  const [, fresh] = await post('/session', {});
  const [, b] = await ask(fresh.sessionId);
  must(b.left === 7 && fresh.budget === 8, 'fresh budget');
});

await check('budget line and labels exist in EN and PT', () => {
  must(budgetText('en', 3, 8) === 'Questions left: 3 of 8' && budgetText('pt', 3, 8) === 'Perguntas restantes: 3 de 8', 'budgetText');
  for (const l of ['en', 'pt']) must(LABELS[l].outOfQuestions && LABELS[l].toAccuse, `${l} labels`);
  must(LABELS.en.outOfQuestions === friendly('out_of_questions', 'en') && LABELS.pt.outOfQuestions === friendly('out_of_questions', 'pt'), 'client and server lines match');
});

await check('markup: the meter is decorative (the live #questions-used line says it), the button exists, reduced motion stops every budget animation', () => {
  must(/<div id="q-budget" class="q-budget" aria-hidden="true" hidden><\/div>/.test(html), 'meter');
  must(/<button type="button" id="budget-accuse"[^>]*hidden>/.test(html), 'button');
  must(fnSource('renderQuestions').includes('budgetText(lang, left, questionBudget)'), 'live line');
  const rm = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce) { .qb-pip'));
  for (const sel of ['.qb-pip.is-burning', '.q-budget.is-low .qb-pip', '.q-budget.is-out']) must(rm.includes(sel), `reduced motion ${sel}`);
  must(rm.includes('animation: none'), 'animation none');
});

// sandbox of renderBudget with a tiny DOM
function el(tag = 'div') {
  const cls = new Set();
  return { tag, children: [], hidden: false, disabled: false, textContent: '', focused: false, _span: null,
    classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), toggle: (c, on) => (on ? cls.add(c) : cls.delete(c)), contains: (c) => cls.has(c) },
    set className(v) { cls.clear(); v.split(' ').forEach((c) => c && cls.add(c)); },
    set innerHTML(v) { this.children = []; },
    appendChild(c) { this.children.push(c); },
    querySelector() { return this._span || (this._span = el('span')); } };
}
function sandbox(st) {
  const ids = { 'q-budget': el(), 'budget-accuse': el('button'), q: el('input'), 'ask-btn': el('button'), 'ask-msg': el('p') };
  const shown = [];
  const fn = new Function('document', 'LABELS', 'S', 'shown', `
    let questionBudget = S.budget, questionsUsed = S.used, gameOver = S.over, lang = S.lang, budgetLeftShown = null; const BUDGET_LOW = 2;
    function showError(m, w) { shown.push([m, w]); }
    ${fnSource('budgetOut')}
    ${fnSource('renderBudget')}
    return { render: () => renderBudget(Math.max(0, questionBudget - questionsUsed)), set: (k, v) => { if (k === 'used') questionsUsed = v; if (k === 'lang') lang = v; if (k === 'over') gameOver = v; } };`);
  const api = fn({ getElementById: (id) => ids[id], createElement: () => el('span') }, LABELS, st, shown);
  return { ids, shown, api };
}

await check('out of questions locks Ask, shows the line and the Name the culprit button, which game over hides', () => {
  const { ids, shown, api } = sandbox({ budget: 8, used: 8, over: false, lang: 'pt' });
  api.render();
  must(ids.q.disabled && ids['ask-btn'].disabled, 'ask locked');
  must(shown.length === 1 && shown[0][0] === LABELS.pt.outOfQuestions && shown[0][1] === 'ask', 'out line');
  must(!ids['budget-accuse'].hidden && ids['budget-accuse']._span.textContent === LABELS.pt.toAccuse, 'button');
  must(ids['q-budget'].classList.contains('is-out') && ids['q-budget'].children.every((p) => p.classList.contains('is-spent')), 'meter out');
  api.set('over', true); api.render();
  must(ids['budget-accuse'].hidden, 'game over hides button');
});

await check('pips burn one at a time on a new answer only (not on a language switch), low at 2 left, all back on a new game', () => {
  const { ids, api } = sandbox({ budget: 8, used: 0, over: false, lang: 'en' });
  api.render();
  const pips = ids['q-budget'].children;
  must(pips.length === 8 && !pips.some((p) => p.classList.contains('is-burning')), 'fresh meter');
  api.set('used', 6); api.render();
  must(pips[2].classList.contains('is-burning') && pips.filter((p) => p.classList.contains('is-spent')).length === 6, 'burned');
  must(ids['q-budget'].classList.contains('is-low') && !ids['q-budget'].classList.contains('is-out'), 'low at 2 left');
  must(ids['budget-accuse'].hidden && !ids.q.disabled, 'not out yet');
  const before = pips.filter((p) => p.classList.contains('is-burning')).length;
  api.set('lang', 'pt'); api.render();
  must(pips.filter((p) => p.classList.contains('is-burning')).length === before, 're-render added a burn');
  api.set('used', 0); api.render();
  must(!pips.some((p) => p.classList.contains('is-burning') || p.classList.contains('is-spent')) && !ids['q-budget'].classList.contains('is-low'), 'reset');
});

server.close();
for (const r of results) console.log(r);
const failed = results.filter((r) => r.startsWith('FAIL')).length;
console.log(`question-budget: ${results.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
