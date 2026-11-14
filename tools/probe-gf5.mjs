// QA harness (not product): game feel sprint 5 (continue countdown after a wrong verdict) in mock mode via headless Chrome CDP.
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
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    await fresh(w, h, L);
    await ev(accuseBtn('Lorenzo')); await wait(1500);
    const s0 = await ev(state); await shot(path.join(OUT, `${PFX}-${w}-${L}-wrong.png`));
    await ev(`(()=>{const c=document.getElementById('continue');if(c&&!c.hidden)c.scrollIntoView({block:'center'})})()`); await wait(3200);
    const s3 = await ev(state); await shot(path.join(OUT, `${PFX}-${w}-${L}-count.png`));
    await wait(8000);
    const s11 = await ev(state); await shot(path.join(OUT, `${PFX}-${w}-${L}-over.png`));
    report[`${w}-${L}`] = { atVerdict: s0, after3s: s3, after11s: s11 };
  }
}
// Correct verdict, Continue (Enter), Esc, reduced motion, Start over and new file (1280 EN)
{
  const r = {};
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Carlos')); await wait(1500); r.correct = await ev(state); await shot(path.join(OUT, `${PFX}-1280-en-correct.png`));
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Lorenzo')); await wait(2200);
  const hasYes = await ev(`!!document.getElementById('continue-yes')`);
  if (hasYes) { await ev(`document.getElementById('continue-yes').focus()`); await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r' }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 }); await wait(1500); }
  r.afterEnter = await ev(state); r.afterEnterGame = await ev(`({questions:document.getElementById('questions-used').textContent,step:document.querySelector('#steps [aria-current]')?.dataset.step||null,verdictHidden:document.getElementById('verdict').hidden})`);
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Lorenzo')); await wait(2200);
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 }); await wait(600);
  r.afterEsc = await ev(state); await shot(path.join(OUT, `${PFX}-1280-en-esc.png`));
  await fresh(1280, 800, 'en', true); await ev(accuseBtn('Lorenzo')); await wait(2200);
  r.reducedMotion = { ...(await ev(state)), numAnimation: await ev(`(()=>{const n=document.getElementById('continue-num');return n?getComputedStyle(n).animationName+' '+getComputedStyle(n).animationDuration:null})()`) };
  await wait(2000); r.reducedMotion2s = await ev(state);
  await ev(`document.getElementById('restart-btn').click()`); await wait(1500); r.afterStartOver = await ev(state);
  await fresh(1280, 800, 'en'); await ev(accuseBtn('Lorenzo')); await wait(1500);
  await ev(`(async()=>{document.getElementById('files-btn').click();await new Promise(r=>setTimeout(r,800));const b=[...document.querySelectorAll('#cabinet button, .cabinet button')].find(x=>/train|trem/i.test(x.textContent));if(b)b.click();return !!b})()`); await wait(2000);
  r.afterNewFile = await ev(state);
  // Night Train: wrong verdict then Start over, then ask the server about the session case (Start over posts /session)
  await ev(`(async()=>{document.getElementById('restart-btn').click();})()`); await wait(1500);
  r.nightTrainStartOver = await ev(`(async()=>{const sus=[...document.querySelectorAll('#accuse-buttons button')].map(b=>b.textContent);document.querySelector('#steps [data-step="accuse"]').click();const b=document.querySelectorAll('#accuse-buttons button')[0];b.click();await new Promise(r=>setTimeout(r,1500));return {suspects:sus,err:document.getElementById('err').hidden?null:document.getElementById('err').textContent,verdict:document.getElementById('verdict').hidden?null:document.getElementById('verdict').textContent.slice(0,60)}})()`);
  await shot(path.join(OUT, `${PFX}-1280-en-nighttrain-startover.png`));
  report.flows = r;
}
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync(`qa/m2gf5-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
