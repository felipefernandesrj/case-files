// M2 delivery case-closed screenshots, mock mode, no key calls (PO harness, not product): the Night Train played live through the Cup key in headless Chrome, 1280x800 and 390x844, EN and PT.
// Usage: node tools/shots-m2.mjs <outdir>   Logs every key call to qa/key-usage-log.json (purpose m2-shots:*), never the key.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/m2-delivery'; fs.mkdirSync(OUT, { recursive: true });
const log = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); let purpose = 'm2-shots';
const fetchImpl = async (url, opts) => { const t0 = Date.now(); const r = await fetch(url, opts); const ms = Date.now() - t0; const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms, usage: j?.usage || null, cost: j?.usage?.cost ?? null, headers: h, error: r.ok ? null : j });
  return r; };
const server = await createServer({ caseFile: "content/case.json", scoreFile: path.join(os.tmpdir(), `m2c-${Date.now()}.json`), mock: true });
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
const Q = { en: [['Tomás', 'Did you see anyone in a chef apron near the luggage car?'], ['Helena', 'What did you find on the safe? Any flour or smudges?'], ['Victor', 'Who was at your door when the lights came back? Was it Helena?']],
  pt: [['Tomás', 'Você viu alguém de avental de chef perto do vagão de bagagem?'], ['Helena', 'O que você encontrou no cofre? Alguma farinha?'], ['Victor', 'Quem estava na sua porta quando as luzes voltaram? Era a Helena?']] };
const report = [];
for (const [w, h] of [[1280, 800], [390, 844]]) for (const L of ['en', 'pt']) {
  const tag = `${w}-${L}`;
  await fresh(w, h, L); await ev(`document.getElementById('files-btn').click()`); await wait(1500); await shot(`${tag}-1-picker`);
  await fresh(w, h, L, '?case=night-train'); await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(500);
  await ev(accuse('Inês')); await wait(3500);
  await ev(`(()=>{const v=document.getElementById('verdict');if(v)v.scrollIntoView({block:'start'});return true})()`); await wait(800); await shot(`${tag}-6-case-closed`);
}
ws.close(); ch.kill(); server.close(); process.exit(0);
