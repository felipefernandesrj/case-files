// QA harness (not product): game feel sprint 11 (error messages around suspect select and asking) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf10.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf10-probes/probe-<prefix>.json
// Mock case: culprit carlos, wrong suspect lorenzo. confirm() dialogs are auto-accepted.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run39'; const PFX = process.argv[3] || 'before';
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
await send('Page.enable'); await send('Runtime.enable');
const fresh = async (w, h, L, rm, q = '') => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: base + q }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
  await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(400);
};
const accuseBtn = (name) => `(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));b.click();return !!b})()`;
// what a player can actually see: every visible message node in the viewport, plus the hidden ones that got text
const seen = `(()=>{const ids=['ask-msg','best-status','err','questions-used'];const out={};
 for(const id of ids){const n=document.getElementById(id);if(!n){out[id]=null;continue}const b=n.getBoundingClientRect();
  const vis=!n.hidden&&n.offsetParent!==null&&b.width>0&&b.height>0;out[id]={text:n.textContent.trim().slice(0,200),visible:vis,inViewport:vis&&b.bottom>0&&b.top<innerHeight,panel:(n.closest('[data-panel]')||{}).dataset?.panel||null,role:n.getAttribute('role')}}
 out.activePanel=(document.querySelector('.panel.is-on')||{}).dataset?.panel||null;out.focus=document.activeElement&&(document.activeElement.id||document.activeElement.tagName);return out})()`;
const goTalk = `(()=>{document.querySelector('#steps [data-step="talk"]').click();return true})()`;
const pick = (name) => `(()=>{const b=[...document.querySelectorAll('#suspect-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const ask = (q) => `(()=>{const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();return true})()`;
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = {};
    await fresh(w, h, L); await ev(goTalk); await wait(400);
    await ev(ask('Where were you at nine?')); await wait(700); r.noSuspect = await ev(seen);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-nosuspect.png`));
    await ev(`document.querySelector('#steps [data-step="suspects"]').click()`); await wait(300);
    r.pickedOk = await ev(pick('Carlos')); await wait(500);
    await ev(ask('   ')); await wait(500); r.emptyQuestion = await ev(seen);
    await ev(`(()=>{window.__f0=window.fetch;window.fetch=(u,o)=>{if(String(u).includes('/api/ask')&&o&&o.body){const b=JSON.parse(o.body);b.sessionId='expired-by-probe';o={...o,body:JSON.stringify(b)}}return window.__f0(u,o)};return true})()`);
    await ev(ask('Where were you at nine?')); await wait(1200); r.expiredSession = await ev(seen); await ev(`window.fetch=window.__f0`);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-expired.png`));
    await ev(`window.__f=window.fetch;window.fetch=()=>Promise.reject(new TypeError('Failed to fetch'))`);
    await ev(ask('Where were you at nine?')); await wait(900); r.offline = await ev(seen);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-offline.png`));
    await ev(`window.fetch=window.__f`);
    report[`${w}-${L}`] = r;
  }
}
const dir = process.env.PROBE_DIR || 'qa/m2gf11-probes'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
