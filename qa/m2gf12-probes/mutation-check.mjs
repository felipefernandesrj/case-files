import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 no budget check on the server', 'src/server.js', "if (sess.questions >= budget) {", "if (false) {"],
 ['M2 budget check after the model call (off by one)', 'src/server.js', "if (sess.questions >= budget) {", "if (sess.questions > budget) {"],
 ['M3 violin budget back to 20', 'content/case.json', '"questionBudget": 8,', '"questionBudget": 20,'],
 ['M4 night train budget unfair (4)', 'content/cases/night-train.json', '"questionBudget": 10,', '"questionBudget": 4,'],
 ['M5 failed calls spend the budget', 'src/server.js', "        sess.calls += 1;\n", "        sess.calls += 1;\n        sess.questions += 0.5;\n"],
 ['M6 session does not report the budget', 'src/server.js', ", budget: questionBudgetFor(pack[wanted || defaultKey] || defaultCase) });", " });"],
 ['M7 no PT out line', 'src/messages.js', "pt: 'Acabaram as perguntas desta partida. Aponte o culpado em Acusar ou toque em Nova partida para jogar de novo.',", "pt: 'No questions left in this game. Name the culprit in Accuse, or press Start over for a new game.',"],
 ['M8 Ask not locked when out', 'public/index.html', "    document.getElementById('q').disabled = true;\n    document.getElementById('ask-btn').disabled = true;\n    showError(LABELS[lang].outOfQuestions, 'ask');", "    showError(LABELS[lang].outOfQuestions, 'ask');"],
 ['M9 button stays after game over', 'public/index.html', "go.hidden = !out || gameOver;", "go.hidden = !out;"],
 ['M10 burn replays on every render', 'public/index.html', "if (budgetLeftShown !== null && left < budgetLeftShown && pips[left])", "if (pips[left])"],
 ['M11 no low state', 'public/index.html', "left <= BUDGET_LOW);", "left < 0);"],
 ['M12 reduced motion misses burn', 'public/css/game.css', ".qb-pip, .qb-pip.is-burning, .q-budget.is-low .qb-pip", ".qb-pip, .q-budget.is-low .qb-pip"],
 ['M13 meter read twice by screen readers', 'public/index.html', '<div id="q-budget" class="q-budget" aria-hidden="true" hidden></div>', '<div id="q-budget" class="q-budget" hidden></div>'],
 ['M14 live line still says used', 'public/index.html', "questionBudget ? budgetText(lang, left, questionBudget) : questionsText(lang, questionsUsed)", "questionsText(lang, questionsUsed)"],
 ['M16 reduced motion weaker than the low blink (bug found by the after probe)', 'public/css/game.css', ".q-budget.is-low .qb-pip:not(.is-spent), .q-budget.is-out { animation: none;", ".q-budget.is-low .qb-pip, .q-budget.is-out { animation: none;"],
 ['M15 PT budget line in English', 'public/best.js', "`Perguntas restantes: ${left} de ${budget}`", "`Questions left: ${left} of ${budget}`"],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let r; try { r = execSync('node test/question-budget.mjs', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { r = e.stdout || ''; }
  fs.writeFileSync(f, orig);
  const fails = (r.match(/^FAIL/gm) || []).length; out.push(`${name}: ${fails ? 'caught (' + fails + ' FAIL)' : 'NOT caught'}`);
}
console.log(out.join('\n'));
