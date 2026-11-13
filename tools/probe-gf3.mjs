// QA harness (not product): game feel sprint 3 (hint toasts, pin language) screenshots in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf3.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf2-probes/probe-<prefix>.json
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run31'; const PFX = process.argv[3] || 'before';
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
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64')); };
// Delays of 20s or more are scaled down 10x so timed hints fire quickly (QA only; product timers untouched).
const SCALE = `(()=>{const st=window.setTimeout;window.setTimeout=(f,d,...a)=>st(f,(d>=20000?d/10:d),...a);})()`;
const toasts = `(()=>{const t=document.getElementById('toasts');if(!t)return 'no #toasts';const v=[...t.querySelectorAll('.toast')];return 'toasts='+v.length+' role='+t.getAttribute('role')+' live='+t.getAttribute('aria-live')+' texts='+JSON.stringify(v.map(x=>x.textContent))+(v[0]?' box='+JSON.stringify(v[0].getBoundingClientRect()):'')})()`;
const pinsTxt = `(()=>{const r=[...document.querySelectorAll('#pin-rail button')].map(b=>b.textContent);const g=[...document.querySelectorAll('#board-grid .ev-tile')].map(b=>b.textContent);const rooms=[...document.querySelectorAll('#room-buttons .room')].map(b=>b.textContent);return 'rail='+JSON.stringify(r)+' board='+JSON.stringify(g)+' rooms='+JSON.stringify(rooms)})()`;
await send('Page.enable'); await send('Runtime.enable');
const report = {};
report.apiHints = await (await fetch(base + 'api/case?lang=pt')).text().then(t => { try { const j = JSON.parse(t); return JSON.stringify(j.hints ?? null); } catch { return 'non-json ' + t.slice(0, 80); } });
const realWait = process.argv[4] === 'real';
if (!realWait) await send('Page.addScriptToEvaluateOnNewDocument', { source: SCALE });
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
    await send('Page.navigate', { url: base }); await wait(2500);
    await ev(`document.querySelector('#steps [data-step="locations"]').click()`); await wait(400);
    await ev(`document.querySelectorAll('#room-buttons .room')[1].click()`); await wait(500);
    if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
    await ev(`document.querySelector('#steps [data-step="board"]').click()`); await wait(500);
    report[`${w}-${L}-pins`] = await ev(pinsTxt);
    if (realWait) { await wait(47000); } else { await wait(1800); }
    report[`${w}-${L}-toast1`] = await ev(toasts);
    await shot(`${PFX}-${w}-${L}.png`);
    if (realWait) break;
    await wait(1200);
    report[`${w}-${L}-toast-later`] = await ev(toasts);
  }
  if (realWait) break;
}
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync(`qa/m2gf3-probes/probe-${PFX}${realWait ? '-real' : ''}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
