// QA harness (not product): game feel sprint 8 (talking portrait in the Conversation log) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf8.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf8-probes/probe-<prefix>.json
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run36'; const PFX = process.argv[3] || 'before';
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
const step = async s => { await ev(`document.querySelector('#steps [data-step="${s}"]').click()`); await wait(400); };
// state of the last answer line in #log
const last = `(()=>{const ps=[...document.querySelectorAll('#log p')];const a=ps[ps.length-1];if(!a)return {lines:0};const f=a.querySelector('.speaker');const sh=a.querySelector('.answer-text');const sr=a.querySelector('.sr-only');const r=f?f.getBoundingClientRect():null;const cs=f?getComputedStyle(f):null;return {lines:ps.length,text:a.textContent.slice(0,90),speaker:!!f,rect:r?[r.x,r.y,r.width,r.height].map(Math.round):null,talking:f?f.classList.contains('is-talking'):false,hasTalk:f?f.classList.contains('has-talk'):false,bg:cs?cs.backgroundImage.replace(/^.*\\/assets\\//,'assets/').slice(0,80):null,bgPos:cs?cs.backgroundPosition:null,anims:f?f.getAnimations().filter(x=>x.animationName).map(x=>x.animationName+':'+x.playState):[],shown:sh?sh.textContent.length:null,full:sr?sr.textContent.length:a.textContent.length,srText:sr?sr.textContent.slice(0,60):null,shownHidden:sh?sh.getAttribute('aria-hidden'):null}})()`;
// click Ask and sample the answer as soon as it lands (poll 15 ms)
const askAndCatch = async (sid, q) => ev(`(async()=>{document.querySelector('#suspect-buttons button[data-id="${sid}"]').click();const n0=document.querySelectorAll('#log p').length;const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();const t0=performance.now();while(performance.now()-t0<4000){await new Promise(r=>setTimeout(r,15));const ps=document.querySelectorAll('#log p');if(ps.length>=n0+2&&!document.getElementById('ask-form').hasAttribute('aria-busy'))break;}return Math.round(performance.now()-t0);})()`);
const fresh = async (w, h, L, url = base, reduced = false) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: reduced ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url }); await wait(2200);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
const Q = { en: 'Was the lock open?', pt: 'A fechadura estava aberta?' };
await send('Page.enable'); await send('Runtime.enable'); await send('Page.navigate', { url: base }); await wait(3500); // warm-up
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = {};
    await fresh(w, h, L); await step('talk');
    r.landedMs = await askAndCatch('lorenzo', Q[L]);
    r.atLanding = await ev(last);
    await ev(`document.getElementById('log').scrollIntoView({block:'center'})`);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-talking.png`));
    r.at400ms = await ev(last);
    await wait(2500);
    r.done = await ev(last);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-done.png`));
    report[`${w}-${L}`] = r;
  }
}
{ const r = {};
  // reduced motion: whole line at once, no mouth animation
  await fresh(1280, 800, 'en', base, true); await step('talk');
  await askAndCatch('lorenzo', Q.en); r.reducedAtLanding = await ev(last);
  // how long a full reveal takes (77 characters)
  await fresh(1280, 800, 'en'); await step('talk');
  await askAndCatch('lorenzo', Q.en);
  r.revealMs = await ev(`(async()=>{const t0=performance.now();while(performance.now()-t0<6000){const a=[...document.querySelectorAll('#log p.answer')].pop();if(a&&a.querySelector('.answer-text').textContent.length===a.querySelector('.sr-only').textContent.length&&!a.querySelector('.speaker.is-talking'))break;await new Promise(r=>setTimeout(r,10));}return Math.round(performance.now()-t0);})()`);
  // click on the log skips the reveal
  await fresh(1280, 800, 'en'); await step('talk');
  await askAndCatch('lorenzo', Q.en); r.beforeClick = await ev(last);
  await ev(`document.getElementById('log').click()`); await wait(50); r.afterClick = await ev(last);
  // language switch while talking
  await askAndCatch('lorenzo', 'Where were you?'); await askAndCatch('lorenzo', Q.en);
  r.beforeSwitch = await ev(last);
  await ev(`document.getElementById('lpt').click()`); await wait(1500); r.afterSwitch = await ev(last);
  // switch suspect and back: history is not replayed
  await ev(`document.querySelector('#suspect-buttons button[data-id="maya"]').click()`); await wait(200);
  await ev(`document.querySelector('#suspect-buttons button[data-id="lorenzo"]').click()`); await wait(60);
  r.historyBack = await ev(last); r.historyLines = await ev(`document.querySelectorAll('#log p.answer').length`);
  r.talkingInHistory = await ev(`document.querySelectorAll('#log .speaker.is-talking').length`);
  // Night Train speaker
  await fresh(1280, 800, 'en', base + '?case=night-train'); await step('talk');
  const ntId = await ev(`(document.querySelector('#suspect-buttons button[data-id]')||{}).dataset?.id`);
  r.ntSuspect = ntId; await askAndCatch(ntId, 'Where were you?'); r.ntAtLanding = await ev(last);
  await wait(2000); await shot(path.join(OUT, `${PFX}-1280-en-nighttrain.png`));
  report.flows = r;
}
console.log(JSON.stringify(report, null, 1)); fs.mkdirSync('qa/m2gf8-probes', { recursive: true }); fs.writeFileSync(`qa/m2gf8-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
