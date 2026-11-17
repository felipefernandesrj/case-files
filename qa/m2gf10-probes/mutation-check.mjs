// QA: each mutation must make test/arrest.mjs fail. Restores files after each.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 server keeps default culprit', 'src/server.js', 'culprit: play.culprit,', 'culprit: c.culprit,'],
 ['M2 server drops solutions', 'src/server.js', 'solutions: play.solution ?? null,', ''],
 ['M3 Solution keeps accusation language', 'public/index.html', "(sol || solution)", "(solution)"],
 ['M4 no is-static on re-render', 'public/index.html', "if (lastAccuseResult.ccShown) arrest.classList.add('is-static');", ''],
 ['M5 no ccShown mark', 'public/index.html', "lastAccuseResult.ccShown = true;", ''],
 ['M6 no id guard', 'public/index.html', "/^[a-z0-9-]+$/.test(lastAccuseResult.culprit || '') ? lastAccuseResult.culprit : null", "lastAccuseResult.culprit"],
 ['M7 sprite after the stamp', 'public/index.html', "arrest.insertBefore(img, stamp);", "arrest.appendChild(img);"],
 ['M8 alt text duplicates caption', 'public/index.html', "img.alt = '';", "img.alt = culpritName;"],
 ['M9 stamp no longer aria-hidden', 'public/index.html', "    stamp.setAttribute('aria-hidden', 'true');\n    stamp.textContent = lang === 'pt' ? 'CASO ENCERRADO' : 'CASE CLOSED';\n    const cap", "    stamp.textContent = lang === 'pt' ? 'CASO ENCERRADO' : 'CASE CLOSED';\n    const cap"],
 ['M10 PT caption in EN', 'public/index.html', "lang === 'pt' ? 'Caso encerrado: ' + culpritName + ' sai com as mãos algemadas.' :", "lang === 'xx' ? '' :"],
 ['M11 no 2x srcset', 'public/index.html', "img.srcset = url.replace(/\\.png$/, '@2x.png') + ' 2x';", ''],
 ['M12 reduced motion animates', 'public/css/game.css', '@media (prefers-reduced-motion: reduce) { .arrest-sprite, .arrest .case-closed-stamp { animation: none; } }', ''],
 ['M13 stamp not on top', 'public/css/game.css', '.arrest.has-art .case-closed-stamp { position: absolute;', '.arrest.has-art .case-closed-stamp { position: relative;'],
 ['M14 manifest receipt lost', 'public/assets/manifest.json', '"id": "characters/night-train-ines-arrest",\n      "kind": "sprite",\n      "receipt_id": "01M7KCXMKP5GP6J6AD6WH12KC2"', '"id": "characters/night-train-ines-arrest",\n      "kind": "sprite",\n      "receipt_id": null'],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let fails = 0; try { execSync('node test/arrest.mjs', { stdio: 'pipe' }); } catch (e) { fails = (String(e.stdout).match(/^FAIL/gm) || []).length; }
  fs.writeFileSync(f, orig); out.push(`${name}: ${fails ? `caught (${fails} failing)` : 'NOT CAUGHT'}`);
}
fs.writeFileSync('qa/m2gf10-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
