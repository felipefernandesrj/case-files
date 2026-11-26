// Launch verification (PO harness): plays full live games on the public Worker in a headless browser, EN at 1280 and PT at 390, with screenshots.
// Calls go through the Worker (Cup key server-side only); the Worker logs them and tools/sync-live-usage.mjs copies them into qa/key-usage-log.json.
// Usage: node tools/verify-live.mjs <outdir> [baseUrl]
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
const OUT = process.argv[2] || '/workspace/casefiles-qa/launch/shots'; fs.mkdirSync(OUT, { recursive: true });
const base = (process.argv[3] || 'https://case-files.fullcup.ai') + '/';
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



const runs = [
  { w: 1280, h: 800, L: 'en', file: 'violin', name: 'Launch check EN', qs: [['Lorenzo', 'Where were you when the violin disappeared?'], ['Maya', 'What did you see near the instrument room?'], ['Carlos', 'Where were you during the rehearsal break?'], ['Maya', 'Did anyone go into the instrument room?']], culprit: 'Carlos' },
  { w: 390, h: 844, L: 'pt', file: 'night-train', name: 'Teste lancamento PT', qs: [['Victor', 'Onde você estava durante o apagão no túnel?'], ['Tom', 'O que você viu no vagão-restaurante?'], ['Helena', 'Quem tinha acesso ao cofre do vagão de bagagem?'], ['Victor', 'Você viu alguém de avental branco?'], ['In', 'Onde você estava durante o apagão?']], culprit: 'In' },
];
const res = [];
for (const r of runs) {
  const tag = `${r.w}-${r.L}-${r.file}`; const S = (n) => shot(`${tag}-${n}`);
  await fresh(r.w, r.h, r.L, '?case=' + r.file); await S('01-briefing');
  await ev(step('talk')); await wait(600); let k = 0;
  for (const [who, q] of r.qs) { await ev(pick(who)); await wait(400); await ev(ask(q)); await waitIdle(); k++; if (k === 1) await S('02-first-answer'); }
  const used = await ev(`document.body.innerText.match(/(\\d+)\\s*\\/\\s*(\\d+)/)?.[0]||''`);
  await S('03-talk-last');
  await ev(`(()=>{const p=document.getElementById('player');p.value=${JSON.stringify(r.name)};p.dispatchEvent(new Event('input'));return true})()`);
  await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(800); await ev(accuse(r.culprit)); await wait(4000);
  const verdict = await ev(`(document.getElementById('verdict')||document.body).innerText.slice(0,400)`);
  await ev(`window.scrollTo(0,0)`); await S('04-verdict');
  await send('Page.navigate', { url: base + 'costs?lang=' + r.L }); await wait(2500); await S('05-costs');
  await send('Page.navigate', { url: base + '?lang=' + r.L }); await wait(2500); await ev(`document.getElementById('files-btn').click()`); await wait(2000);
  await ev(`(()=>{const s=document.getElementById('pack-scores');if(s)s.scrollIntoView({block:'end'});return true})()`); await wait(1200); await S('06-scoreboard');
  const board = await ev(`(document.getElementById('pack-scores')||{}).innerText||''`);
  res.push({ tag, used, verdict: verdict.replace(/\s+/g, ' ').slice(0, 220), board: board.replace(/\s+/g, ' ').slice(0, 200) }); console.log(JSON.stringify(res.at(-1)));
}
fs.writeFileSync(path.join(OUT, 'verify.json'), JSON.stringify(res, null, 1)); ws.close(); ch.kill(); process.exit(0);
