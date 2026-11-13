import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 no gameOver guard', 'public/index.html', '      if (gameOver) return;\n', ''],
 ['M2 hint text captured at schedule time', 'public/index.html', 'if (cur) showToast(cur.text);', 'showToast(h.text);'],
 ['M3 startHints keeps old timers', 'public/index.html', 'function startHints() {\n  stopHints();', 'function startHints() {'],
 ['M4 three toasts kept', 'public/index.html', 'box.children.length > 2', 'box.children.length > 3'],
 ['M5 pins keep stored label', 'public/index.html', 'pins.map(p => { const room = ((caseData && caseData.rooms) || []).find(r => r.id === p.id); return { id: p.id, label: room ? room.name : p.label }; }).forEach((p, i) => {', 'pins.forEach((p, i) => {'],
 ['M6 publicCase drops hints', 'src/case.js', "text: h.text?.[l] ?? ''", 'text: h.text'],
 ['M7 kicker always English', 'public/index.html', "lang === 'pt' ? 'Pista' : 'Hint'", "'Hint'"],
 ['M8 restart does not start hints', 'public/index.html', "showStep('briefing');\n  startHints();\n  const first = document.querySelector('#suspect-buttons button');\n  if (first) first.focus();\n  else", "showStep('briefing');\n  const first = document.querySelector('#suspect-buttons button');\n  if (first) first.focus();\n  else"],
 ['M9 toast never fades', 'public/index.html', "t.classList.add('is-out'); ", ''],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let r; try { r = execSync('node test/hints.mjs', { encoding: 'utf8' }); } catch (e) { r = e.stdout; }
  fs.writeFileSync(f, orig);
  out.push(`${name}: ${r.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5).split(':')[0]).join('; ') || 'NOT CAUGHT'}`);
}
console.log(out.join('\n'));
