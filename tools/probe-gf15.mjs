// QA probe (not product), M2 game feel sprint 15: does a Portuguese terminal game print the leaderboard rows and the Suspects heading in Portuguese?
import fs from 'node:fs'; import { spawnSync } from 'node:child_process';
const [outJson = 'qa/m2gf15-probes/probe.json', outTxt = 'qa/m2gf15-probes/cli.txt'] = process.argv.slice(2);
const run = (lines, args) => spawnSync(process.execPath, ['src/cli.js', ...args], { input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 20000 });
const cases = [
  ['PT correct', ['acusar carlos'], ['--lang', 'pt', '--player', 'probe-pt']],
  ['PT wrong', ['acusar maya'], ['--lang', 'pt', '--player', 'probe-pt']],
  ['PT one question', ['pergunta carlos onde voce estava', 'acusar carlos'], ['--lang', 'pt', '--player', 'probe-pt1']],
  ['PT Night Train', ['acusar ines'], ['--lang', 'pt', '--case', 'night-train', '--player', 'probe-pt']],
  ['EN correct', ['accuse carlos'], ['--player', 'probe-en']],
  ['EN one question', ['ask carlos where were you', 'accuse carlos'], ['--player', 'probe-en1']],
];
const res = []; let txt = '';
for (const [name, lines, args] of cases) {
  const r = run(lines, args); txt += `## ${name}: ${lines.join(' | ')} ${args.join(' ')}\n${r.stdout}${r.stderr ? 'STDERR ' + r.stderr : ''}\n`;
  const rows = r.stdout.split('\n').filter((l) => /^\d+\. .+ - \d+ /.test(l));
  const pt = name.startsWith('PT');
  res.push({ name, status: r.status,
    suspectsHeading: (r.stdout.match(/^(Suspects|Suspeitos):$/m) || [null])[0],
    rows: rows.length, firstRows: rows.slice(0, 3),
    englishRows: rows.filter((l) => / pts \(\d+ Q\)/.test(l)).length,
    ptRows: rows.filter((l) => / pontos \(\d+ perguntas?\)/.test(l)).length,
    oneQuestionRow: rows.find((l) => l.includes(name.startsWith('PT') ? 'probe-pt1' : 'probe-en1')) || null,
    ok: pt ? (rows.length > 0 && rows.every((l) => / pontos \(\d+ perguntas?\)/.test(l)) && /^Suspeitos:$/m.test(r.stdout))
           : (rows.length > 0 && rows.every((l) => / pts \(\d+ Q\)/.test(l)) && /^Suspects:$/m.test(r.stdout)) });
}
fs.writeFileSync(outJson, JSON.stringify(res, null, 1)); fs.writeFileSync(outTxt, txt);
for (const x of res) console.log(`${x.ok ? 'OK  ' : 'BAD '} ${x.name}: heading=${x.suspectsHeading} rows=${x.rows} en=${x.englishRows} pt=${x.ptRows} one=${x.oneQuestionRow}`);
