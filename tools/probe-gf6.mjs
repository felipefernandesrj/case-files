// QA harness (not product): game feel sprint 6 (suspicion bars) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf6.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf6-probes/probe-<prefix>.json
// Violin (mock): c1 Lorenzo "lock" implicates Carlos; c4 Lorenzo "nervous" clears Maya; c2 Maya "cart" implicates Carlos; c3 Maya "maestro" clears Lorenzo.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run34'; const PFX = process.argv[3] || 'before';
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
// wrap fetch to record /api/ask responses
const hook = `(()=>{if(window.__asks)return;window.__asks=[];const f=window.fetch;window.fetch=async(...a)=>{const r=await f(...a);if(String(a[0]).includes('/ask')){try{window.__asks.push(await r.clone().json())}catch{}}return r}})()`;
const state = `(()=>{const rows=[...document.querySelectorAll('.sus-list li')].filter(li=>li.offsetParent!==null);
 const sec=[...document.querySelectorAll('.suspicion')].filter(s=>s.offsetParent!==null).map(s=>{const b=s.getBoundingClientRect();return [b.x,b.y,b.width,b.height].map(Math.round)});
 return {sections:document.querySelectorAll('.suspicion').length,visibleSections:sec,rows:rows.map(li=>({text:li.textContent.replace(/\\s+/g,' ').trim(),now:li.querySelector('[role=meter]')?.getAttribute('aria-valuenow')||null,label:li.querySelector('[role=meter]')?.getAttribute('aria-label')||null,cls:li.className})),
 live:(document.getElementById('suspicion-live')||{}).textContent||null,lastAsk:(window.__asks||[]).slice(-1)[0]||null,questions:document.getElementById('questions-used').textContent}})()`;
const ask = async (sid, q) => { await ev(`(()=>{document.querySelector('#suspect-buttons button[data-id="${sid}"]').click();const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();})()`); await wait(900); };
const fresh = async (w, h, L, rm) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: base }); await wait(2500); await ev(hook);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await fresh(w, h, L); const r = {};
    r.start = await ev(state);
    await ask('lorenzo', L === 'pt' ? 'A fechadura estava aberta?' : 'Was the lock open?'); r.afterLock = await ev(state);
    await ask('lorenzo', L === 'pt' ? 'A violinista estava nervosa?' : 'Was the violinist nervous?'); r.afterNervous = await ev(state);
    await ask('maya', L === 'pt' ? 'Viu o carrinho?' : 'Did you see the cart?'); r.afterCart = await ev(state);
    await ask('lorenzo', L === 'pt' ? 'E a fechadura de novo?' : 'The lock again?'); r.afterLockAgain = await ev(state);
    await ev(`(()=>{const s=[...document.querySelectorAll('.suspicion')].find(x=>x.offsetParent!==null);if(s)s.scrollIntoView({block:'center'})})()`); await wait(500);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-talk.png`));
    await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(500); r.accuseStep = await ev(state);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-accuse.png`));
    report[`${w}-${L}`] = r;
  }
}
{ // language switch keeps bars, Start over and new file reset, reduced motion
  const r = {};
  await fresh(1280, 800, 'en'); await ask('lorenzo', 'Was the lock open?'); await ask('maya', 'Was the maestro there?');
  r.before = await ev(state); await ev(`document.getElementById('lpt').click()`); await wait(1500); r.afterSwitchPt = await ev(state);
  await ev(`document.getElementById('restart-btn').click()`); await wait(1500); r.afterStartOver = await ev(state);
  await fresh(1280, 800, 'en', true); await ask('lorenzo', 'Was the lock open?');
  r.reducedMotion = await ev(`(()=>{const p=document.querySelector('.sus-pip.on');const row=document.querySelector('.sus-list li.flash');return {pip:p?getComputedStyle(p).transitionDuration+' '+getComputedStyle(p).animationName:null,row:row?getComputedStyle(row).animationName:null}})()`);
  await fresh(1280, 800, 'en'); await ask('lorenzo', 'Was the lock open?');
  r.motion = await ev(`(()=>{const row=document.querySelector('.sus-list li.flash');return {row:row?getComputedStyle(row).animationName:null}})()`);
  await ev(`(async()=>{document.getElementById('files-btn').click();await new Promise(r=>setTimeout(r,800));const b=[...document.querySelectorAll('#cabinet button, .cabinet button')].find(x=>/train|trem/i.test(x.textContent));if(b)b.click();return !!b})()`); await wait(2000);
  r.afterNewFile = await ev(state);
  await ask('tomas', 'Did you see the chef apron?'); r.nightTrainApron = await ev(state);
  report.flows = r;
}
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync(`qa/m2gf6-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
