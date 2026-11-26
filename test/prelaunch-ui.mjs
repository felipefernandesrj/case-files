// Pre-launch QA (vision bots, verified by the PO): the verdict stage grows instead of hiding its top above the scroll area at 768 px and wider,
// CONTINUE?/GAME OVER has a backdrop, and the end line no longer says "Game over" after a win. Written by the PO (small static checks).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const css = fs.readFileSync(path.join(root, 'public/css/game.css'), 'utf8');
const { LABELS } = await import(path.join(root, 'public/best.js'));
const out = []; const check = (name, fn) => { try { fn(); out.push(`PASS ${name}`); } catch (e) { out.push(`FAIL ${name}: ${e.message}`); } };
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
const wide = css.slice(css.indexOf('@media (min-width: 768px)'));
const rule = wide.slice(wide.indexOf('#briefing.is-on, #accuse-stage.is-on {'), wide.indexOf('}', wide.indexOf('#briefing.is-on, #accuse-stage.is-on {')));
check('verdict stage grows with its content at 768 px and wider', () => { must(rule, 'rule missing'); must(/flex:\s*1 0 auto/.test(rule), 'flex: 1 0 auto missing'); must(/justify-content:\s*safe center/.test(rule), 'safe center missing'); must(!/justify-content:\s*center/.test(rule), 'plain center still there'); });
check('CONTINUE? and GAME OVER dim the page behind them', () => { const c = css.match(/\.continue \{[^}]*\}/)[0]; must(/0 0 0 100vmax rgba\(5,4,3,0\.7\d?\)/.test(c), 'backdrop shadow missing'); });
check('end line is neutral after a win or a loss, EN and PT', () => { must(!/game over/i.test(LABELS.en.gameOver) && /Start over/.test(LABELS.en.gameOver) && /Files/.test(LABELS.en.gameOver), 'en'); must(!/fim de jogo/i.test(LABELS.pt.gameOver) && /Nova partida/.test(LABELS.pt.gameOver) && /Arquivos/.test(LABELS.pt.gameOver), 'pt'); });
console.log(out.join('\n')); if (out.some((l) => l.startsWith('FAIL'))) process.exit(1);
