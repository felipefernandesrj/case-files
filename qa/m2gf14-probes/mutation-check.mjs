// QA tooling (not product): each mutation must make test/after-verdict.mjs fail; files restored after each.
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const M = [
  ['M1 verdict keeps the out line shown', 'public/index.html', "if (askMsg) { askMsg.hidden = true; askMsg.textContent = ''; }", "if (askMsg) { askMsg.textContent = ''; }"],
  ['M2 verdict keeps the out line text', 'public/index.html', "if (askMsg) { askMsg.hidden = true; askMsg.textContent = ''; }", "if (askMsg) { askMsg.hidden = true; }"],
  ['M3 no clear at all', 'public/index.html', "    const askMsg = document.getElementById('ask-msg');\n    if (askMsg) { askMsg.hidden = true; askMsg.textContent = ''; }\n  } else {", "  } else {"],
  ['M4 language switch re-shows after the verdict', 'public/index.html', "  if (out && !gameOver) {\n    document.getElementById('q').disabled = true;", "  if (out) {\n    document.getElementById('q').disabled = true;"],
  ['M5 PT Culprit English', 'src/cli.js', "culprit: 'Culpado'", "culprit: 'Culprit'"],
  ['M6 PT Score English', 'src/cli.js', "score: 'Pontuação'", "score: 'Score'"],
  ['M7 PT questions asked English', 'src/cli.js', "asked: 'perguntas feitas'", "asked: 'questions asked'"],
  ['M8 PT heading English', 'src/cli.js', "title: 'Veredito'", "title: 'Verdict'"],
  ['M9 PT Top Scores English', 'src/cli.js', "top: 'Melhores pontuações'", "top: 'Top Scores'"],
  ['M10 always English lines', 'src/cli.js', 'const V = VERDICT_LINES[lang];', 'const V = VERDICT_LINES.en;'],
  ['M11 always PT lines', 'src/cli.js', 'const V = VERDICT_LINES[lang];', 'const V = VERDICT_LINES.pt;'],
  ['M12 PT wrong English', 'src/cli.js', "wrong: 'Errado.'", "wrong: 'Wrong.'"],
];
const out = [];
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8');
  if (!orig.includes(from)) { out.push(`${name}: NOT APPLIED (pattern missing)`); continue; }
  fs.writeFileSync(file, orig.replace(from, to));
  const r = spawnSync(process.execPath, ['test/after-verdict.mjs'], { encoding: 'utf8', timeout: 60000 });
  fs.writeFileSync(file, orig);
  const fails = (r.stdout.match(/^FAIL .*/gm) || []);
  out.push(`${name}: ${r.status !== 0 ? 'CAUGHT' : 'MISSED'} (${fails.length} fail) ${fails[0] ? fails[0].slice(0, 110) : ''}`);
}
const caught = out.filter(l => l.includes('CAUGHT')).length;
out.push(`caught ${caught}/${M.length}`);
fs.writeFileSync(process.env.MUT_OUT || 'qa/m2gf14-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
