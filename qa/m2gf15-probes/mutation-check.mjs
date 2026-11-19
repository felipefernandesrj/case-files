// QA tooling (not product): each mutation must make test/cli-rows.mjs fail; files restored after each.
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const M = [
  ['M1 PT points English', 'src/cli.js', "points: 'pontos'", "points: 'pts'"],
  ['M2 PT plural English', 'src/cli.js', "qn: 'perguntas'", "qn: 'Q'"],
  ['M3 PT singular English', 'src/cli.js', "q1: 'pergunta'", "q1: 'Q'"],
  ['M4 PT singular used for every count', 'src/cli.js', "e.questions === 1 ? V.q1 : V.qn", "V.q1"],
  ['M5 PT plural used for one', 'src/cli.js', "e.questions === 1 ? V.q1 : V.qn", "V.qn"],
  ['M6 rows hardcoded pts', 'src/cli.js', "${e.score} ${V.points} (", "${e.score} pts ("],
  ['M7 rows always PT table', 'src/cli.js', "const V = VERDICT_LINES[lang];", "const V = VERDICT_LINES.pt;"],
  ['M8 PT heading English', 'src/cli.js', "pt: 'Suspeitos:'", "pt: 'Suspects:'"],
  ['M9 heading hardcoded', 'src/cli.js', "console.log(`\\n${SUSPECTS_HEADING[lang]}`);", "console.log('\\nSuspects:');"],
  ['M10 heading always PT', 'src/cli.js', "SUSPECTS_HEADING[lang]", "SUSPECTS_HEADING.pt"],
  ['M11 EN points changed', 'src/cli.js', "points: 'pts'", "points: 'points'"],
  ['M12 EN Q changed', 'src/cli.js', "qn: 'Q' }", "qn: 'questions' }"],
];
const out = [];
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8');
  if (!orig.includes(from)) { out.push(`${name}: NOT APPLIED (pattern missing)`); continue; }
  fs.writeFileSync(file, orig.replace(from, to));
  const r = spawnSync(process.execPath, ['test/cli-rows.mjs'], { encoding: 'utf8', timeout: 90000 });
  fs.writeFileSync(file, orig);
  const fails = (r.stdout.match(/^FAIL .*/gm) || []);
  out.push(`${name}: ${r.status !== 0 ? 'CAUGHT' : 'MISSED'} (${fails.length} fail) ${fails[0] ? fails[0].slice(0, 110) : ''}`);
}
const caught = out.filter(l => l.includes('CAUGHT')).length;
out.push(`caught ${caught}/${M.length}`);
fs.writeFileSync(process.env.MUT_OUT || 'qa/m2gf15-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
