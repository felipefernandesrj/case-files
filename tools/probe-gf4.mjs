// QA harness (not product): game feel sprint 4 (board heading and scene caption contrast) screenshots in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf4.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf4-probes/probe-<prefix>.json
// Contrast: text colour from getComputedStyle vs the median background pixel inside the element box (screenshot taken with the text made transparent).
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn, execFileSync } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run32'; const PFX = process.argv[3] || 'before';
const server = createServer({ caseFile: 'content/case.json', scoreFile: path.join(os.tmpdir(), `s-${Date.now()}.json`), mock: true });
await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}/`;
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'));
const ch = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${ud}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise(res => ch.stderr.on('data', d => { const m = String(d).match(/(ws:\/\/\S+)/); if (m) res(m[1]); }));
const port = new URL(wsUrl).port; await new Promise(r => setTimeout(r, 800));
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }); });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
const info = (sel) => `(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e||e.hidden)return null;const b=e.getBoundingClientRect();const cs=getComputedStyle(e);return {text:e.textContent.trim(),color:cs.color,bg:cs.backgroundColor,shadow:cs.textShadow,box:[b.x,b.y,b.width,b.height].map(Math.round)}})()`;
const PY = `import sys,json
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGB');x,y,w,h=json.loads(sys.argv[2]);c=json.loads(sys.argv[3])
px=sorted(im.crop((x,y,x+w,y+h)).getdata(),key=lambda p:sum(p));m=px[len(px)//2]
def L(p):
  r=[(v/255)/12.92 if v/255<=0.03928 else ((v/255+0.055)/1.055)**2.4 for v in p];return 0.2126*r[0]+0.7152*r[1]+0.0722*r[2]
a,b=L(c),L(m);print(json.dumps({'bgMedian':m,'ratio':round((max(a,b)+0.05)/(min(a,b)+0.05),2)}))`;
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await send('Page.navigate', { url: base }); await wait(2500);
    await ev(`document.querySelector('#steps [data-step="locations"]').click()`); await wait(400);
    await ev(`document.querySelectorAll('#room-buttons .room')[1].click()`); await wait(500);
    if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
    await ev(`document.querySelector('#steps [data-step="board"]').click()`); await wait(1200);
    await ev(`window.scrollTo(0,0)`); await wait(200);
    await shot(path.join(OUT, `${PFX}-${w}-${L}.png`));
    const r = {};
    for (const [k, sel] of [['heading', '#board-title'], ['caption', '#scene-label']]) {
      const i = await ev(info(sel)); if (!i) { r[k] = 'missing'; continue; }
      const tmp = path.join(os.tmpdir(), `gf4-${k}.png`);
      await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.dataset.c=e.style.color;e.style.setProperty('color','transparent','important');e.style.setProperty('text-shadow','none','important');e.querySelectorAll('*').forEach(x=>x.style.setProperty('color','transparent','important'))})()`); await wait(150);
      await shot(tmp);
      await ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});e.style.removeProperty('color');e.style.removeProperty('text-shadow');e.querySelectorAll('*').forEach(x=>x.style.removeProperty('color'))})()`);
      const rgb = (i.color.match(/\d+(\.\d+)?/g) || []).slice(0, 3).map(Number);
      const [x, y, bw, bh] = i.box;
      const c = JSON.parse(execFileSync('python3', ['-c', PY, tmp, JSON.stringify([Math.max(0, x), Math.max(0, y), Math.max(1, bw), Math.max(1, bh)]), JSON.stringify(rgb)]).toString());
      r[k] = { ...i, ...c, passAA: c.ratio >= 4.5 };
    }
    if (r.heading.box && r.caption.box) { const [hx, hy, hw, hh] = r.heading.box, [cx, cy, cw, ch2] = r.caption.box; const ox = Math.max(0, Math.min(hx + hw, cx + cw) - Math.max(hx, cx)), oy = Math.max(0, Math.min(hy + hh, cy + ch2) - Math.max(hy, cy)); r.captionOverHeadingPx = ox && oy ? oy : 0; }
    report[`${w}-${L}`] = r;
  }
}
// Toast language follow-up: an EN toast on screen, then switch to PT (timers of 20s or more scaled by 1/10 in the QA browser only).
{
  const SCALE = `(()=>{const st=window.setTimeout;window.setTimeout=(f,d,...a)=>st(f,(d>=20000?d/10:d),...a);})()`;
  const toasts = `(()=>{const t=document.getElementById('toasts');return t?[...t.querySelectorAll('.toast')].map(x=>({hint:x.getAttribute('data-hint'),text:x.textContent})):'no #toasts'})()`;
  const sc = await send('Page.addScriptToEvaluateOnNewDocument', { source: SCALE });
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await send('Page.navigate', { url: base }); await wait(2500);
    await ev(`document.querySelector('#steps [data-step="board"]').click()`); await wait(2600);
    const en = await ev(toasts);
    await ev(`document.getElementById('lpt').click()`); await wait(1200);
    const pt = await ev(toasts);
    await shot(path.join(OUT, `${PFX}-${w}-toast-switch.png`));
    report[`${w}-toast-switch`] = { en, pt };
  }
  await send('Page.removeScriptToEvaluateOnNewDocument', { identifier: sc.result?.identifier });
}
console.log(JSON.stringify(report, null, 1)); fs.mkdirSync('qa/m2gf4-probes', { recursive: true }); fs.writeFileSync(`qa/m2gf4-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
