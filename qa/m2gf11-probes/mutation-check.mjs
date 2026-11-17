import fs from 'node:fs'; import { execSync } from 'node:child_process';
const M = [
 ['M1 ask msg goes to #err', 'public/index.html', "const ask = where === 'ask' ? document.getElementById('ask-msg') : null;", "const ask = null;"],
 ['M2 raw server message', 'src/server.js', "code: 'unknown_session', message: friendly('unknown_session', lang)", "code: 'unknown_session', message: 'unknown session'"],
 ['M3 no netError mapping', 'public/index.html', "showError(err instanceof Error || !err || !err.message ? LABELS[lang].netError : err.message, 'ask');", "showError(err.message||'Error', 'ask');"],
 ['M4 ask msg not cleared before fetch', 'public/index.html', "  if (askMsg) { askMsg.hidden = true; askMsg.textContent = ''; }\n", ""],
 ['M5 pickSuspect back to best-status', 'public/index.html', "if (!selectedSuspect) { showError(LABELS[lang].pickSuspect, 'ask'); return; }", "if (!selectedSuspect) { document.getElementById('best-status').textContent = LABELS[lang].pickSuspect; return; }"],
 ['M6 no PT for already_accused', 'src/messages.js', "pt: 'Você já apontou um culpado nesta partida. Toque em Nova partida para jogar de novo.',", "pt: 'You already named a culprit in this game. Press Start over to play again.',"],
 ['M7 setLang keeps stale hint', 'public/index.html', "  lang = newLang;\n  const askMsg = document.getElementById('ask-msg');\n  if (askMsg) askMsg.hidden = true;\n", "  lang = newLang;\n"],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let r; try { r = execSync('node test/errors.mjs', { encoding: 'utf8' }); } catch (e) { r = e.stdout; }
  fs.writeFileSync(f, orig);
  const fails = (r.match(/^FAIL/gm) || []).length; out.push(`${name}: ${fails ? 'caught (' + fails + ' FAIL)' : 'NOT caught'}`);
}
console.log(out.join('\n'));
