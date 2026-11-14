// QA harness (not product): each mutation of the continue countdown must fail at least one check of test/continue.mjs.
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const H = 'public/index.html', C = 'public/css/game.css';
const M = [
 ['M1 countdown after any verdict', H, 'if (!data.correct) startContinue();', 'startContinue();'],
 ['M2 countdown from 5', H, 'const CONT_FROM = 9;', 'const CONT_FROM = 5;'],
 ['M3 game over at 1 instead of after 0', H, 'if (contLeft < 0) {', 'if (contLeft < 1) {'],
 ['M4 no pulse class', H, "    num.classList.add('tick');\n", ''],
 ['M5 PT title in English', H, "title: 'CONTINUAR?'", "title: 'CONTINUE?'"],
 ['M6 game over keeps culprit hidden', H, '  if (lastAccuseResult) renderVerdict(false);\n  const L = contLabels();', '  const L = contLabels();'],
 ['M7 Try again asks to confirm', H, 'restartGame(true);', 'restartGame();'],
 ['M8 Try again without run guard', H, "  if (contState !== 'run') return;\n  stopContinue();\n  restartGame", '  stopContinue();\n  restartGame'],
 ['M9 Close loses focus', H, "  stopContinue();\n  document.getElementById('restart-btn').focus();", '  stopContinue();'],
 ['M10 Start over keeps the countdown', H, '  stopContinue();\n  const sessRes', '  const sessRes'],
 ['M11 Start over session without case', H, 'JSON.stringify({ case: openFile })', 'JSON.stringify({})'],
 ['M12 culprit shown while counting', H, "if (correct || contState !== 'run') {", 'if (true) {'],
 ['M13 reduced motion keeps the pulse', C, '{ .continue-num, .continue-num.tick { animation: none; } }', '{ .continue-num { animation: none; } }'],
 ['M14 Escape always closes', H, "if (contState === 'run') endContinue();\n  else closeContinue();", 'closeContinue();'],
 ['M15 language switch skips the box', H, '  relabelToasts();\n  renderContinue();\n', '  relabelToasts();\n'],
 ['M16 stop keeps the announcement', H, "  renderContinue();\n  contSay('');", '  renderContinue();'],
 ['M17 countdown does not take focus', H, "  }, 1000);\n  document.getElementById('continue-yes').focus();", '  }, 1000);'],
 ['M18 new file keeps the countdown', H, 'async function openPackFile(id) {\n  stopContinue();', 'async function openPackFile(id) {'],
];
const out = [];
for (const [name, f, a, b] of M) {
  const orig = fs.readFileSync(f, 'utf8'); if (!orig.includes(a)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(f, orig.replace(a, b));
  let r; try { r = execSync('node test/continue.mjs', { encoding: 'utf8' }); } catch (e) { r = e.stdout; }
  fs.writeFileSync(f, orig);
  out.push(`${name}: ${r.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5).split(':')[0]).join('; ') || 'NOT CAUGHT'}`);
}
console.log(out.join('\n'));
