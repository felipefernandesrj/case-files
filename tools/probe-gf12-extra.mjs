// QA harness (not product): game feel sprint 12 extras (low state, reduced motion, Name the culprit button, Start over, Night Train) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf12.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf12-probes/probe-<prefix>.json
// Mock case: culprit carlos. Neutral question = no clue keyword. confirm() dialogs are auto-accepted.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run40'; const PFX = process.argv[3] || 'before';
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
};
const step = (s) => `(()=>{document.querySelector('#steps [data-step="${s}"]').click();return true})()`;
const pick = (name) => `(()=>{const b=[...document.querySelectorAll('#suspect-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const ask = (q) => `(()=>{const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();return true})()`;
// what the player can see about the question budget on the Talk step
const seen = `(()=>{const vis=n=>{if(!n)return false;const b=n.getBoundingClientRect();return !n.hidden&&n.offsetParent!==null&&b.width>0&&b.height>0&&b.bottom>0&&b.top<innerHeight};
 const qb=document.getElementById('q-budget');const pips=qb?[...qb.querySelectorAll('.qb-pip')]:[];
 const am=document.getElementById('ask-msg');const qu=document.getElementById('questions-used');const go=document.getElementById('budget-accuse');
 return {budgetMeter:qb?{visible:vis(qb),text:qb.textContent.trim(),pips:pips.length,spent:pips.filter(p=>p.classList.contains('is-spent')).length,cls:qb.className,anim:pips.length?getComputedStyle(pips[pips.length-1]).animationName:null}:null,
  questionsUsed:qu?{visible:vis(qu),text:qu.textContent.trim()}:null,askMsg:am?{visible:vis(am),text:am.textContent.trim()}:null,
  goAccuse:go?{visible:vis(go),text:go.textContent.trim()}:null,askDisabled:document.getElementById('ask-btn').disabled,qDisabled:document.getElementById('q').disabled,logAnswers:document.querySelectorAll('#log .answer-text').length}})()`;
const report = {};
const ok = [];
// low state at 2 left, 1280 EN, normal motion
await fresh(1280, 800, 'en'); await ev(step('suspects')); await wait(300); await ev(pick('Maya')); await wait(400);
for (let i = 0; i < 6; i++) { await ev(ask(`Where were you? ${i}`)); await wait(i < 1 ? 1500 : 500); }
report.low = await ev(seen); report.lowAnim = await ev(`getComputedStyle(document.querySelector('.q-budget.is-low .qb-pip:not(.is-spent)')).animationName`);
await shot(path.join(OUT, `extra-1280-en-low.png`));
for (let i = 0; i < 2; i++) { await ev(ask(`And then? ${i}`)); await wait(600); }
report.outFocus = await ev(`document.activeElement && document.activeElement.id`);
report.outMeterAnim = await ev(`getComputedStyle(document.getElementById('q-budget')).animationName`);
await ev(`document.getElementById('budget-accuse').click()`); await wait(500);
report.afterButton = await ev(`({panel:(document.querySelector('.panel.is-on')||{}).dataset?.panel, focus: document.activeElement && document.activeElement.textContent.trim().slice(0,40)})`);
await shot(path.join(OUT, `extra-1280-en-button-accuse.png`));
// Start over gives the full budget back
await ev(`document.getElementById('restart-btn').click()`); await wait(1500); await ev(step('talk')); await wait(300);
report.afterStartOver = await ev(seen);
// reduced motion at 390 PT
await fresh(390, 844, 'pt', true); await ev(step('suspects')); await wait(300); await ev(pick('Maya')); await wait(400);
for (let i = 0; i < 7; i++) { await ev(ask(`Onde você estava? ${i}`)); await wait(500); }
report.reducedLow = await ev(`(()=>{const p=[...document.querySelectorAll('.qb-pip')];return {anims:[...new Set(p.map(x=>getComputedStyle(x).animationName))],cls:document.getElementById('q-budget').className}})()`);
await shot(path.join(OUT, `extra-390-pt-reduced-low.png`));
// Night Train: 10 pips
await fresh(1280, 800, 'en', false, '?case=night-train'); await ev(step('talk')); await wait(300);
report.nightTrain = await ev(seen);
await shot(path.join(OUT, `extra-1280-en-nighttrain.png`));
const dir = 'qa/m2gf12-probes'; fs.writeFileSync(path.join(dir, `probe-extra.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
