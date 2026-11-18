// QA harness (not product): game feel sprint 12 (harder game: a question budget you can see) in mock mode via headless Chrome CDP.
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
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = { asks: [] };
    await fresh(w, h, L); await ev(step('suspects')); await wait(300);
    r.pickedOk = await ev(pick('Lorenzo')); await wait(400); await ev(step('talk')); await wait(400);
    r.start = await ev(seen);
    // ask neutral questions until the game refuses one (or 22 tries)
    let answered = 0, refusedAt = null, refusal = null;
    for (let i = 0; i < 22; i++) {
      const before = await ev(`document.querySelectorAll('#log .answer-text').length`);
      if (await ev(`document.getElementById('ask-btn').disabled`)) { refusedAt = i + 1; refusal = 'ask-disabled'; break; }
      await ev(ask(`Where were you at nine? (${i + 1})`)); await wait(i < 2 ? 1500 : 450);
      const after = await ev(`document.querySelectorAll('#log .answer-text').length`);
      if (after > before) answered++; else { refusedAt = i + 1; refusal = await ev(`document.getElementById('ask-msg').textContent.trim()`); break; }
      if (i === 2) { r.after3 = await ev(seen); await shot(path.join(OUT, `${PFX}-${w}-${L}-after3.png`)); }
    }
    r.answered = answered; r.refusedAt = refusedAt; r.refusal = refusal; r.end = await ev(seen);
    await shot(path.join(OUT, `${PFX}-${w}-${L}-out.png`));
    report[`${w}-${L}`] = r;
  }
}
// fair path: the 4 key clues (2 implicate Carlos, clear Lorenzo and Maya) then a correct accusation, at 1280 EN
{
  const r = {}; await fresh(1280, 800, 'en'); await ev(step('suspects')); await wait(300);
  const plan = [['Lorenzo', 'Was the lock open?'], ['Maya', 'Did you see the cart?'], ['Maya', 'Was Lorenzo near the case?'], ['Lorenzo', 'Was Maya nervous?']];
  for (const [who, q] of plan) { await ev(step('suspects')); await wait(200); await ev(pick(who)); await wait(300); await ev(step('talk')); await wait(200); await ev(ask(q)); await wait(1500); }
  r.afterClues = await ev(seen);
  r.suspicion = await ev(`[...document.querySelectorAll('#suspicion-talk li')].map(li=>li.textContent.trim().replace(/\\s+/g,' '))`);
  await ev(`localStorage.setItem('cf-confirm-accuse','0')`);
  await ev(step('accuse')); await wait(400);
  await ev(`(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes('Carlos'));b.click();return true})()`); await wait(1500);
  r.verdict = await ev(`document.getElementById('verdict').textContent.trim().replace(/\\s+/g,' ').slice(0,200)`);
  await shot(path.join(OUT, `${PFX}-1280-en-fairpath.png`));
  report.fairPath = r;
}
const dir = process.env.PROBE_DIR || 'qa/m2gf12-probes'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
