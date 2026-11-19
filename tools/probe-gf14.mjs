// QA harness (not product): game feel sprint 14 (the "No questions left" line under the box after the verdict) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf14.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf14-probes/probe-<prefix>.json
// States on the Talk step: out (budget spent), verdict (correct accusation after the budget), lang switch after verdict, wrong verdict after budget, early verdict, Start over, spent again.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run42'; const PFX = process.argv[3] || 'before';
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
const shot = async (file) => {
  const clip = await ev(`(()=>{const f=document.getElementById('conversation');if(!f)return null;f.scrollIntoView({block:'end'});const b=document.getElementById('ask-form').getBoundingClientRect();const top=Math.max(0,b.top-60+scrollY);return {x:0,y:top,width:innerWidth,height:Math.min(320,innerHeight),scale:1}})()`);
  const r = await send('Page.captureScreenshot', clip ? { format: 'png', clip, captureBeyondViewport: true } : { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
};
await send('Page.enable'); await send('Runtime.enable');
const fresh = async (w, h, L, rm) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: base }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
const step = (s) => `(()=>{document.querySelector('#steps [data-step="${s}"]').click();return true})()`;
const pick = (name) => `(()=>{const b=[...document.querySelectorAll('#suspect-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const ask = (q) => `(()=>{const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();return true})()`;
const msg = `(()=>{const m=document.getElementById('ask-msg');const r=m.getBoundingClientRect();return {hidden:m.hidden,visible:!m.hidden&&r.height>0&&getComputedStyle(m).display!=='none',text:m.textContent.trim(),lock:document.getElementById('ask-form').dataset.lock||'',goHidden:document.getElementById('budget-accuse').hidden}})()`;
const spend = async () => { for (let i = 0; i < 12; i++) { if (await ev(`document.getElementById('ask-btn').disabled`)) break; await ev(ask(`Where were you at nine? (${i + 1})`)); await wait(i < 2 ? 1500 : 500); } await wait(800); };
const accuse = async (name) => { await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(400); await ev(`(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));b.click();return true})()`); await wait(1800); };
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = {}; const tag = `${w}-${L}`;
    await fresh(w, h, L, false); await ev(step('suspects')); await wait(300); await ev(pick('Lorenzo')); await wait(400); await ev(step('talk')); await wait(400);
    await spend(); r.out = await ev(msg); await shot(path.join(OUT, `${PFX}-${tag}-out.png`));
    await accuse('Carlos'); await ev(step('talk')); await wait(500); r.verdict = await ev(msg); await shot(path.join(OUT, `${PFX}-${tag}-verdict.png`));
    await ev(`document.getElementById('${L === 'pt' ? 'len' : 'lpt'}').click()`); await wait(1200); await ev(step('talk')); await wait(400); r.verdictSwitch = await ev(msg);
    await ev(`document.getElementById('${L === 'pt' ? 'lpt' : 'len'}').click()`); await wait(1200);
    await ev(`document.getElementById('restart-btn').click()`); await wait(1500); await ev(step('suspects')); await wait(300); await ev(pick('Lorenzo')); await wait(300); await ev(step('talk')); await wait(400);
    r.restart = await ev(msg);
    await spend(); r.outAgain = await ev(msg);
    report[tag] = r;
  }
}
// wrong verdict after the budget (Try again countdown) and an early verdict with questions left, 1280 EN
{
  await fresh(1280, 800, 'en', false); await ev(step('suspects')); await wait(300); await ev(pick('Lorenzo')); await wait(300); await ev(step('talk')); await wait(300);
  await spend(); await accuse('Maya'); await ev(step('talk')); await wait(500); report.wrongVerdict = await ev(msg);
  await shot(path.join(OUT, `${PFX}-1280-en-wrong.png`));
  await fresh(1280, 800, 'en', false); await ev(step('suspects')); await wait(300); await ev(pick('Lorenzo')); await wait(300); await ev(step('talk')); await wait(300);
  await ev(ask('Where were you at nine?')); await wait(1500); await accuse('Carlos'); await ev(step('talk')); await wait(500); report.earlyVerdict = await ev(msg);
}
const dir = process.env.PROBE_DIR || 'qa/m2gf14-probes'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
