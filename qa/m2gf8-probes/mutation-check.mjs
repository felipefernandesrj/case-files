// QA harness: mutate the sprint 8 code and assets one change at a time and confirm test/talk.mjs catches each
import fs from 'node:fs'; import { execSync } from 'node:child_process';
const H = 'public/index.html', C = 'public/css/game.css', P = 'scripts/assets/talk_frames.py';
const M = [
 ['M1 no speaker avatar', H, '    pA.appendChild(face);\n', ''],
 ['M2 no screen reader copy', H, '    pA.appendChild(said);\n', ''],
 ['M3 shown copy not aria-hidden', H, "    shown.setAttribute('aria-hidden', 'true');\n", ''],
 ['M4 wrong sheet name', H, '-${id}-talk.png', '-${id}-speaking.png'],
 ['M5 has-talk never set', H, "face.classList.add('has-art', 'has-talk');", "face.classList.add('has-art');"],
 ['M6 never talks', H, "  face.classList.add('is-talking');\n", ''],
 ['M7 mouth never stops', H, "    face.classList.remove('is-talking');\n", ''],
 ['M8 no reveal (full at once)', H, "  shown.textContent = '';\n  face.classList.add", '  face.classList.add'],
 ['M9 reduced motion ignored', H, 'if (!full || prefersReducedMotion()) return;', 'if (!full) return;'],
 ['M10 every render animates', H, 'if (animateLast && i === hist.length - 1) startTalk', 'if (i === hist.length - 1) startTalk'],
 ['M11 askQuestion does not animate', H, '    renderConversation(true);\n  }catch(err){', '    renderConversation();\n  }catch(err){'],
 ['M12 re-render keeps old timer', H, 'function renderConversation(animateLast) {\n  stopTalk();\n', 'function renderConversation(animateLast) {\n'],
 ['M13 stopTalk leaves line cut', H, '    done();\n', ''],
 ['M14 no click to finish', H, "document.getElementById('log').addEventListener('click', () => { if (talkTimer) stopTalk(); });\n", ''],
 ['M15 pt prefix lost', H, "const line = (lang==='pt'?'Resposta: ':'A: ')", "const line = ('A: ')"],
 ['M16 css no reduced motion stop', C, '@media (prefers-reduced-motion: reduce) { #log .speaker.is-talking { animation: none; } }', ''],
 ['M17 css sheet not two frames', C, 'background-size: 200% 100%;', 'background-size: cover;'],
 ['M18 css smooth slide', C, 'steps(1, end)', 'linear'],
 ['M19 script misses a suspect', P, "    'night-train-ines': (51, 68, 4),\n", ''],
];
const ASSET = [
 ['M20 talk sheet without mouth (right = neutral)', 'public/assets/characters/violin-lorenzo-talk.png', () => execSync(`python3 -c "from PIL import Image; n=Image.open('public/assets/characters/violin-lorenzo-neutral.png').convert('RGBA'); s=Image.new('RGBA',(256,128)); s.paste(n,(0,0)); s.paste(n,(128,0)); s.save('public/assets/characters/violin-lorenzo-talk.png')"`)],
 ['M21 talk sheet missing', 'public/assets/characters/night-train-tomas-talk.png', () => fs.unlinkSync('public/assets/characters/night-train-tomas-talk.png')],
 ['M22 mouth drawn in the wrong place (whole face shifted)', 'public/assets/characters/violin-maya-talk.png', () => execSync(`python3 -c "from PIL import Image; s=Image.open('public/assets/characters/violin-maya-talk.png').convert('RGBA'); r=s.crop((128,0,256,128)); s.paste(r.transform(r.size, Image.AFFINE, (1,0,0,0,1,-2)),(128,0)); s.save('public/assets/characters/violin-maya-talk.png')"`)],
];
const run = () => { try { return execSync('node test/talk.mjs', { encoding: 'utf8' }); } catch (e) { return e.stdout; } };
const out = [];
const report = (name, txt) => { const fails = txt.split('\n').filter(l => l.startsWith('FAIL')).map(l => l.slice(5, 80)); out.push(`${name}: ${fails.length ? 'caught, ' + fails.length + ' fail(s): ' + fails.join(' | ') : 'NOT CAUGHT'}`); };
for (const [name, file, from, to] of M) {
  const orig = fs.readFileSync(file, 'utf8'); if (!orig.includes(from)) { out.push(`${name}: ANCHOR MISSING`); continue; }
  fs.writeFileSync(file, orig.replace(from, to)); const txt = run(); fs.writeFileSync(file, orig); report(name, txt);
}
for (const [name, file, mutate] of ASSET) {
  const orig = fs.readFileSync(file); mutate(); const txt = run(); fs.writeFileSync(file, orig); report(name, txt);
}
const base = run(); out.push('baseline after restore: ' + base.trim().split('\n').pop());
fs.writeFileSync('qa/m2gf8-probes/mutation-check.txt', out.join('\n') + '\n'); console.log(out.join('\n'));
