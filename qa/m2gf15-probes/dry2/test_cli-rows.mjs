// M2 game feel sprint 15: the terminal leaderboard rows and the Suspects heading speak the player's language
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }
const cli = (lines, args = []) => spawnSync(process.execPath, ['src/cli.js', ...args], { cwd: root, input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 15000 });
const rows = (out) => out.split('\n').filter((l) => /^\d+\. .+ - \d+ /.test(l));
// a fixed leaderboard for every run (the suite shares data/scores.json; a 0 point row fell out of the top 10 once it filled up), restored at the end
const scoreFile = path.join(root, 'data/scores.json');
const saved = fs.existsSync(scoreFile) ? fs.readFileSync(scoreFile, 'utf8') : null;
const V = 'case-violin-001';
const FIXTURE = [
  { player: 'ana', score: 100, questions: 1, correct: true, lang: 'pt', at: '2026-11-01T10:00:00.000Z', caseId: V },
  { player: 'bia', score: 75, questions: 3, correct: true, lang: 'pt', at: '2026-11-01T10:01:00.000Z', caseId: V },
  { player: 'zed', score: 0, questions: 0, correct: false, lang: 'en', at: '2026-11-01T10:02:00.000Z', caseId: V },
  { player: 'nt', score: 100, questions: 2, correct: true, lang: 'pt', at: '2026-11-01T10:03:00.000Z', caseId: 'case-night-train-002' },
];
const seed = () => { fs.mkdirSync(path.dirname(scoreFile), { recursive: true }); fs.writeFileSync(scoreFile, JSON.stringify(FIXTURE, null, 2)); };
const play = (lines, args) => { seed(); return cli(lines, args); };

await check('CLI PT: every leaderboard row reads pontos and perguntas', () => {
  const r = play(['acusar carlos'], ['--lang', 'pt', '--player', 'rows-pt']);
  must(r.status === 0, 'cli failed: ' + r.stderr);
  const rs = rows(r.stdout);
  must(rs.length > 0, 'no leaderboard rows');
  for (const l of rs) must(/ - \d+ pontos \(\d+ perguntas?\) \[(en|pt)\]$/.test(l), 'row not in PT: ' + l);
  must(!/ pts | Q\)/.test(r.stdout), 'English row words left');
});

await check('CLI PT: one question reads (1 pergunta), fixture rows (1 pergunta), (3 perguntas), (0 perguntas)', () => {
  const one = play(['pergunta carlos onde voce estava', 'acusar carlos'], ['--lang', 'pt', '--player', 'rows-pt1']);
  const row = rows(one.stdout).find((l) => l.includes(' rows-pt1 - '));
  must(row && row.includes('(1 pergunta)'), 'one question row: ' + row);
  const zero = play(['acusar maya'], ['--lang', 'pt', '--player', 'rows-pt0']);
  const out = zero.stdout;
  must(out.includes('. ana - 100 pontos (1 pergunta) [pt]'), 'ana row in PT');
  must(out.includes('. bia - 75 pontos (3 perguntas) [pt]'), 'bia row in PT');
  must(out.includes('. zed - 0 pontos (0 perguntas) [en]'), 'zed row (an English game) in PT');
});

await check('CLI PT: the intro heading reads Suspeitos:', () => {
  const r = play(['sair'], ['--lang', 'pt']);
  must(/^Suspeitos:$/m.test(r.stdout), 'no Suspeitos: heading');
  must(!r.stdout.includes('Suspects:'), 'English heading left');
});

await check('CLI PT Night Train: heading and rows in PT', () => {
  const r = play(['acusar ines'], ['--lang', 'pt', '--case', 'night-train', '--player', 'rows-nt']);
  must(/^Suspeitos:$/m.test(r.stdout), 'no Suspeitos: heading');
  const rs = rows(r.stdout);
  must(rs.length > 0 && rs.every((l) => / pontos \(\d+ perguntas?\)/.test(l)), 'rows: ' + rs.join(' / '));
  must(r.stdout.includes('. nt - 100 pontos (2 perguntas) [pt]'), 'Night Train fixture row');
});

await check('CLI EN: rows and heading unchanged (pts, Q, Suspects:)', () => {
  const r = play(['ask carlos where were you', 'accuse carlos'], ['--player', 'rows-en1']);
  must(/^Suspects:$/m.test(r.stdout), 'no Suspects: heading');
  const rs = rows(r.stdout);
  must(rs.length > 0 && rs.every((l) => / - \d+ pts \(\d+ Q\) \[(en|pt)\]$/.test(l)), 'rows: ' + rs.join(' / '));
  const row = rs.find((l) => l.includes(' rows-en1 - '));
  must(row && row.includes('100 pts (1 Q)'), 'one question row: ' + row);
});

await check('CLI EN: no Portuguese words in an English game, fixture rows (1 Q), (3 Q), (0 Q)', () => {
  const r = play(['accuse maya'], ['--player', 'rows-en0']);
  for (const t of ['pontos', 'pergunta', 'Suspeitos']) must(!r.stdout.includes(t), 'PT in EN: ' + t);
  for (const t of ['. ana - 100 pts (1 Q) [pt]', '. bia - 75 pts (3 Q) [pt]', '. zed - 0 pts (0 Q) [en]']) must(r.stdout.includes(t), 'EN row missing: ' + t);
});

if (saved === null) fs.rmSync(scoreFile, { force: true }); else fs.writeFileSync(scoreFile, saved);
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`cli-rows: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
