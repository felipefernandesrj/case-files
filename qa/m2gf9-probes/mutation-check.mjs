// QA: each mutation must make test/aftermath.mjs fail. Restores files after each.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 no contState guard', 'public/index.html', "!correct && contState !== 'run' && lastAccuseResult.aftermath", "!correct && lastAccuseResult.aftermath"],
 ['M2 no is-static', 'public/index.html', "if (lastAccuseResult.amShown) paper.classList.add('is-static');", ''],
 ['M3 server drops aftermath', 'src/server.js', "aftermath: correct ? null : (play.aftermath?.[suspectId] ?? null),", 'aftermath: null,'],
 ['M4 server sends it on correct', 'src/server.js', "aftermath: correct ? null : (play.aftermath?.[suspectId] ?? null),", 'aftermath: play.aftermath?.[suspectId] ?? null,'],
 ['M5 always EN', 'public/index.html', "lastAccuseResult.aftermath[lang === 'pt' ? 'pt' : 'en'] : null;\n  if (am)", "lastAccuseResult.aftermath.en : null;\n  if (am)"],
 ['M6 headline not announced', 'public/index.html', "(am ? am.headline + '. ' : '') + ", ''],
 ['M7 no docking', 'public/css/game.css', '.continue.is-over { top: auto; bottom: 16px; transform: translateX(-50%); }', ''],
 ['M8 reduced motion animates', 'public/css/game.css', '@media (prefers-reduced-motion: reduce) { .aftermath { animation: none; } }', ''],
 ['M9 maya story missing', 'content/case.json', '"maya": {', '"maya_x": {'],
 ['M10 em dash in story', 'content/cases/night-train.json', 'Somewhere, the real thief', 'Somewhere \u2014 the real thief'],
 ['M11 wrong culprit named', 'content/case.json', 'janitor Carlos Mendes gently', 'porter Tomás Reyes gently'],
 ['M12 publicCase leaks', 'src/case.js', "    rooms,\n    timeline,", "    rooms,\n    timeline,\n    aftermath: c.aftermath,"],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let fails = 0; try { execSync('node test/aftermath.mjs', { stdio: 'pipe' }); } catch (e) { fails = (String(e.stdout).match(/^FAIL/gm) || []).length; }
  fs.writeFileSync(f, orig); out.push(`${name}: ${fails ? `caught (${fails} failing)` : 'NOT CAUGHT'}`);
}
fs.writeFileSync('qa/m2gf9-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
