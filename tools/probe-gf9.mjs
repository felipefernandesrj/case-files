// QA harness (not product): game feel sprint 9 (wrong verdict aftermath story) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf9.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf9-probes/probe-<prefix>.json
// Mock case: culprit carlos, wrong suspect lorenzo. confirm() dialogs are auto-accepted.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run37'; const PFX = process.argv[3] || 'before';
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
  await send('Page.navigate', { url: base + (globalThis.CASEQ || '') }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
  await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(400);
};
const paper = `(()=>{const v=document.getElementById('verdict');const p=v&&v.querySelector('.aftermath');if(!p)return {paper:null,verdict:v&&!v.hidden?v.textContent.replace(/\\s+/g,' ').trim().slice(0,160):null,continueBox:(document.getElementById('continue')||{}).hidden===false?document.getElementById('continue-title').textContent:'hidden',live:(document.getElementById('continue-live')||{}).textContent||null};
 const r=p.getBoundingClientRect();const cs=getComputedStyle(p);return {paper:[...p.children].map(c=>c.textContent),cls:p.className,rect:[r.x,r.y,r.width,r.height].map(Math.round),anim:cs.animationName,bg:cs.backgroundColor,color:cs.color,headFont:getComputedStyle(p.children[1]).fontFamily.slice(0,20),live:document.getElementById('continue-live').textContent}})()`;
const giveUp = async () => { await ev(`(()=>{const n=document.getElementById('continue-no');if(n&&!n.hidden){n.click();return true}return false})()`); await wait(1200); };
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await fresh(w, h, L);
    await ev(accuseBtn('Lorenzo')); await wait(1500);
    const during = await ev(paper);
    await giveUp();
    const over = await ev(paper);
    await ev(`(()=>{const p=document.querySelector('#verdict .aftermath')||document.getElementById('verdict');p.scrollIntoView({block:'center'})})()`); await wait(900);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-over.png`));
    await ev(`document.getElementById('${L === 'en' ? 'lpt' : 'len'}').click()`); await wait(1800);
    const switched = await ev(paper);
    report[`${w}-${L}`] = { duringCountdown: during, gameOver: over, afterLangSwitch: switched };
  }
}
{
  const r = {};
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Carlos')); await wait(1500); r.correct = await ev(paper);
  await fresh(1280, 800, 'en', true); await ev(accuseBtn('Maya')); await wait(1500); await giveUp(); r.reducedMotionMaya = await ev(paper);
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Lorenzo')); await wait(1500); await wait(11000); r.timeout = await ev(paper);
  await ev(`document.getElementById('continue-close').click()`); await wait(500); r.afterClose = await ev(paper);
  globalThis.CASEQ = '?case=night-train';
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Victor')); await wait(1500); await giveUp(); r.nightTrainVictor = await ev(paper);
  await ev(`(()=>{const p=document.querySelector('#verdict .aftermath')||document.getElementById('verdict');p.scrollIntoView({block:'center'})})()`); await wait(900);
  await shot(path.join(OUT, `${PFX}-1280-en-nighttrain.png`));
  globalThis.CASEQ = '';
  report.extra = r;
}
fs.mkdirSync('qa/m2gf9-probes', { recursive: true });
fs.writeFileSync(path.join(process.env.PROBE_DIR || 'qa/m2gf9-probes', `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
