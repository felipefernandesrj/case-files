// QA harness: mutate the sprint 6 code one change at a time and confirm test/suspicion.mjs catches each
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 server never records found', 'src/server.js', 'found.add(hit.id);', ''],
 ['M2 server ignores suspect', 'src/server.js', 'cl.from === suspectId && ', ''],
 ['M3 server case-sensitive', 'src/server.js', 'const lowerQ = question.toLowerCase();', 'const lowerQ = question;'],
 ['M4 server drops clears', 'src/server.js', 'clears: hit.clears ?? null', 'clears: null'],
 ['M5 client SUS cap removed', 'public/index.html', 'Math.min(st.hits, SUS_MAX)', 'st.hits'],
 ['M6 cleared keeps pips', 'public/index.html', 'const n = st.cleared ? 0 : ', 'const n = '],
 ['M7 no hot class', 'public/index.html', "(st.hits >= 2 ? 'is-hot' : '')", "''"],
 ['M8 no live text', 'public/index.html', "if (live && said.length) live.textContent = said.join('. ');", ''],
 ['M9 flash not consumed', 'public/index.html', '  Object.values(suspicion).forEach(st => { st.flash = false; });\n}', '}'],
 ['M10 ask does not apply clue', 'public/index.html', '    applyClue(data.clue);\n', ''],
 ['M11 start over keeps bars', 'public/index.html', '  stopContinue();\n  suspicion = {};\n', '  stopContinue();\n'],
 ['M12 pt label wrong', 'public/index.html', "lead1: '1 pista'", "lead1: '1 pistas'"],
];
const out = [];
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8'); if (!orig.includes(from)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(file, orig.replace(from, to));
  let txt = ''; try { txt = execSync('node test/suspicion.mjs', { encoding: 'utf8' }); } catch (e) { txt = e.stdout; }
  fs.writeFileSync(file, orig);
  const fails = txt.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5, 60));
  out.push(`${name}: ${fails.length ? 'caught, ' + fails.length + ' fail(s): ' + fails.join(' | ') : 'NOT CAUGHT'}`);
}
fs.writeFileSync('qa/m2gf6-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
