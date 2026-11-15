// QA harness: mutate the sprint 7 code one change at a time and confirm test/quick-accuse.mjs (and test/suspicion.mjs) catch each
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const H = 'public/index.html', C = 'public/css/game.css';
const M = [
 ['M1 stored off ignored', H, "return !(store && store.getItem(CONFIRM_KEY) === 'off');", 'return true;'],
 ['M2 click always confirms', H, '!confirmOn() || confirm(', 'confirm('],
 ['M3 click never confirms', H, '!confirmOn() || confirm(', 'true || confirm('],
 ['M4 off not stored', H, " else store.setItem(CONFIRM_KEY, 'off');", ''],
 ['M5 checking again keeps off', H, 'if (on) store.removeItem(CONFIRM_KEY); else', 'if (on) {} else'],
 ['M6 checkbox not synced', H, '  if (box) box.checked = confirmOn();\n', ''],
 ['M7 pt label English', H, "lang === 'pt' ? 'Confirmar antes de acusar'", "lang === 'pt' ? 'Confirm before accusing'"],
 ['M8 not checked by default', H, 'id="ask-confirm" checked>', 'id="ask-confirm">'],
 ['M9 no change listener', H, "document.getElementById('ask-confirm').addEventListener('change', (e) => setConfirmOn(e.target.checked));\n", ''],
 ['M10 hidden list flashes', H, ' && list.offsetParent !== null', ''],
 ['M11 setLang skips live relabel', H, '  relabelSuspicionLive();\n  renderConfirmToggle();\n', '  renderConfirmToggle();\n'],
 ['M12 relabel writes empty line', H, 'live && live.textContent && susLast', 'live && susLast'],
 ['M13 last clue not kept', H, 'susLast = { implicates', 'void { implicates'],
 ['M14 game over not checked', H, '      if (gameOver) return;\n      if (!confirmOn()', '      if (!confirmOn()'],
 ['M15 no focus ring', C, '.ask-confirm input[type="checkbox"]:focus-visible { outline: 3px solid var(--cf-focus); outline-offset: 2px; }', ''],
 ['M16 empty clue still saved', H, '  if (!text) return;\n  susLast', '  susLast'],
];
const out = [];
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8'); if (!orig.includes(from)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(file, orig.replace(from, to));
  let txt = '';
  for (const t of ['test/quick-accuse.mjs', 'test/suspicion.mjs']) { try { txt += execSync(`node ${t}`, { encoding: 'utf8' }); } catch (e) { txt += e.stdout; } }
  fs.writeFileSync(file, orig);
  const fails = txt.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5, 70));
  out.push(`${name}: ${fails.length ? 'caught, ' + fails.length + ' fail(s): ' + fails.join(' | ') : 'NOT CAUGHT'}`);
}
fs.writeFileSync('qa/m2gf7-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
