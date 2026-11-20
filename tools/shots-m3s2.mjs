// M3 sprint 2 screenshots (PO harness, not product): the generated Lapa bookshop case picked from the case picker and played live through the Cup key in headless Chrome, 1280x800 and 390x844, EN and PT.
// Usage: node tools/shots-m3s2.mjs <outdir>   Logs every key call to qa/key-usage-log.json (purpose m3s2-shots:*), never the key.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run46/shots'; fs.mkdirSync(OUT, { recursive: true });
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); let purpose = 'm3s2-shots';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const server = await createServer({ caseFile: 'content/case.json', scoreFile: path.join(os.tmpdir(), `m3s2-${Date.now()}.json`), fetchImpl, mock: false });
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
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64')); };
await send('Page.enable'); await send('Runtime.enable');
const fresh = async (w, h, L, q = '') => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Page.navigate', { url: base + q }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
const step = (s) => `(()=>{document.querySelector('#steps [data-step="${s}"]').click();return true})()`;
const pick = (name) => `(()=>{const b=[...document.querySelectorAll('#suspect-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const ask = (q) => `(()=>{const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();return true})()`;
const waitIdle = async () => { for (let i = 0; i < 60; i++) { await wait(500); if (await ev(`document.getElementById('ask-btn').getAttribute('aria-busy')!=='true' && !document.getElementById('q').disabled`)) break; } await wait(2500); };
const accuse = (name) => `(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const GID = 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio';
const Q = { en: [['Claudio', 'Did you see anyone near the display case before the crash?'], ['Daniela', 'Any glass on anyone? Did you see Beatriz after the noise?'], ['Arthur', 'What did you find in the trash? Any gloves?']],
  pt: [['Claudio', 'Você viu alguém perto da vitrine antes do barulho?'], ['Daniela', 'Viu vidro em alguém? Viu a Beatriz depois do barulho?'], ['Arthur', 'O que você encontrou na lixeira? Luvas?']] };
const report = [];
for (const [w, h] of [[1280, 800], [390, 844]]) for (const L of ['en', 'pt']) {
  const tag = `${w}-${L}`; purpose = `m3s2-shots:${tag}`;
  await fresh(w, h, L); await ev(`(()=>{const b=document.querySelector('.folder-card[data-file="${GID}"]');if(b)b.scrollIntoView({block:'center'});return true})()`); await wait(500); await shot(`${tag}-1-picker`);
  const card = await ev(`(()=>{const b=document.querySelector('.folder-card[data-file="${GID}"]');return b?{text:b.innerText,tag:(b.querySelector('.folder-tag')||{}).textContent||null,art:getComputedStyle(b.querySelector('.folder-art')).backgroundImage}:null})()`);
  await ev(`document.querySelector('.folder-card[data-file="${GID}"]').click()`); await wait(2500); await shot(`${tag}-2-briefing`);
  await ev(step('locations')); await wait(600); await ev(`(()=>{document.getElementById('loc-rooms').click();return true})()`); await wait(400);
  const rooms = await ev(`[...document.querySelectorAll('#room-buttons button')].map(b=>b.textContent.trim())`);
  await ev(`document.querySelector('#room-buttons button').click()`); await wait(1500); await shot(`${tag}-3-rooms-scene`);
  const scene = await ev(`({label:(document.getElementById('scene-label')||{}).textContent, on:[...document.querySelectorAll('#scene .scene-layer.is-on')].map(l=>l.style.backgroundImage)})`);
  for (const [s, q] of Q[L]) { await ev(step('suspects')); await wait(300); await ev(pick(s)); await wait(400); await ev(step('talk')); await wait(400); await ev(ask(q)); await waitIdle(); }
  const log = await ev(`[...document.querySelectorAll('#log > *')].slice(-6).map(x=>x.innerText.slice(0,240))`);
  await ev(`(()=>{const f=document.getElementById('conversation');if(f)f.scrollIntoView({block:'end'});return true})()`); await wait(500); await shot(`${tag}-4-talk`);
  await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(600); await shot(`${tag}-5-accuse`);
  await ev(accuse('Beatriz')); await wait(3500); await shot(`${tag}-6-case-closed`);
  const verdict = await ev(`(document.getElementById('verdict')||{}).innerText`);
  if (w === 1280) { await ev(`document.getElementById('restart') && document.getElementById('restart').click()`); await fresh(w, h, L, '?case=' + GID); await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(500); await ev(accuse('Claudio')); await wait(2500); await shot(`${tag}-7-continue`);
    await ev(`document.getElementById('continue-no') && document.getElementById('continue-no').click()`); await wait(3500); await shot(`${tag}-8-newspaper`); }
  report.push({ tag, card, rooms, scene, log, verdict: (verdict || '').slice(0, 300), budget: await ev(`(document.getElementById('questions-used')||{}).textContent`) });
}
fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(log, null, 1));
const calls = log.filter(x => String(x.purpose).startsWith('m3s2-shots')); fs.writeFileSync('qa/m3s2-probes/shots-report.json', JSON.stringify({ report }, null, 1)); console.log(JSON.stringify({ report, calls: calls.length, ok: calls.filter(x => x.status === 200).length, neurons: calls.reduce((a, x) => a + (x.usage?.neurons || 0), 0), receipts: calls.map(x => x.headers['x-fullcup-receipt-id']) }, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
