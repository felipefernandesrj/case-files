// QA tooling (not product): each mutation must make test/ask-lock.mjs fail; files restored after each.
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const M = [
  ['M1 no lock class', 'public/index.html', "form.classList.toggle('is-locked', !!reason);", "form.classList.toggle('is-locked', false);"],
  ['M2 game over loses to budget', 'public/index.html', "const reason = gameOver ? 'over' : (budgetOut() ? 'out' : '');", "const reason = budgetOut() ? 'out' : (gameOver ? 'over' : '');"],
  ['M3 aria-disabled never removed', 'public/index.html', "    else el.removeAttribute('aria-disabled');\n", "\n"],
  ['M4 placeholder kept on open game', 'public/index.html', "(reason === 'out' ? LABELS[lang].outPlaceholder : '')", "LABELS[lang].outPlaceholder"],
  ['M5 setGameOver no refresh', 'public/index.html', "    accuseBtns.forEach(b => { b.disabled = false; });\n  }\n  if (typeof renderAskLock === 'function') renderAskLock();", "    accuseBtns.forEach(b => { b.disabled = false; });\n  }"],
  ['M6 cursor default', 'public/css/game.css', 'color: var(--cf-text-dim); cursor: not-allowed;', 'color: var(--cf-text-dim); cursor: default;'],
  ['M7 placeholder faded', 'public/css/game.css', '#ask-form.is-locked #q::placeholder { color: var(--cf-text-dim); opacity: 1;', '#ask-form.is-locked #q::placeholder { color: var(--cf-text-dim); opacity: 0.5;'],
  ['M8 low contrast text-dim', 'public/css/game.css', '--cf-text-dim: #C9BFAE;', '--cf-text-dim: #4A443C;'],
  ['M9 no reduced motion rule', 'public/css/game.css', '@media (prefers-reduced-motion: reduce) { #ask-form #q, #ask-form #ask-btn { transition: none; } }', ''],
  ['M10 PT placeholder English', 'public/best.js', "outPlaceholder: 'Sem perguntas'", "outPlaceholder: 'Out of questions'"],
  ['M11 CLI no out line at zero', 'src/cli.js', "          if (questionsLeft === 0) console.log(OUT_LINE[lang]);\n", ''],
  ['M12 CLI raw error', 'src/cli.js', "    if (e.code === 'out_of_questions') {", "    if (false) {"],
  ['M13 CLI no start budget', 'src/cli.js', "  console.log(budgetText(lang, questionsLeft, questionBudget));\n}", "}"],
  ['M14 CLI loses error code', 'src/cli.js', '    e.code = err.code;\n', ''],
];
const out = [];
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8');
  if (!orig.includes(from)) { out.push(`${name}: NOT APPLIED (pattern missing)`); continue; }
  fs.writeFileSync(file, orig.replace(from, to));
  const r = spawnSync(process.execPath, ['test/ask-lock.mjs'], { encoding: 'utf8', timeout: 60000 });
  fs.writeFileSync(file, orig);
  const fails = (r.stdout.match(/^FAIL .*/gm) || []);
  out.push(`${name}: ${r.status !== 0 ? 'CAUGHT' : 'MISSED'} (${fails.length} fail) ${fails[0] ? fails[0].slice(0, 110) : ''}`);
}
const caught = out.filter(l => l.includes('CAUGHT')).length;
out.push(`caught ${caught}/${M.length}`);
fs.writeFileSync('qa/m2gf13-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
