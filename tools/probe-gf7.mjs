// QA harness (not product): game feel sprint 7 (optional accuse confirm skip, accuse panel flash replay, live line language) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf7.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf7-probes/probe-<prefix>.json
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run35'; const PFX = process.argv[3] || 'before';
const server = createServer({ caseFile: 'content/case.json', scoreFile: path.join(os.tmpdir(), `s-${Date.now()}.json`), mock: true });
await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}/`;
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'));
const ch = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${ud}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise(res => ch.stderr.on('data', d => { const m = String(d).match(/(ws:\/\/\S+)/); if (m) res(m[1]); }));
const port = new URL(wsUrl).port; await new Promise(r => setTimeout(r, 800));
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map(); let dialogs = [];
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); send('Page.handleJavaScriptDialog', { accept: true }); } });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (file) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64')); };
const key = async (k, code, kc) => { for (const type of ['keyDown', 'keyUp']) await send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: kc, text: type === 'keyDown' && k === ' ' ? ' ' : undefined }); };
const ask = async (sid, q) => { await ev(`(()=>{document.querySelector('#suspect-buttons button[data-id="${sid}"]').click();const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();})()`); await wait(900); };
const step = async s => { await ev(`document.querySelector('#steps [data-step="${s}"]').click()`); await wait(400); };
const box = `(()=>{const b=document.getElementById('ask-confirm');if(!b)return null;const l=b.closest('label')||document.querySelector('label[for=ask-confirm]');const r=(l||b).getBoundingClientRect();return {checked:b.checked,label:l?l.textContent.replace(/\\s+/g,' ').trim():null,visible:b.offsetParent!==null,rect:[r.x,r.y,r.width,r.height].map(Math.round),stored:localStorage.getItem('cf-confirm-accuse')}})()`;
const accusePanelRows = `(()=>[...document.querySelectorAll('#suspicion-accuse .sus-list li')].map(li=>({s:li.dataset.suspect,cls:li.className,anims:li.getAnimations().map(a=>a.animationName+':'+a.playState)})))()`;
const fresh = async (w, h, L, clear = true) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: base }); await wait(2200);
  if (clear) { await ev(`localStorage.removeItem('cf-confirm-accuse')`); await send('Page.reload'); await wait(2200); }
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = {};
    // flash replay: lead found in Ask, Accuse opened 1.5 s later
    await fresh(w, h, L); await step('talk');
    await ask('lorenzo', L === 'pt' ? 'A fechadura estava aberta?' : 'Was the lock open?');
    r.talkRowsAfterLead = await ev(accusePanelRows.replace('#suspicion-accuse', '#suspicion-talk'));
    r.accuseRowsBeforeOpen = await ev(accusePanelRows);
    await wait(1500); await step('accuse'); await wait(100);
    r.accuseRowsAfterOpen = await ev(accusePanelRows);
    r.confirmBox = await ev(box);
    await ev(`(()=>{const s=document.getElementById('accuse-section');if(s)s.scrollIntoView({block:'center'})})()`); await wait(300);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-accuse.png`));
    dialogs = []; await ev(`document.querySelectorAll('#accuse-buttons button')[2].click()`); await wait(1200);
    r.defaultDialogs = dialogs.slice(); r.verdictShown = await ev(`!document.getElementById('verdict').hidden`);
    report[`${w}-${L}`] = r;
  }
}
{ // remembered skip, keyboard toggle, turning it back on, live line language
  const r = {};
  await fresh(1280, 800, 'en'); await step('accuse');
  r.initial = await ev(box);
  if (r.initial) {
    await ev(`document.getElementById('ask-confirm').focus()`); await key(' ', 'Space', 32); await wait(200);
    r.afterSpace = await ev(box); r.focusId = await ev(`document.activeElement.id`);
    await fresh(1280, 800, 'en', false); await step('accuse'); r.afterReload = await ev(box);
    await ev(`(()=>{const s=document.getElementById('accuse-section');if(s)s.scrollIntoView({block:'center'})})()`); await wait(300);
    await shot(path.join(OUT, `${PFX}-1280-en-skip-on.png`));
    dialogs = []; await ev(`document.querySelectorAll('#accuse-buttons button')[2].click()`); await wait(1200);
    r.skipDialogs = dialogs.slice(); r.skipVerdict = await ev(`!document.getElementById('verdict').hidden`);
    await ev(`document.getElementById('restart-btn').click()`); await wait(1800); await step('accuse');
    r.afterStartOver = await ev(box);
    await ev(`document.getElementById('lpt').click()`); await wait(1500); r.ptLabel = await ev(box);
    await ev(`document.getElementById('ask-confirm').click()`); await wait(200); r.turnedBackOn = await ev(box);
    dialogs = []; await ev(`document.querySelectorAll('#accuse-buttons button')[2].click()`); await wait(1200); r.backOnDialogs = dialogs.slice();
  }
  await fresh(1280, 800, 'en'); await step('talk'); await ask('lorenzo', 'Was the lock open?');
  r.liveEn = await ev(`document.getElementById('suspicion-live').textContent`);
  await ev(`document.getElementById('lpt').click()`); await wait(1500);
  r.liveAfterPt = await ev(`document.getElementById('suspicion-live').textContent`);
  await ev(`document.getElementById('restart-btn').click()`); await wait(1800);
  r.liveAfterStartOver = await ev(`document.getElementById('suspicion-live').textContent`);
  report.flows = r;
}
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync(`qa/m2gf7-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
