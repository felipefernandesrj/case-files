# Context: web page + its CDP keyboard/screen-reader test, both written by you. Server API is correct and out of scope.
<<<FILE test/keyboard.mjs>>>
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { createServer } from '../src/server.js';

function findChrome() {
  const candidates = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
  for (const p of candidates) { try { fs.accessSync(p, fs.constants.X_OK); return p; } catch {} }
  return null;
}

if (!global.WebSocket || !findChrome()) { console.log('SKIP keyboard'); process.exit(0); }

const caseData = JSON.parse(fs.readFileSync(path.resolve('content/case.json'), 'utf8'));
const suspectIds = caseData.suspects.map(s => s.id);

const scoreFile = path.join(os.tmpdir(), `scores-${Date.now()}.json`);
const server = createServer({ caseFile: 'content/case.json', scoreFile, mock: true });
await new Promise(r => server.listen(0, r));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const chrome = spawn(findChrome(), ['--headless=new', '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${userDataDir}`, `${baseUrl}/`], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeKilled = false;
let ws = null;
let msgId = 1;
const pending = new Map();

function cleanup(code = 0) {
  clearTimeout(watchdog);
  if (!chromeKilled) { try { chrome.kill('SIGKILL'); } catch {} chromeKilled = true; }
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
  try { server.close(); } catch {}
  if (ws && ws.readyState === WebSocket.OPEN) ws.close();
  process.exit(code);
}

const watchdog = setTimeout(() => cleanup(1), 60000);
process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));
process.on('uncaughtException', (err) => { console.error(`FAIL unexpected: ${err.message}`); cleanup(1); });

let wsUrl = null;
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Chrome timeout')), 10000);
  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', chunk => {
    const m = chunk.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (m) { wsUrl = m[1]; clearTimeout(timeout); resolve(); }
  });
});

const dbgPort = new URL(wsUrl).port;
await new Promise(r => setTimeout(r, 1000));

async function getPageTargetId() {
  for (let i = 0; i < 50; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${dbgPort}/json/list`);
      const list = await res.json();
      const target = list.find(t => t.type === 'page');
      if (target?.id) return target.id;
    } catch {}
    await new Promise(r => setTimeout(r, 200));
  }
  throw new Error('No target');
}
const targetId = await getPageTargetId();
ws = new WebSocket(`${wsUrl.replace(/\/devtools\/browser\/.*/, '')}/devtools/page/${targetId}`);
await new Promise(r => ws.addEventListener('open', r));

ws.addEventListener('message', e => {
  const msg = JSON.parse(e.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});

async function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout: ${method}`)); }, 5000);
    pending.set(id, (msg) => { clearTimeout(timer); resolve(msg); });
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expr) {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (res.result?.exceptionDetails) {
    throw new Error(res.result.exceptionDetails.exception.description);
  }
  return res.result?.result?.value ?? res.result?.value;
}

async function waitFor(fn, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) { if (await fn()) return; await new Promise(r => setTimeout(r, 100)); }
  throw new Error('Timeout');
}

await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
await send('Input.enable');
await send('Page.navigate', { url: baseUrl + '/' });
await waitFor(async () => (await evaluate('document.readyState')) === 'complete');
await waitFor(async () => (await evaluate('document.querySelectorAll("#accuse-buttons button").length')) >= 3);

async function pressKey(key, code, vk, text) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: vk, key, code, ...(text !== undefined ? { text, unmodifiedText: text } : {}) });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, key, code });
}
async function pressTab() { await pressKey('Tab', 'Tab', 9); }
async function pressEnter() { await pressKey('Enter', 'Enter', 13, '\r'); }
async function insertText(txt) { await send('Input.insertText', { text: txt }); }

async function activeId() {
  return await evaluate(`(function(){
    const el=document.activeElement;
    if(el.id) return el.id;
    if(el.dataset.id) return el.dataset.id;
    const acc=document.querySelectorAll('#accuse-buttons button');
    for(let i=0;i<acc.length;i++) if(el===acc[i]) return 'accuse-'+i;
    return el.tagName.toLowerCase();
  })()`);
}
async function outlineNotNone(id) {
  return await evaluate(`(function(){
    const el=document.getElementById('${id}') || document.querySelector('button[data-id="${id}"]');
    if(!el) return false;
    const s=getComputedStyle(el);
    return s.outlineStyle !== 'none';
  })()`);
}

let passed = 0, failed = 0;
function pass(n) { console.log(`PASS ${n}`); passed++; }
function fail(n, r) { console.log(`FAIL ${n}: ${r}`); failed++; }

async function runStep(name, task) {
  try {
    await task();
    pass(name);
  } catch (e) {
    fail(name, e.message);
  }
}

// 1. Tab order and outline
await runStep('tab-order', async () => {
  const expectedOrder = ['len', 'lpt', ...suspectIds, 'q', 'ask-btn', 'player'];
  for (let i = 0; i < 3; i++) expectedOrder.push(`accuse-${i}`);
  for (let i = 0; i < expectedOrder.length; i++) {
    await pressTab();
    const cur = await activeId();
    if (cur !== expectedOrder[i]) throw new Error(`expected ${expectedOrder[i]}, got ${cur}`);
    if (!cur.startsWith('accuse-')) {
      const ok = await outlineNotNone(cur);
      if (!ok) throw new Error(`${cur} no outline`);
    }
  }
});

// 2. Suspect select
await runStep('suspect-select', async () => {
  const sid = suspectIds[0];
  await evaluate(`document.querySelector('button[data-id="${sid}"]').focus()`);
  await pressEnter();
  const pressed = await evaluate(`document.querySelector('button[data-id="${sid}"]').getAttribute('aria-pressed')`);
  if (pressed !== 'true') throw new Error(`aria-pressed fail for ${sid}`);
  const focus = await evaluate(`document.activeElement.id`);
  if (focus !== 'q') throw new Error(`focus fail for ${sid}, got ${focus}`);
});

// 3. Ask
await runStep('ask-question', async () => {
  await evaluate(`document.getElementById('q').focus()`);
  await insertText('What is your alibi?');
  await pressEnter();
  await waitFor(async () => (await evaluate(`document.querySelectorAll('#log p').length`)) >= 2);
  const logText = await evaluate(`document.getElementById('log').innerText`);
  if (!logText.includes('What is your alibi?')) throw new Error('not logged');
});

// 4. History
await runStep('history-per-suspect', async () => {
  const s2 = suspectIds[1];
  await evaluate(`document.querySelector('button[data-id="${s2}"]').focus()`);
  await pressEnter();
  await evaluate(`document.getElementById('q').focus()`);
  await insertText('Did you see anything?');
  await pressEnter();
  await waitFor(async () => (await evaluate(`document.querySelectorAll('#log p').length`)) >= 4);
  await evaluate(`document.querySelector('button[data-id="${suspectIds[0]}"]').focus()`);
  await pressEnter();
  const hLog = await evaluate(`document.getElementById('log').innerText`);
  if (!(hLog.includes('What is your alibi?') && !hLog.includes('Did you see anything?'))) {
    throw new Error('history isolation fail');
  }
});

// 5. Lang
await runStep('lang-pt', async () => {
  await evaluate(`document.getElementById('lpt').focus()`);
  await pressEnter();
  let la = await evaluate(`document.documentElement.lang`);
  let ql = await evaluate(`document.getElementById('question-label').textContent`);
  if (la !== 'pt-BR' || ql !== 'Pergunta') throw new Error(`la=${la}, ql=${ql}`);
});

await runStep('lang-en', async () => {
  await evaluate(`document.getElementById('len').focus()`);
  await pressEnter();
  let la = await evaluate(`document.documentElement.lang`);
  let ql = await evaluate(`document.getElementById('question-label').textContent`);
  if (la !== 'en' || ql !== 'Question') throw new Error(`la=${la}, ql=${ql}`);
});

// 6. Accuse
await runStep('verdict-focus', async () => {
  await evaluate(`document.getElementById('player').value = ''`);
  await evaluate(`document.getElementById('player').focus()`);
  await pressEnter();
  await evaluate(`document.querySelectorAll('#accuse-buttons button')[0].focus()`);
  await pressEnter();
  await waitFor(async () => !(await evaluate(`document.getElementById('verdict').hidden`)));
  const focus = await evaluate(`document.activeElement.id`);
  if (focus !== 'verdict') throw new Error(`focus fail, got ${focus}`);
});

// 7. Labels
await runStep('input-labels', async () => {
  const inputs = await evaluate(`Array.from(document.querySelectorAll('input')).map(i=>i.id)`);
  for (const inp of inputs) {
    const hasLbl = await evaluate(`document.querySelector('label[for="${inp}"]') !== null`);
    if (!hasLbl) throw new Error(`missing label for ${inp}`);
  }
});

// 8. Error alert
await runStep('#err-alert', async () => {
  const errE = await evaluate(`document.getElementById('err') !== null`);
  const errR = await evaluate(`document.getElementById('err')?.getAttribute('role')`);
  if (!(errE && errR === 'alert')) throw new Error(`e=${errE}, r=${errR}`);
});

console.log(`${passed} passed, ${failed} failed`);
cleanup(failed > 0 ? 1 : 0);
<<<END>>>
<<<FILE public/index.html>>>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>FullCup Mystery</title>
<style>
  body{font-family:sans-serif;margin:0;padding:1rem;background:#f5f5f5;color:#222}
  header,main,footer{max-width:800px;margin:auto}
  button{margin:0.2rem;padding:0.5rem 1rem;background:#fff;border:1px solid #888;border-radius:4px;cursor:pointer}
  button[aria-pressed="true"]{background:#e0e0ff}
  button:disabled{opacity:0.5;cursor:not-allowed}
  input,textarea{padding:0.4rem;font-size:1rem;width:100%;box-sizing:border-box}
  #log{background:#fff;padding:0.5rem;border:1px solid #ccc;min-height:150px;overflow-y:auto;margin-top:0.5rem}
  #verdict{margin-top:1rem;padding:1rem;background:#e0ffe0;border:1px solid #0a0}
  #err{margin-top:1rem;padding:1rem;background:#ffe0e0;border:1px solid #a00}
  table{width:100%;border-collapse:collapse;margin-top:0.5rem}
  th,td{border:1px solid #999;padding:0.3rem;text-align:left}
  [role="log"] p{margin:0.3rem 0}
  button:focus-visible{outline:3px solid #0066ff}
</style>
</head>
<body>
<header>
  <h1 id="title">FullCup Mystery</h1>
  <div>
    <button id="len" aria-pressed="true">EN</button>
    <button id="lpt" aria-pressed="false">PT</button>
  </div>
</header>
<main>
  <section id="intro"></section>

  <section id="suspects">
    <h2 id="suspects-title">Suspects</h2>
    <div id="suspect-buttons"></div>
  </section>

  <section id="conversation">
    <h2 id="conversation-title">Conversation</h2>
    <div id="log" role="log" aria-live="polite"></div>
    <form id="ask-form">
      <label for="q" id="question-label">Question</label>
      <input type="text" id="q" maxlength="500" required>
      <button type="submit" id="ask-btn">Ask</button>
    </form>
  </section>

  <section id="player-section">
    <label for="player" id="player-label">Your name</label>
    <input type="text" id="player" maxlength="24" placeholder="anon">
  </section>

  <section id="accuse-section">
    <h2 id="accuse-title">Accuse</h2>
    <div id="accuse-buttons"></div>
  </section>

  <section id="verdict" role="status" aria-live="assertive" tabindex="-1" hidden></section>
  <section id="err" role="alert" hidden></section>

  <section id="scores-section" hidden>
    <h2>Scoreboard</h2>
    <table>
      <caption>Top 10 Players</caption>
      <thead><tr><th>#</th><th>Player</th><th>Score</th><th>Questions</th></tr></thead>
      <tbody id="scores-body"></tbody>
    </table>
  </section>
</main>

<script type="module">
const API = '/api';
let lang = 'en';
let sessionId = null;
let caseData = null;
let selectedSuspect = null;
const histories = {}; // per suspectId [{q,a},...]

function setLang(newLang) {
  lang = newLang;
  document.documentElement.lang = newLang === 'pt' ? 'pt-BR' : 'en';
  document.getElementById('len').setAttribute('aria-pressed', newLang === 'en');
  document.getElementById('lpt').setAttribute('aria-pressed', newLang === 'pt');
  renderCase();
  renderAccuseButtons();
  renderConversation();
  document.getElementById('question-label').textContent = newLang === 'pt' ? 'Pergunta' : 'Question';
  document.getElementById('ask-btn').textContent = newLang === 'pt' ? 'Perguntar' : 'Ask';
  document.getElementById('player-label').textContent = newLang === 'pt' ? 'Seu nome' : 'Your name';
  document.getElementById('suspects-title').textContent = newLang === 'pt' ? 'Suspeitos' : 'Suspects';
  document.getElementById('conversation-title').textContent = newLang === 'pt' ? 'Conversa' : 'Conversation';
  document.getElementById('accuse-title').textContent = newLang === 'pt' ? 'Acusar' : 'Accuse';
  document.getElementById('title').textContent = newLang === 'pt' ? 'Mistério FullCup' : 'FullCup Mystery';
}

document.getElementById('len').addEventListener('click',()=>setLang('en'));
document.getElementById('lpt').addEventListener('click',()=>setLang('pt'));

async function init() {
  const sessRes = await fetch(API + '/session', {method:'POST'});
  const sessData = await sessRes.json();
  sessionId = sessData.sessionId;
  await loadCase();
  setLang('en');
}
async function loadCase() {
  const res = await fetch(API + '/case?lang=' + lang);
  caseData = await res.json();
}
function renderCase() {
  if (!caseData) return;
  document.getElementById('intro').innerHTML = `<p>${caseData.intro}</p>`;
  const btnContainer = document.getElementById('suspect-buttons');
  btnContainer.innerHTML = '';
  caseData.suspects.forEach(s => {
    const btn = document.createElement('button');
    btn.textContent = s.name;
    btn.dataset.id = s.id;
    btn.setAttribute('aria-pressed','false');
    btn.addEventListener('click',()=>selectSuspect(s.id));
    btnContainer.appendChild(btn);
  });
}
function selectSuspect(id) {
  selectedSuspect = id;
  document.querySelectorAll('#suspect-buttons button').forEach(b=>{
    b.setAttribute('aria-pressed', b.dataset.id===id ? 'true':'false');
  });
  document.getElementById('q').focus();
  renderConversation();
}
function renderConversation() {
  const log = document.getElementById('log');
  log.innerHTML = '';
  if (!selectedSuspect) return;
  const hist = histories[selectedSuspect] || [];
  hist.forEach(pair=>{
    const pQ = document.createElement('p');
    pQ.textContent = (lang==='pt'?'Pergunta: ':'Q: ') + pair.q;
    const pA = document.createElement('p');
    pA.textContent = (lang==='pt'?'Resposta: ':'A: ') + pair.a;
    log.appendChild(pQ);
    log.appendChild(pA);
  });
}
async function askQuestion(e){
  e.preventDefault();
  if (!selectedSuspect) return;
  const question = document.getElementById('q').value.trim();
  if (!question) return;
  document.getElementById('ask-btn').disabled = true;
  const log = document.getElementById('log');
  const thinking = document.createElement('p');
  thinking.textContent = '…thinking';
  log.appendChild(thinking);
  try{
    const res = await fetch(API + '/ask', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId, suspectId:selectedSuspect, question, lang})
    });
    const data = await res.json();
    if (!res.ok) throw data;
    const answer = data.answer;
    // store
    if (!histories[selectedSuspect]) histories[selectedSuspect]=[];
    histories[selectedSuspect].push({q:question,a:answer});
    renderConversation();
  }catch(err){
    showError(err.message||'Error');
  }finally{
    document.getElementById('ask-btn').disabled = false;
    document.getElementById('q').value = '';
  }
}
async function accuse(suspectId){
  const playerName = document.getElementById('player').value.trim()||'anon';
  try{
    const res = await fetch(API + '/accuse', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({sessionId, suspectId, player:playerName, lang})
    });
    const data = await res.json();
    if (!res.ok) throw data;
    const verdict = document.getElementById('verdict');
    verdict.hidden = false;
    verdict.innerHTML = `<p>${data.correct ? (lang==='pt'?'Acerto!':'Correct!') : (lang==='pt'?'Errou!':'Wrong!')}</p>
      <p>${lang==='pt'?'Culprit':'Culprit'}: ${data.culpritName}</p>
      <p>${lang==='pt'?'Solution':'Solution'}: ${data.solution}</p>
      <p>${lang==='pt'?'Score':'Score'}: ${data.score}</p>`;
    verdict.focus();
    await loadScores();
  }catch(err){
    showError(err.message||'Error');
  }
}
function renderAccuseButtons(){
  if (!caseData) return;
  const container = document.getElementById('accuse-buttons');
  container.innerHTML = '';
  caseData.suspects.forEach(s=>{
    const btn = document.createElement('button');
    btn.textContent = (lang==='pt'?'Acusar ':'Accuse ') + s.name;
    btn.addEventListener('click',()=>accuse(s.id));
    container.appendChild(btn);
  });
}
async function loadScores(){
  const sec = document.getElementById('scores-section');
  const tbody = document.getElementById('scores-body');
  const res = await fetch(API + '/scores');
  const data = await res.json();
  tbody.innerHTML = '';
  data.forEach((row,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${row.player}</td><td>${row.score}</td><td>${row.questions}</td>`;
    tbody.appendChild(tr);
  });
  sec.hidden = false;
}
function showError(msg){
  const el = document.getElementById('err');
  el.textContent = msg;
  el.hidden = false;
  setTimeout(()=>{el.hidden=true;},5000);
}
document.getElementById('ask-form').addEventListener('submit',askQuestion);
init();
</script>
</body>
</html>
<<<END>>>
# Test output
PASS tab-order
PASS suspect-select
PASS ask-question
FAIL history-per-suspect: Timeout
PASS lang-pt
PASS lang-en
PASS verdict-focus
PASS input-labels
PASS #err-alert
8 passed, 1 failed
(exit code 0)

The page is correct: #log shows only the selected suspect's history (2 <p> per Q/A pair), so after switching to suspect 2 and asking once there are 2 <p>, not 4. Fix history-per-suspect: after asking suspect 2, wait for >=2 <p> containing 'Did you see anything?'; switch back to suspect 1 and assert its earlier question is shown and suspect 2's is not; switch to suspect 2 again and assert its question is back. Also add checks: every button and input has an accessible name; the verdict region is focused after accusing; Escape or Tab never traps focus. Keep all other passing checks.
Output ONLY these files, complete: test/keyboard.mjs. Format <<<FILE path>>> ... <<<END>>>. If the page violates the stated a11y requirement fix the page; if the test is wrong fix the test. Start directly with <<<FILE.
