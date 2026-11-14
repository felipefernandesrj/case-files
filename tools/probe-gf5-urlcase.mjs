// QA harness (not product): game feel sprint 5, a ?case= link then accuse (does the session match the opened file?) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf5.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf5-probes/probe-<prefix>.json
// Mock case: culprit carlos, wrong suspect lorenzo. confirm() dialogs are auto-accepted.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run33'; const PFX = process.argv[3] || 'before';
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
const state = `(()=>{const c=document.getElementById('continue');const v=document.getElementById('verdict');const b=c&&!c.hidden?c.getBoundingClientRect():null;
 return {verdict:v&&!v.hidden?v.textContent.trim().slice(0,60):null,continueBox:c?(c.hidden?'hidden':c.textContent.replace(/\\s+/g,' ').trim()):'no #continue',
 box:b?[b.x,b.y,b.width,b.height].map(Math.round):null,inView:b?(b.top>=0&&b.bottom<=innerHeight):null,num:(document.getElementById('continue-num')||{}).textContent||null,
 live:(document.getElementById('continue-live')||{}).textContent||null,focus:document.activeElement&&(document.activeElement.id||document.activeElement.tagName),
 status:document.getElementById('best-status').textContent,accuseDisabled:[...document.querySelectorAll('#accuse-buttons button')].every(b=>b.disabled)}})()`;
const accuseBtn = (name) => `(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));b.click();return !!b})()`;
const fresh = async (w, h, L, rm) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: base }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
  await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(400);
};
await send('Page.enable'); await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
const r = {};
for (const u of ['?case=night-train']) {
  await send('Page.navigate', { url: base + u }); await wait(2500);
  r[u] = await ev(`(async()=>{const sus=[...document.querySelectorAll('#accuse-buttons button')].map(b=>b.textContent);document.querySelector('#steps [data-step="accuse"]').click();document.querySelectorAll('#accuse-buttons button')[0].click();await new Promise(r=>setTimeout(r,1500));return {title:document.title,suspects:sus,err:document.getElementById('err').hidden?null:document.getElementById('err').textContent,verdict:document.getElementById('verdict').hidden?null:document.getElementById('verdict').textContent.slice(0,60)}})()`);
  await shot(path.join(OUT, `${PFX}-1280-en-urlcase.png`));
}
console.log(JSON.stringify(r, null, 1)); fs.writeFileSync(`qa/m2gf5-probes/probe-urlcase-${PFX}.json`, JSON.stringify(r, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
