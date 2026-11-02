# Product: Case Files, bilingual (EN / PT-BR) browser detective game.
## Web page public/index.html (single file, inline CSS+JS)
- Language toggle: two buttons id="len" (EN) and id="lpt" (PT) with aria-pressed reflecting state; switching re-renders all UI text and the case; html lang attribute updated ("en"/"pt-BR").
- Suspects: a group of 3 buttons (data-id=suspect id), aria-pressed on the selected one; selecting moves focus to the question input id="q".
- Form: <label for="q">, input id="q", submit button "Ask"/"Perguntar"; Enter submits. Per-suspect conversation log (all previous Q&A for the selected suspect, persisted while switching suspects) in an element id="log" with role="log" aria-live="polite". While waiting show "…thinking" text and disable the button.
- Player name input id="player" with label. Accuse section id="acc" with 3 buttons "Accuse <name>"/"Acusar <name>". Verdict in id="verdict" role="status" aria-live="assertive", focus moves to it (tabindex=-1), shows correct/wrong, solution and score; then a scoreboard table (GET /api/scores) with caption.
- Errors (402/429/503/502) shown as the friendly message in a role="alert" element id="err".
- Visible focus outline on every interactive element (:focus-visible outline 3px). Tab order: len, lpt, 3 suspects, q, Ask, player, 3 accuse buttons. Good contrast, responsive.

# Sprint 4 feature spec: closing screen with backer credits
- New data file data/credits.json: {"example": true, "note": "Example data. Replace with real backer names before release.", "title": {"en": "Thanks to the backers", "pt": "Obrigado aos apoiadores"}, "backers": ["Backer 1", "Backer 2", "Backer 3"]}.
- src/server.js: new route GET /api/credits -> 200 JSON {title (string in lang, from ?lang, default en), backers:[string], example:boolean}. createServer gets a new option creditsFile (default 'data/credits.json', resolved from the project root like caseFile). If the file is missing or invalid JSON, return 200 {title (EN "Thanks to the backers" / PT "Obrigado aos apoiadores"), backers:[], example:false}; never crash. Everything else in server.js unchanged.
- public/index.html: after a verdict is shown (after the scoreboard loads), fetch GET /api/credits?lang=<lang> and show a closing screen: <section id="credits" aria-labelledby="credits-title" tabindex="-1"> containing <h2 id="credits-title"> with the title, a <ul id="credits-list"> with one <li> per backer, and, when example is true, a small note (EN "Example names", PT "Nomes de exemplo"). Keyboard focus moves to #credits after it renders (the verdict is still announced first because it is role=status aria-live=assertive). Switching language after the verdict re-renders the credits title/note in the new language. Hidden before the verdict.
- PT-BR UI strings (sprint 4): verdict labels Culpado/Solução/Pontuação, 'Você acertou!'/'Você errou!', '…pensando', scoreboard 'Placar', caption '10 melhores jogadores', headers Jogador/Pontos/Perguntas.

# Current files (written by you)
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

// 4. History isolation
await runStep('history-per-suspect', async () => {
  const s1 = suspectIds[0];
  const s2 = suspectIds[1];
  
  // 1. Ensure we are on S1 and it has history
  await evaluate(`document.querySelector('button[data-id="${s1}"]').focus()`);
  await pressEnter();
  
  // 2. Switch to S2 and ask
  await evaluate(`document.querySelector('button[data-id="${s2}"]').focus()`);
  await pressEnter();
  await evaluate(`document.getElementById('q').focus()`);
  await insertText('Did you see anything?');
  await pressEnter();
  await waitFor(async () => (await evaluate(`document.querySelectorAll('#log p').length`)) >= 2);
  const logS2 = await evaluate(`document.getElementById('log').innerText`);
  if (!logS2.includes('Did you see anything?')) throw new Error('S2 log missing');

  // 3. Switch to S1, check isolation
  await evaluate(`document.querySelector('button[data-id="${s1}"]').focus()`);
  await pressEnter();
  const logS1 = await evaluate(`document.getElementById('log').innerText`);
  if (!logS1.includes('What is your alibi?')) throw new Error('S1 history lost');
  if (logS1.includes('Did you see anything?')) throw new Error('S2 history leaked to S1');

  // 4. Switch back to S2, check persistence
  await evaluate(`document.querySelector('button[data-id="${s2}"]').focus()`);
  await pressEnter();
  const logS2Back = await evaluate(`document.getElementById('log').innerText`);
  if (!logS2Back.includes('Did you see anything?')) throw new Error('S2 history lost');
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

// 7. Accessibility: Names
await runStep('accessible-names', async () => {
  const missing = await evaluate(`(() => {
    const errs = [];
    document.querySelectorAll('button').forEach(b => {
      if (!b.innerText.trim() && !b.getAttribute('aria-label')) errs.push('button');
    });
    document.querySelectorAll('input').forEach(i => {
      const l = document.querySelector('label[for="' + i.id + '"]');
      if (!l && !i.getAttribute('aria-label')) errs.push('input');
    });
    return errs.length > 0 ? errs[0] : null;
  })()`);
  if (missing) throw new Error(`${missing} missing accessible name`);
});

// 8. Accessibility: No Focus Trap
await runStep('no-focus-trap', async () => {
  await evaluate(`document.getElementById('player').focus()`);
  for(let i=0; i<10; i++) {
    const before = await activeId();
    await pressTab();
    const after = await activeId();
    if (before === after) throw new Error('Focus trapped');
  }
});

// 9. Error alert
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
  #credits{margin-top:2rem;padding:1rem;border-top:1px solid #ccc}
  #credits-note{font-style:italic;font-size:0.9rem;color:#555}
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
    <h2 id="scores-title">Scoreboard</h2>
    <table>
      <caption id="scores-caption">Top 10 Players</caption>
      <thead>
        <tr>
          <th>#</th>
          <th id="th-player">Player</th>
          <th id="th-score">Score</th>
          <th id="th-questions">Questions</th>
        </tr>
      </thead>
      <tbody id="scores-body"></tbody>
    </table>
  </section>

  <section id="credits" aria-labelledby="credits-title" tabindex="-1" hidden>
    <h2 id="credits-title"></h2>
    <ul id="credits-list"></ul>
    <p id="credits-note"></p>
  </section>
</main>

<script type="module">
const API = '/api';
let lang = 'en';
let sessionId = null;
let caseData = null;
let selectedSuspect = null;
let lastAccuseResult = null;
const histories = {}; // per suspectId [{q,a},...]

function setLang(newLang) {
  lang = newLang;
  document.documentElement.lang = newLang === 'pt' ? 'pt-BR' : 'en';
  document.getElementById('len').setAttribute('aria-pressed', newLang === 'en');
  document.getElementById('lpt').setAttribute('aria-pressed', newLang === 'pt');
  
  // Basic UI
  document.getElementById('question-label').textContent = newLang === 'pt' ? 'Pergunta' : 'Question';
  document.getElementById('ask-btn').textContent = newLang === 'pt' ? 'Perguntar' : 'Ask';
  document.getElementById('player-label').textContent = newLang === 'pt' ? 'Seu nome' : 'Your name';
  document.getElementById('suspects-title').textContent = newLang === 'pt' ? 'Suspeitos' : 'Suspects';
  document.getElementById('conversation-title').textContent = newLang === 'pt' ? 'Conversa' : 'Conversation';
  document.getElementById('accuse-title').textContent = newLang === 'pt' ? 'Acusar' : 'Accuse';
  document.getElementById('title').textContent = newLang === 'pt' ? 'Mistério FullCup' : 'FullCup Mystery';

  // Scoreboard
  document.getElementById('scores-title').textContent = newLang === 'pt' ? 'Placar' : 'Scoreboard';
  document.getElementById('scores-caption').textContent = newLang === 'pt' ? '10 melhores jogadores' : 'Top 10 Players';
  document.getElementById('th-player').textContent = newLang === 'pt' ? 'Jogador' : 'Player';
  document.getElementById('th-score').textContent = newLang === 'pt' ? 'Pontos' : 'Score';
  document.getElementById('th-questions').textContent = newLang === 'pt' ? 'Perguntas' : 'Questions';

  renderCase();
  renderAccuseButtons();
  renderConversation();
  if (lastAccuseResult) renderVerdict();
  if (!document.getElementById('credits').hidden) loadCredits();
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
  thinking.textContent = lang === 'pt' ? '…pensando' : '…thinking';
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
    lastAccuseResult = data;
    renderVerdict();
    await loadScores();
    await loadCredits();
  }catch(err){
    showError(err.message||'Error');
  }
}

function renderVerdict() {
  if (!lastAccuseResult) return;
  const verdict = document.getElementById('verdict');
  verdict.hidden = false;
  const { correct, culpritName, solution, score } = lastAccuseResult;
  verdict.innerHTML = `
    <p>${correct ? (lang==='pt'?'Você acertou!':'Correct!') : (lang==='pt'?'Você errou!':'Wrong!')}</p>
    <p>${lang==='pt'?'Culpado':'Culprit'}: ${culpritName}</p>
    <p>${lang==='pt'?'Solução':'Solution'}: ${solution}</p>
    <p>${lang==='pt'?'Pontuação':'Score'}: ${score}</p>`;
  verdict.focus();
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

async function loadCredits() {
  try {
    const res = await fetch(API + '/credits?lang=' + lang);
    const data = await res.json();
    const section = document.getElementById('credits');
    const title = document.getElementById('credits-title');
    const list = document.getElementById('credits-list');
    const note = document.getElementById('credits-note');

    title.textContent = data.title;
    list.innerHTML = '';
    data.backers.forEach(name => {
      const li = document.createElement('li');
      li.textContent = name;
      list.appendChild(li);
    });

    if (data.example) {
      note.textContent = lang === 'pt' ? 'Nomes de exemplo' : 'Example names';
      note.hidden = false;
    } else {
      note.hidden = true;
    }

    section.hidden = false;
    section.focus();
  } catch (e) {
    console.error('Credits error:', e);
  }
}

function showError(msg){
  const el = document.getElementById('err');
  el.textContent = msg || (lang === 'pt' ? 'Erro' : 'Error');
  el.hidden = false;
  setTimeout(()=>{el.hidden=true;},5000);
}

document.getElementById('ask-form').addEventListener('submit',askQuestion);
init();
</script>
</body>
</html>
<<<END>>>

# Current test output
PASS tab-order
PASS suspect-select
PASS ask-question
PASS history-per-suspect
PASS lang-pt
PASS lang-en
FAIL verdict-focus: focus fail, got credits
PASS accessible-names
PASS no-focus-trap
PASS #err-alert
9 passed, 1 failed

# Task: update test/keyboard.mjs only (the CDP keyboard/screen-reader test)
The spec changed: after the verdict, focus now ends on the closing credits screen (#credits), so 'verdict-focus' must change. Requirements for the test (keep all other existing steps as they are, keep pass/fail output format and the final "N passed, M failed" line):
1. Replace 'verdict-focus' with 'verdict-then-credits': after accusing via keyboard, wait until #verdict is visible (role=status, aria-live=assertive) and #credits is visible; then document.activeElement.id must be 'credits'.
2. New step 'credits-a11y': #credits has aria-labelledby="credits-title"; #credits-title is an H2 with text "Thanks to the backers"; #credits-list has exactly 3 LI items "Backer 1","Backer 2","Backer 3" (read data/credits.json from disk to get expected names and title); an example note with text "Example names" is visible.
3. New step 'credits-pt': focus #lpt and press Enter (keyboard). Then wait until #credits-title text is "Obrigado aos apoiadores"; check note "Nomes de exemplo"; #verdict text contains "Culpado"; #scores-caption text is "10 melhores jogadores"; and document.activeElement.id is still 'lpt' (switching language must not steal focus).
4. New step 'case-pt': while in PT, #intro text equals the "pt" intro from content/case.json (the case text must switch language too). Then switch back to EN with the keyboard (#len, Enter) and check #intro equals the "en" intro.
Use waitFor with async conditions (it already awaits fn()). Do not change the page.
Output ONLY literal edits, one block per change (old text must be an exact, unique substring of test/keyboard.mjs):
<<<REPLACE test/keyboard.mjs>>>
exact old text
=====
new text
<<<END>>>
No prose. Start directly with <<<REPLACE.
