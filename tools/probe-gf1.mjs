// QA harness (not product): screenshots of the game-feel sprint in mock mode via headless Chrome CDP.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run29';
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
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: base }); await wait(2500);
  await shot(`gf1-${w}-start.png`);
  for (const s of ['locations', 'suspects']) { await ev(`document.querySelector('#steps [data-step="${s}"]').click()`); await wait(400); }
  report[`${w}-progress`] = await ev(`[...document.querySelectorAll('#progress-list li')].map(l=>l.className+':'+l.textContent).join(' | ') + ' count=' + (document.getElementById('progress-count')||{}).textContent + ' railVisible=' + (getComputedStyle(document.getElementById('rail-right')).display)`);
  report[`${w}-roleColor`] = await ev(`(()=>{const r=document.querySelector('#suspect-buttons .role');return r?getComputedStyle(r).color:null})()`);
  await shot(`gf1-${w}-progress.png`);
  await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(300);
  await ev(`[...document.querySelectorAll('#accuse-buttons button')].find(b=>/Carlos/.test(b.textContent)).click()`); await wait(1500);
  report[`${w}-stamp`] = await ev(`(()=>{const s=document.querySelector('.case-closed-stamp');return s?s.textContent+' anim='+getComputedStyle(s).animationName:null})()`);
  await ev(`document.getElementById('verdict').scrollIntoView({block:'center'})`); await wait(900);
  await shot(`gf1-${w}-verdict.png`);
}
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync('qa/m2gf1-probes/probe-gf1.json', JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
