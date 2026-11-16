Write one new file and patch existing files. Output exactly one FILE block and then exactly four REPLACE blocks, then stop. Formats (only marker lines start with <<<; the old text of a REPLACE block has NO < characters added in front of it and no space added before any >):

<<<FILE path>>>
...full content...
<<<END>>>

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Do not write the words OLD or NEW inside a block. No commentary, no markdown fences. The full content of every new file and every new text are given between the lines BEGIN and FINISH: copy them exactly, character for character, and do not output the words BEGIN or FINISH.

Context: a detective game page shows each answer in the Conversation log. Now the answer line gets the suspect's portrait as a speaker avatar whose mouth moves (two frame sprite sheet, CSS steps animation) while the line is revealed a few characters at a time; the full line is in a screen reader span; reduced motion shows the line at once; a click on the log finishes the line. A local CPU script builds the two frame sheets from the existing portraits.

File scripts/assets/talk_frames.py:
BEGIN
"""Talking portrait sheets for the Conversation log (M2 game feel sprint 8).

Local CPU only: no model call. For every suspect it reads the generated
neutral portrait (128 px) and writes a two frame sheet next to it,
<case>-<id>-talk.png (256x128): frame 1 is the neutral portrait as is,
frame 2 is the same portrait with the mouth open. The page swaps the two
frames with a CSS steps() animation while an answer is being revealed.

Usage: python3 scripts/assets/talk_frames.py [assets dir]
"""
import os
import sys
from PIL import Image

# Mouth centre (x, y) and half width in the 128 px neutral frame, measured by hand.
MOUTHS = {
    'violin-lorenzo': (32, 80, 6),
    'violin-maya': (81, 75, 5),
    'violin-carlos': (44, 74, 7),
    'night-train-helena': (76, 71, 5),
    'night-train-ines': (51, 68, 4),
    'night-train-tomas': (50, 77, 7),
    'night-train-victor': (53, 71, 7),
}
INSIDE = (38, 12, 14, 255)  # dark mouth interior
LIP = (120, 44, 40, 255)    # lower lip edge


def lum(p):
    return 0.299 * p[0] + 0.587 * p[1] + 0.114 * p[2]


def lip_line(im, cx, cy, hw):
    """Darkest row near the given centre: the closed lip line."""
    best, best_y = None, cy
    for y in range(cy - 3, cy + 4):
        row = [lum(im.getpixel((x, y))) for x in range(cx - hw, cx + hw + 1)]
        v = sum(row) / len(row)
        if best is None or v < best:
            best, best_y = v, y
    return best_y


def open_mouth(neutral, cx, cy, hw):
    im = neutral.copy()
    y0 = lip_line(neutral, cx, cy, hw)
    for dx in range(-hw, hw + 1):
        edge = abs(dx) / max(hw, 1)
        depth = 3 if edge < 0.5 else (2 if edge < 0.85 else 1)
        x = cx + dx
        for k in range(depth):
            im.putpixel((x, y0 + k), INSIDE)
        if edge < 0.85:
            im.putpixel((x, y0 + depth), LIP)
    return im


def build(assets):
    out = []
    for name, (cx, cy, hw) in MOUTHS.items():
        src = os.path.join(assets, 'characters', f'{name}-neutral.png')
        if not os.path.exists(src):
            continue
        neutral = Image.open(src).convert('RGBA')
        sheet = Image.new('RGBA', (neutral.width * 2, neutral.height), (0, 0, 0, 0))
        sheet.paste(neutral, (0, 0))
        sheet.paste(open_mouth(neutral, cx, cy, hw), (neutral.width, 0))
        dst = os.path.join(assets, 'characters', f'{name}-talk.png')
        sheet.save(dst, optimize=True)
        out.append(dst)
    return out


if __name__ == '__main__':
    root = sys.argv[1] if len(sys.argv) > 1 else os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'assets'))
    for f in build(root):
        print(f)
FINISH

Block 1 (public/index.html). Old text (exact, 14 lines):
function renderConversation() {
  const log = document.getElementById('log');
  log.innerHTML = '';
  if (!selectedSuspect) return;
  const hist = histories[selectedSuspect] || [];
  hist.forEach(pair=>{
    const pQ = document.createElement('p');
    pQ.textContent = (lang==='pt'?'Pergunta: ':'Q: ') + pair.q;
    const pA = document.createElement('p');
    pA.textContent = (lang==='pt'?'Resposta: ':'A: ') + pair.a;
    log.appendChild(pQ);
    log.appendChild(pA);
  });
}
New text:
BEGIN
const TALK_STEP_MS = 30;
const TALK_CHARS = 2;
let talkTimer = null;
let talkDone = null;
function prefersReducedMotion() {
  return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function speakerFace(id) {
  const face = document.createElement('span');
  face.className = 'portrait speaker';
  face.setAttribute('aria-hidden', 'true');
  const s = caseData && (caseData.suspects || []).find(x => x.id === id);
  face.textContent = initials(s ? s.name : id);
  const c = artCase();
  whenArt(c && `/assets/characters/${c}-${id}-talk.png`, (url) => {
    face.style.setProperty('--talk-sheet', `url(${url})`);
    face.classList.add('has-art', 'has-talk');
  });
  return face;
}
function stopTalk() {
  if (talkTimer) clearInterval(talkTimer);
  talkTimer = null;
  if (talkDone) {
    const done = talkDone;
    talkDone = null;
    done();
  }
}
function startTalk(face, shown) {
  stopTalk();
  const full = shown.textContent;
  if (!full || prefersReducedMotion()) return;
  let n = 0;
  shown.textContent = '';
  face.classList.add('is-talking');
  talkDone = () => {
    shown.textContent = full;
    face.classList.remove('is-talking');
  };
  talkTimer = setInterval(() => {
    n += TALK_CHARS;
    shown.textContent = full.slice(0, n);
    if (n >= full.length) stopTalk();
  }, TALK_STEP_MS);
}
function renderConversation(animateLast) {
  stopTalk();
  const log = document.getElementById('log');
  log.innerHTML = '';
  if (!selectedSuspect) return;
  const hist = histories[selectedSuspect] || [];
  hist.forEach((pair, i) => {
    const pQ = document.createElement('p');
    pQ.textContent = (lang==='pt'?'Pergunta: ':'Q: ') + pair.q;
    const pA = document.createElement('p');
    pA.className = 'answer';
    const line = (lang==='pt'?'Resposta: ':'A: ') + pair.a;
    const face = speakerFace(selectedSuspect);
    const said = document.createElement('span');
    said.className = 'sr-only';
    said.textContent = line;
    const shown = document.createElement('span');
    shown.className = 'answer-text';
    shown.setAttribute('aria-hidden', 'true');
    shown.textContent = line;
    pA.appendChild(face);
    pA.appendChild(said);
    pA.appendChild(shown);
    log.appendChild(pQ);
    log.appendChild(pA);
    if (animateLast && i === hist.length - 1) startTalk(face, shown);
  });
}
FINISH

Block 2 (public/index.html). Old text (exact, 2 lines):
    renderConversation();
  }catch(err){
New text:
BEGIN
    renderConversation(true);
  }catch(err){
FINISH

Block 3 (public/index.html). Old text (exact, 1 line):
document.getElementById('ask-form').addEventListener('submit',askQuestion);
New text:
BEGIN
document.getElementById('ask-form').addEventListener('submit',askQuestion);
document.getElementById('log').addEventListener('click', () => { if (talkTimer) stopTalk(); });
FINISH

Block 4 (public/css/game.css). Old text (exact, 1 line):
.ask-confirm input[type="checkbox"]:focus-visible { outline: 3px solid var(--cf-focus); outline-offset: 2px; }
New text:
BEGIN
.ask-confirm input[type="checkbox"]:focus-visible { outline: 3px solid var(--cf-focus); outline-offset: 2px; }
#log p.answer { display: flex; align-items: flex-start; gap: 10px; }
#log .speaker { width: 48px; height: 48px; margin: 0; font-size: 0.8rem; }
[data-layout="desktop"] #log .speaker { width: 56px; height: 56px; }
#log .speaker.has-talk { background-image: var(--talk-sheet); background-size: 200% 100%; background-position: 0 0; }
#log .speaker.is-talking { animation: cf-talk 240ms steps(1, end) infinite; }
@keyframes cf-talk { 0% { background-position: 0 0; } 50% { background-position: 100% 0; } 100% { background-position: 100% 0; } }
.sr-only { position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (prefers-reduced-motion: reduce) { #log .speaker.is-talking { animation: none; } }
FINISH
