// M4 sprint 1 screenshots, mock mode, no key calls (PO harness, not product): picker with the pack scoreboard, the cost log page, credits after a verdict; headless Chrome 1280x800 and 390x844, EN and PT.
// Usage: node tools/shots-m4s1-mock.mjs <outdir>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run47/shots'; fs.mkdirSync(OUT, { recursive: true });
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); let purpose = 'm2-shots';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const SF = path.join(os.tmpdir(), `m4c-${Date.now()}.json`); const T0 = Date.now();
// screenshot fixture: two mock plays by the creator persona, labelled as mock (never on FullCup)
fs.writeFileSync(SF, JSON.stringify([{ player: "Caio (mock)", score: 100, questions: 3, correct: true, lang: "en", at: new Date(T0 - 60000).toISOString(), caseId: "case-violin-001" }, { player: "Caio (mock)", score: 90, questions: 5, correct: true, lang: "pt", at: new Date(T0 - 30000).toISOString(), caseId: "case-night-train-002" }]));
const server = await createServer({ caseFile: "content/case.json", scoreFile: SF, mock: true });
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

const report = [];
for (const [w, h] of [[1280, 800], [390, 844]]) for (const L of ['en', 'pt']) {
  const tag = `${w}-${L}`; const r = { tag };
  await fresh(w, h, L); await ev(`document.getElementById('files-btn').click()`); await wait(1800); await shot(`${tag}-1-picker-top`);
  await ev(`(()=>{const s=document.getElementById('pack-scores');s.scrollIntoView({block:'end'});return true})()`); await wait(800); await shot(`${tag}-2-pack-scoreboard`);
  r.cards = await ev(`[...document.querySelectorAll('.folder-card')].map(b=>b.dataset.file)`);
  r.pack = await ev(`({title:document.getElementById('pack-scores-title').textContent, rows:[...document.querySelectorAll('#pack-scores-body tr')].map(t=>t.innerText), empty:!document.getElementById('pack-scores-empty').hidden, link:document.getElementById('cost-link').textContent+' '+document.getElementById('cost-link').getAttribute('href')})`);
  r.overflowPicker = await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  await send('Page.navigate', { url: base + 'costs?lang=' + L }); await wait(2000); await shot(`${tag}-3-cost-log-top`);
  r.costs = await ev(`({h1:document.querySelector('h1')&&document.querySelector('h1').textContent, rows:[...document.querySelectorAll('table')][0] ? [...[...document.querySelectorAll('table')][0].querySelectorAll('tr')].map(t=>t.innerText.replace(/\s+/g,' ')) : null, sections:[...document.querySelectorAll('section[id]')].map(s=>s.id), overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth, alert: (document.querySelector('[role=alert]')||{}).textContent||null})`);
  await send('Page.navigate', { url: base + 'costs?lang=' + L + '#night-train' }); await wait(2000);
  await ev(`(()=>{const s=document.getElementById('night-train');if(s)s.scrollIntoView({block:'start'});return true})()`); await wait(600); await shot(`${tag}-4-cost-log-night-train`);
  r.ntOpen = await ev(`(()=>{const d=document.querySelector('#night-train details');return d?d.open:null})()`);
  r.ntFirstRows = await ev(`[...document.querySelectorAll('#night-train details tr')].slice(0,4).map(t=>t.innerText.replace(/\s+/g,' '))`);
  r.receiptHref = await ev(`(document.querySelector('#night-train details a[href*="receipts"]')||{}).href||null`);
  r.overflowCostsNt = await ev(`document.documentElement.scrollWidth > document.documentElement.clientWidth`);
  await fresh(w, h, L); await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(500);
  await ev(accuse('Carlos')); await wait(3500);
  await ev(`(()=>{const v=document.getElementById('credits');if(v&&!v.hidden)v.scrollIntoView({block:'center'});return true})()`); await wait(800); await shot(`${tag}-5-credits`);
  r.credits = await ev(`({hidden:document.getElementById('credits').hidden,title:document.getElementById('credits-title').textContent,names:[...document.querySelectorAll('#credits-list li')].length,others:document.getElementById('credits-others').hidden?null:document.getElementById('credits-others').textContent,note:document.getElementById('credits-note').hidden?null:document.getElementById('credits-note').textContent,cost:document.getElementById('credits-cost').textContent+' '+document.getElementById('credits-cost').getAttribute('href')})`);
  report.push(r);
}
fs.writeFileSync('qa/m4s1-probes/shots-mock-report.json', JSON.stringify(report, null, 1)); console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
