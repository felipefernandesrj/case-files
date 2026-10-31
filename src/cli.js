// Terminal player: node src/cli.js [--lang pt]. Commands: ask <suspect> <question> | accuse <suspect> | quit
import readline from 'node:readline/promises';
import { createServer } from './server.js';
const lang = process.argv.includes('--lang') ? process.argv[process.argv.indexOf('--lang') + 1] : 'en';
const srv = createServer().listen(0); await new Promise(r => srv.once('listening', r));
const B = `http://127.0.0.1:${srv.address().port}`, q = `?lang=${lang}`;
const post = async (p, b) => (await fetch(B + p + q, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
const c = await (await fetch(B + '/api/case' + q)).json(); const { sessionId } = await post('/api/session', {});
console.log(`\n${c.title}\n${c.intro}\n`); for (const s of c.suspects) console.log(`  ${s.id}: ${s.name}, ${s.role}`);
console.log('\nask <id> <question> | accuse <id> | quit');
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
for await (const line of rl) {
  const [cmd, id, ...rest] = line.trim().split(/\s+/);
  if (cmd === 'quit') break;
  if (cmd === 'ask') { const r = await post('/api/ask', { suspectId: id, question: rest.join(' '), sessionId }); console.log(r.answer || r.error); }
  else if (cmd === 'accuse') { const r = await post('/api/accuse', { suspectId: id, sessionId, player: 'cli' }); console.log(r.error || `${r.correct ? 'SOLVED' : 'WRONG'}: ${r.solution} (score ${r.score})`); if (!r.error) break; }
}
rl.close(); srv.close();
