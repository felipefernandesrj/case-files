import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 heading text back to lamp-dim', 'public/css/game.css', '  padding: 4px 12px;\n  color: var(--cf-text);', '  padding: 4px 12px;\n  color: var(--cf-lamp-dim);'],
 ['M2 heading plate too thin', 'public/css/game.css', '  color: var(--cf-text);\n  background: rgba(12,11,10,0.88);\n  border-left', '  color: var(--cf-text);\n  background: rgba(12,11,10,0.2);\n  border-left'],
 ['M3 caption text back to lamp-dim', 'public/css/game.css', 'text-transform: uppercase; color: var(--cf-text); background: rgba(12,11,10,0.88);', 'text-transform: uppercase; color: var(--cf-lamp-dim); background: rgba(12,11,10,0.88);'],
 ['M4 caption plate too thin', 'public/css/game.css', 'color: var(--cf-text); background: rgba(12,11,10,0.88); border: 1px solid var(--cf-lamp-dim);', 'color: var(--cf-text); background: rgba(12,11,10,0.3); border: 1px solid var(--cf-lamp-dim);'],
 ['M5 toast drops its hint id', 'public/index.html', "  if (id) t.setAttribute('data-hint', id);\n", ''],
 ['M6 startHints passes no id', 'public/index.html', 'showToast(cur.text, cur.id);', 'showToast(cur.text);'],
 ['M7 relabel keeps old kicker', 'public/index.html', "    if (k) k.textContent = lang === 'pt' ? 'Pista' : 'Hint';\n", ''],
 ['M8 relabel blanks unknown toasts', 'public/index.html', '    if (cur && s) s.textContent = cur.text;', "    if (s) s.textContent = cur ? cur.text : '';"],
 ['M9 setLang does not relabel', 'public/index.html', '  renderCabinet();\n  relabelToasts();\n', '  renderCabinet();\n'],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let r; try { r = execSync('node test/legibility.mjs', { encoding: 'utf8' }); } catch (e) { r = e.stdout; }
  fs.writeFileSync(f, orig);
  out.push(`${name}: ${r.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5).split(':')[0]).join('; ') || 'NOT CAUGHT'}`);
}
console.log(out.join('\n'));
