// QA harness (not product): game feel sprint 10 (handcuffed culprit under the CASE CLOSED stamp) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf10.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf10-probes/probe-<prefix>.json
// Mock case: culprit carlos, wrong suspect lorenzo. confirm() dialogs are auto-accepted.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run38'; const PFX = process.argv[3] || 'before';
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
// tag existing nodes so a re-created node (replayed animation) is visible
const tag = `(()=>{document.querySelectorAll('#verdict *').forEach(n=>n.dataset.probeOld='1');return true})()`;
const state = `(()=>{const v=document.getElementById('verdict');if(!v||v.hidden)return {verdict:null};
 const st=v.querySelector('.case-closed-stamp');const ar=v.querySelector('.arrest');const img=ar&&ar.querySelector('img');
 const r=x=>{if(!x)return null;const b=x.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(Math.round)};
 const lines=[...v.querySelectorAll(':scope > p')].map(p=>p.textContent.trim());
 return {lines,stamp:st?{text:st.textContent,rect:r(st),anim:getComputedStyle(st).animationName,recreated:!st.dataset.probeOld}:null,
  arrest:ar?{cls:ar.className,rect:r(ar),anim:getComputedStyle(ar).animationName,recreated:!ar.dataset.probeOld,img:img?{src:img.getAttribute('src'),alt:img.alt,loaded:img.complete&&img.naturalWidth>0,nat:[img.naturalWidth,img.naturalHeight]}:null,caption:(ar.querySelector('.arrest-caption')||{}).textContent||null,
   stampOverArrest:st?(()=>{const a=ar.getBoundingClientRect(),s=st.getBoundingClientRect();return s.top<a.bottom&&s.bottom>a.top&&s.left<a.right&&s.right>a.left})():null}:null,
  live:(document.getElementById('verdict-live')||document.getElementById('continue-live')||{}).textContent||null,ariaLive:[...document.querySelectorAll('[aria-live]')].map(n=>n.id+':'+n.textContent.trim().slice(0,90)).filter(s=>!s.endsWith(':')),
  apiCulprit:window.__lastAccuse||null}})()`;
const hook = `(()=>{if(window.__hooked)return;window.__hooked=1;const f=window.fetch;window.fetch=async(...a)=>{const r=await f(...a);if(String(a[0]).includes('/api/accuse')){r.clone().json().then(j=>{window.__lastAccuse={culprit:j.culprit,culpritName:j.culpritName}})}return r}})()`;
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await fresh(w, h, L); await ev(hook);
    await ev(accuseBtn('Carlos')); await wait(2200);
    const correct = await ev(state);
    await ev(`(()=>{const p=document.querySelector('#verdict .arrest')||document.querySelector('#verdict .case-closed-stamp')||document.getElementById('verdict');p.scrollIntoView({block:'center'})})()`); await wait(900);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-closed.png`));
    await ev(tag);
    await ev(`document.getElementById('${L === 'en' ? 'lpt' : 'len'}').click()`); await wait(1800);
    const switched = await ev(state);
    report[`${w}-${L}`] = { correct, afterLangSwitch: switched };
  }
}
{
  const r = {};
  await fresh(1280, 800, 'en', true); await ev(hook); await ev(accuseBtn('Carlos')); await wait(1500); r.reducedMotion = await ev(state);
  await fresh(1280, 800, 'en'); await ev(hook); await ev(accuseBtn('Lorenzo')); await wait(1500); r.wrongDuringCountdown = await ev(state);
  await fresh(1280, 800, 'en', false, '?case=night-train'); await ev(hook); await ev(accuseBtn('Inês')); await wait(2200); r.nightTrainInes = await ev(state);
  await ev(`(()=>{const p=document.querySelector('#verdict .arrest')||document.getElementById('verdict');p.scrollIntoView({block:'center'})})()`); await wait(900);
  await shot(path.join(OUT, `${PFX}-1280-en-nighttrain.png`));
  await fresh(390, 844, 'pt', false, '?case=night-train'); await ev(hook); await ev(accuseBtn('Inês')); await wait(2200); r.nightTrainInesPt390 = await ev(state);
  await ev(`(()=>{const p=document.querySelector('#verdict .arrest')||document.getElementById('verdict');p.scrollIntoView({block:'center'})})()`); await wait(900);
  await shot(path.join(OUT, `${PFX}-390-pt-nighttrain.png`));
  report.extra = r;
}
const dir = process.env.PROBE_DIR || 'qa/m2gf10-probes'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
