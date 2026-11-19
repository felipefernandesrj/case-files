// M2 delivery sprint 16: the remaining terminal lines (unknown command, usage, empty history, history Q/A) speak the player's language
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }
// the suite shares data/scores.json; these games never accuse, but the file is restored anyway
const scoreFile = path.join(root, 'data/scores.json');
const saved = fs.existsSync(scoreFile) ? fs.readFileSync(scoreFile, 'utf8') : null;
const cli = (lines, args = []) => spawnSync(process.execPath, ['src/cli.js', ...args], { cwd: root, input: lines.join('\n') + '\n', encoding: 'utf8', timeout: 15000 });
const PT = ['xyz', 'pergunta', 'acusar', 'historico', 'historico carlos', 'pergunta carlos onde voce estava', 'historico carlos', 'sair'];
const EN = ['xyz', 'ask', 'accuse', 'history', 'history carlos', 'ask carlos where were you', 'history carlos', 'quit'];

await check('CLI PT: unknown command and the three usage lines in Portuguese', () => {
  const r = cli(PT, ['--lang', 'pt']);
  must(r.status === 0, 'cli failed: ' + r.stderr);
  for (const t of ['Comando desconhecido. Comandos: pergunta, acusar, historico, sair', 'Uso: pergunta <suspectId> <pergunta>', 'Uso: acusar <suspectId>', 'Uso: historico <suspectId>']) must(r.stdout.includes(t), 'missing: ' + t);
});

await check('CLI PT: empty history and history rows (P:/R:) in Portuguese', () => {
  const r = cli(PT, ['--lang', 'pt']);
  must(r.stdout.includes('Nenhuma conversa com este suspeito ainda.'), 'no PT empty history line');
  must(/^1\. P: onde voce estava$/m.test(r.stdout), 'no P: row');
  must(/^ {3}R: .+/m.test(r.stdout), 'no R: row');
});

await check('CLI PT: no English command line left', () => {
  const r = cli(PT, ['--lang', 'pt']);
  for (const t of ['Unknown command', 'Usage:', 'No history', '. Q: ', '   A: ']) must(!r.stdout.includes(t), 'English left: ' + t);
});

await check('CLI PT Night Train: same Portuguese lines', () => {
  const r = cli(['xyz', 'acusar', 'historico ines', 'sair'], ['--lang', 'pt', '--case', 'night-train']);
  must(r.status === 0, 'cli failed: ' + r.stderr);
  for (const t of ['Comando desconhecido.', 'Uso: acusar <suspectId>', 'Nenhuma conversa com este suspeito ainda.']) must(r.stdout.includes(t), 'missing: ' + t);
});

await check('CLI EN: usage, history and Q:/A: unchanged, unknown command lists the commands', () => {
  const r = cli(EN);
  for (const t of ['Unknown command. Commands: ask, accuse, history, quit', 'Usage: ask <suspectId> <question>', 'Usage: accuse <suspectId>', 'Usage: history <suspectId>', 'No history for this suspect.']) must(r.stdout.includes(t), 'missing: ' + t);
  must(/^1\. Q: where were you$/m.test(r.stdout) && /^ {3}A: .+/m.test(r.stdout), 'Q:/A: rows');
  for (const t of ['Comando', 'Uso:', 'Nenhuma', '. P: ']) must(!r.stdout.includes(t), 'PT in EN: ' + t);
});

await check('CLI: a PT command alias switches the next lines to Portuguese', () => {
  const r = cli(['historico', 'xyz', 'sair']);
  must(r.stdout.includes('Uso: historico <suspectId>'), 'alias line not PT');
  must(r.stdout.includes('Comando desconhecido.'), 'next line not PT');
});

if (saved === null) fs.rmSync(scoreFile, { force: true }); else fs.writeFileSync(scoreFile, saved);
for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`cli-lines: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
