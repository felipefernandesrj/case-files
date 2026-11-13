// QA harness (not product): game feel sprint 2 screenshots in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf2.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf2-probes/probe-<prefix>.json
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run30'; const PFX = process.argv[3] || 'before';
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
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.result.data, 'base64')); };
const scene = `(()=>{const s=document.getElementById('scene');if(!s)return 'no #scene';const on=[...s.querySelectorAll('.scene-layer')].filter(l=>l.classList.contains('is-on'));const lab=document.getElementById('scene-label');return 'layersOn='+on.length+' bg='+(on[0]?on[0].style.backgroundImage:'')+' opacity='+(on[0]?getComputedStyle(on[0]).opacity:'')+' label='+(lab?lab.textContent:'')})()`;
const playBg = `(()=>{const p=document.getElementById('play');const cs=getComputedStyle(p);return 'playBg='+cs.backgroundImage.slice(0,80)+' locPanelVisible='+(getComputedStyle(document.getElementById('locations')).display!=='none')})()`;
await send('Page.enable'); await send('Runtime.enable');
const report = {};
for (const [w, h] of [[1280, 800], [390, 844]]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: base }); await wait(2500);
  await ev(`document.querySelector('#steps [data-step="locations"]').click()`); await wait(400);
  await ev(`document.querySelectorAll('#room-buttons .room')[1].click()`); await wait(900);
  report[`${w}-room`] = await ev(scene) + ' ' + await ev(playBg);
  await shot(`${PFX}-${w}-room.png`);
  await ev(`document.querySelector('#steps [data-step="talk"]').click()`); await wait(900);
  report[`${w}-talk`] = await ev(scene) + ' ' + await ev(playBg);
  await shot(`${PFX}-${w}-talk.png`);
  await ev(`document.querySelector('#steps [data-step="locations"]').click()`); await wait(300);
  await ev(`document.querySelectorAll('#room-buttons .room')[2].click()`); await wait(250);
  report[`${w}-crossfade-mid`] = await ev(`(()=>{const s=document.getElementById('scene');return s?[...s.querySelectorAll('.scene-layer')].map(l=>l.className+'@'+getComputedStyle(l).opacity).join(' | '):'no #scene'})()`);
  await wait(900);
  await ev(`document.getElementById('lpt').click()`); await wait(1500);
  await ev(`document.querySelector('#steps [data-step="suspects"]').click()`); await wait(600);
  report[`${w}-pt`] = await ev(scene);
  await shot(`${PFX}-${w}-pt.png`);
  await ev(`document.getElementById('len').click()`); await wait(1500);
  await ev(`document.querySelector('#steps [data-step="accuse"]').click()`); await wait(300);
  await ev(`[...document.querySelectorAll('#accuse-buttons button')].find(b=>/Carlos/.test(b.textContent)).click()`); await wait(1500);
  await ev(`document.getElementById('verdict').scrollIntoView({block:'center'})`); await wait(900);
  report[`${w}-stamp`] = await ev(`(()=>{const s=document.querySelector('.case-closed-stamp');const p=[...document.querySelectorAll('#verdict p')].find(x=>/Score|Pontua/.test(x.textContent));if(!s||!p)return 'missing stamp='+!!s+' score='+!!p;const a=s.getBoundingClientRect(),b=p.getBoundingClientRect();const ov=Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top))*(Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))>0?1:0);return 'stampTop='+a.top.toFixed(1)+' scoreBottom='+b.bottom.toFixed(1)+' gap='+(a.top-b.bottom).toFixed(1)+' overlapPx='+ov.toFixed(1)})()`);
  await shot(`${PFX}-${w}-verdict.png`);
  await ev(`document.getElementById('restart-btn').click()`); await wait(1200);
  report[`${w}-after-restart`] = await ev(scene);
}
// reduced motion
await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await send('Page.navigate', { url: base }); await wait(2000);
await ev(`document.querySelector('#steps [data-step="locations"]').click()`); await wait(300);
await ev(`document.querySelectorAll('#room-buttons .room')[0].click()`); await wait(600);
report['reduced-motion'] = await ev(`(()=>{const l=document.querySelector('#scene .scene-layer');return l?'transitionDuration='+getComputedStyle(l).transitionDuration:'no #scene'})()`);
console.log(JSON.stringify(report, null, 1)); fs.writeFileSync(`qa/m2gf2-probes/probe-${PFX}.json`, JSON.stringify(report, null, 1));
ch.kill('SIGKILL'); server.close(); process.exit(0);
