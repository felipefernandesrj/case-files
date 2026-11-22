// M4 run 48 polish probe (credits list and cost link styles), mock mode, no key calls (PO harness, not product): picker with 4 cases, pack scoreboard, cost log, Silent Batucada rooms + case closed + credits; headless Chrome 1280x800 and 390x844, EN and PT.
// Usage: node tools/shots-m4-delivery.mjs <outdir>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run48/shots'; fs.mkdirSync(OUT, { recursive: true });
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
for (const [w, h] of [[1280, 800], [390, 844]]) {
  await fresh(w, h, 'en'); await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(500); await ev(accuse('Carlos')); await wait(3500);
  report.push({ w, r: await ev(`(()=>{const lum=c=>{const m=c.match(/[\\d.]+/g).map(Number);const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(m[0])+0.7152*f(m[1])+0.0722*f(m[2])};
  const bgOf=e=>{while(e){const b=getComputedStyle(e).backgroundColor;if(b&&!/rgba\\(0, 0, 0, 0\\)|transparent/.test(b))return b;e=e.parentElement}return 'rgb(0,0,0)'};
  const op=e=>{let o=1;while(e){o*=Number(getComputedStyle(e).opacity);e=e.parentElement}return o};
  const a=document.getElementById('credits-cost'),cs=getComputedStyle(a),ul=document.getElementById('credits-list'),li=ul.querySelector('li');
  const L1=lum(cs.color),L2=lum(bgOf(a));
  return {linkColor:cs.color,bg:bgOf(a),opacity:op(a),contrast:((Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05)).toFixed(2),filter:getComputedStyle(document.getElementById('credits')).filter,
   ulTextAlign:getComputedStyle(ul).textAlign,listStyle:getComputedStyle(ul).listStylePosition+' '+getComputedStyle(ul).listStyleType,liWidth:li.getBoundingClientRect().width,liTextW:(()=>{const r=document.createRange();r.selectNodeContents(li);return r.getBoundingClientRect().width})(),font:getComputedStyle(ul).fontFamily}})()`) });
}
console.log(JSON.stringify(report, null, 1)); ws.close(); ch.kill(); server.close(); process.exit(0);
