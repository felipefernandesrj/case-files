// Pre-launch QA probe (PO harness): after a verdict at 1280, is the top of the accuse stage reachable by scrolling #play? Usage: node tools/probe-prelaunch-verdict.mjs <outdir>
// Pre-launch QA screenshots (PO harness, not product): every key screen of The Night Train at 1280, 768, 390, EN and PT, mock mode, no key calls.
// was: M4 delivery screenshots, mock mode, no key calls (PO harness, not product): picker with 4 cases, pack scoreboard, cost log, Silent Batucada rooms + case closed + credits; headless Chrome 1280x800 and 390x844, EN and PT.
// Usage: node tools/shots-m4-delivery.mjs <outdir>
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/prelaunch-bots/shots/before'; fs.mkdirSync(OUT, { recursive: true });
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



// probe: after the verdict at 1280, can the top of the accuse stage be reached by scrolling #play?
for (const L of ['en','pt']) for (const ok of [true,false]) {
await fresh(1280, 800, L, '?case=night-train'); await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(800); await ev(accuse(ok?'In':'Helena')); await wait(3800);
if(!ok){ await ev(`(()=>{const b=document.getElementById('continue-no');if(b)b.click();const c=document.getElementById('continue-close');return true})()`); await wait(2500); await ev(`document.getElementById('continue-close')?.click()`); await wait(800);}
const r = await ev(`(()=>{const p=document.getElementById('play');p.scrollTop=0;const st=document.getElementById('accuse-stage');const f=st.firstElementChild;const pr=p.getBoundingClientRect();return {playTop:Math.round(pr.top),scrollH:p.scrollHeight,clientH:p.clientHeight,stageTop:Math.round(st.getBoundingClientRect().top),firstChild:f.id||f.tagName,firstTop:Math.round(f.getBoundingClientRect().top),hiddenAbove:Math.round(pr.top-st.getBoundingClientRect().top)}})()`);
console.log(L, ok?'correct':'wrong', JSON.stringify(r)); await shot(`probe-top-${L}-${ok}`);
}
ws.close(); ch.kill(); server.close(); process.exit(0);
