# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Feature spec v2 (M1 parity). Node 20+, ES modules, ZERO npm deps.

## Case data: content/case.json
{id,title{en,pt},intro{en,pt},culprit,
 suspects:[{id,name,role{en,pt},persona{en,pt},facts:string (English private role-play instructions)}],
 clues:[{id,from:suspectId,ask:string (EN example question that reveals it),keywords:[lowercase EN+PT words that trigger it],implicates:suspectId|null,clears:suspectId|null,text{en,pt}}],
 glossary:[{en,pt}] (fixed PT-BR translations of key nouns; the role-play prompt in PT must enforce them),
 solution{en,pt}}

## Modules (exact exports)
- src/case.js: loadCase(file='content/case.json') -> case object; publicCase(c, lang) -> {id,title,intro,suspects:[{id,name,role,persona}]} (strings in lang, NEVER facts/culprit/solution/clues); fairPlay(c) -> {ok:boolean, reasons:[string]}: ok only if there are exactly 3 suspects, culprit is a suspect id, at least 2 clues implicate the culprit, every innocent is cleared by at least one clue, every clue.from is a suspect id, and every clue has non-empty ask, keywords, text.en, text.pt. systemPrompt(c, suspectId, lang) -> string: in character, uses facts and that suspect's clues (reveal a clue's text when the question touches it), never confess outright, reply in the language (PT-BR when lang=pt, with "Use these exact PT-BR terms:" + glossary lines; EN prompt has no glossary), max 80 words. capWords(text, n=80) -> text trimmed to at most n words (ending with "…" when cut).
- src/proxy.js: createProxy({key, baseUrl, fetchImpl=fetch, model='@cf/meta/llama-4-scout-17b-16e-instruct'}) -> {chat(messages) -> Promise<string>}. POST {baseUrl}/chat/completions, Authorization Bearer, header X-FullCup-Workload: case-files:play. Errors throw an Error with .code: 402 -> 'no_capacity'; 429 whose body (error.code or message or raw text) contains 'capacity:empty' -> 'no_capacity'; other 429 -> 'rate_limited'; 401/403 -> 'bad_key'; anything else -> 'upstream'. Never include the key in errors or logs.
- src/mock.js: mockAnswer(c, suspectId, question, lang) -> deterministic in-character string in lang; if the question matches a clue's keywords (case-insensitive) for that suspect, the answer includes that clue's text[lang]. No network.
- src/messages.js: friendly(code, lang) -> short friendly sentence EN/PT for no_capacity ("this Cup is out of capacity, backers can refill it"), rate_limited (try again in a moment), bad_key (game key not configured or invalid, the creator was notified), upstream, bad_request.
- src/scoreboard.js: scoreFor(correct, questions) = correct ? max(10, 100 - 5*max(0, questions-3)) : 0. createScoreboard(file|null) -> {add({player,score,questions,correct,lang,at}), top(n=10)}; sorted by score desc, then fewer questions, then earlier at; keeps 100; persists JSON to file if file is set (create dir). Default file data/scores.json.
- src/server.js: export createServer({caseFile, scoreFile='data/scores.json', key, baseUrl, fetchImpl, mock}) returning an http.Server (not listening). If run directly (import.meta.url is the entry), listen on PORT||3000 and print the URL. Key from opts.key, else env FULLCUP_KEY, else file .fullcup-key; mock = opts.mock ?? (env MOCK==='1' || no key). Routes (JSON; lang from body.lang or ?lang, default en):
  GET / -> public/index.html. GET /api/status -> {mode:'mock'|'live', caseId}. GET /api/case -> publicCase. POST /api/session -> {sessionId} (random). POST /api/ask {sessionId,suspectId,question,lang} -> {answer, questions:<count for session>}; per-session per-suspect history kept on the server and sent to the model as prior turns; answer passed through capWords(…,80). POST /api/accuse {sessionId,suspectId,player,lang} -> {correct,culprit,culpritName,solution,score,questions}; adds to scoreboard (player default 'anon', max 24 chars); second accuse in same session -> 409. GET /api/scores -> top 10.
  Validation -> 400 {error:'bad_request',message}: unknown suspect, empty/over-500-char question, unknown session. Proxy errors -> status 402 (no_capacity), 429 (rate_limited), 503 (bad_key), 502 (upstream) with {error:code, message:friendly(code,lang)}. Unhandled errors -> 500 JSON, never crash. Never send the key to the client.
- src/cli.js: terminal play: `node src/cli.js [--lang pt] [--player name]`; starts createServer on port 0, prints title, intro, suspects; commands `ask <id> <question>`, `accuse <id>`, `history <id>`, `quit` (PT aliases pergunta/acusar/historico/sair). Works with piped stdin (exit after accuse or EOF).

## Web page public/index.html (single file, inline CSS+JS)
- Language toggle: two buttons id="len" (EN) and id="lpt" (PT) with aria-pressed reflecting state; switching re-renders all UI text and the case; html lang attribute updated ("en"/"pt-BR").
- Suspects: a group of 3 buttons (data-id=suspect id), aria-pressed on the selected one; selecting moves focus to the question input id="q".
- Form: <label for="q">, input id="q", submit button "Ask"/"Perguntar"; Enter submits. Per-suspect conversation log (all previous Q&A for the selected suspect, persisted while switching suspects) in an element id="log" with role="log" aria-live="polite". While waiting show "…thinking" text and disable the button.
- Player name input id="player" with label. Accuse section id="acc" with 3 buttons "Accuse <name>"/"Acusar <name>". Verdict in id="verdict" role="status" aria-live="assertive", focus moves to it (tabindex=-1), shows correct/wrong, solution and score; then a scoreboard table (GET /api/scores) with caption.
- Errors (402/429/503/502) shown as the friendly message in a role="alert" element id="err".
- Visible focus outline on every interactive element (:focus-visible outline 3px). Tab order: len, lpt, 3 suspects, q, Ask, player, 3 accuse buttons. Good contrast, responsive.

# Current project files (written by you)
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
<<<FILE test/keyboard.mjs>>>
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from '../src/server.js';

// Helper to locate Chrome
function findChrome() {
  const envPath = process.env.CHROME;
  const candidates = [
    envPath,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return null;
}

// Exit early if no Chrome or WebSocket
if (!global.WebSocket || !findChrome()) {
  console.log('SKIP keyboard (no Chrome)');
  process.exit(0);
}

// Load case to get suspect IDs
const caseData = JSON.parse(fs.readFileSync(path.resolve('content/case.json'), 'utf8'));
const suspectIds = caseData.suspects.map(s => s.id);

// Start the app server
const app = createServer({ mock: true, scoreFile: null });
const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

// Launch Chrome
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const chromePath = findChrome();
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--remote-debugging-port=9222',
  `--user-data-dir=${userDataDir}`,
  `${baseUrl}/`,
]);

function waitFor(condition, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      if (condition()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('Timeout'));
      setTimeout(check, 100);
    })();
  });
}

// Wait for Chrome DevTools to be ready and obtain wsUrl
const dbgPort = 9222;
await waitFor(async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${dbgPort}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}, 10000);

const versionRes = await fetch(`http://127.0.0.1:${dbgPort}/json/version`);
const versionData = await versionRes.json();
const wsUrl = versionData.webSocketDebuggerUrl;

// Get page target id, waiting until it appears
async function getPageTargetId() {
  const timeout = 10000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${dbgPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const target = list.find(t => t.type === 'page' && t.url.startsWith(baseUrl));
        if (target && target.id) return target.id;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Page target not found');
}
const targetId = await getPageTargetId();

// Connect to CDP
const ws = new WebSocket(`${wsUrl}/devtools/page/${targetId}`);

// Ensure WebSocket is open before sending any commands
if (ws.readyState !== WebSocket.OPEN) {
  await new Promise(resolve => ws.addEventListener('open', resolve));
}

let msgId = 1;
const pending = new Map();
ws.addEventListener('message', data => {
  const msg = JSON.parse(data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expr) {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (res.exceptionDetails) throw new Error('Eval error');
  return res.result.value;
}

// Enable domains
await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
await send('Input.enable');

// Wait for page load
await waitFor(async () => {
  const ready = await evaluate('document.readyState');
  return ready === 'complete';
}, 10000);

// Helper to dispatch key events
async function pressKey(key, code, vk, text = undefined) {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    windowsVirtualKeyCode: vk,
    key,
    code,
    ...(text !== undefined ? { text, unmodifiedText: text } : {})
  });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, key, code });
}

// Helper to press Tab
async function pressTab() {
  await pressKey('Tab', 'Tab', 9);
}

// Helper to press Enter
async function pressEnter() {
  await pressKey('Enter', 'Enter', 13, '\r');
}

// Helper to insert text
async function insertText(txt) {
  await send('Input.insertText', { text: txt });
}

// Helper to get active element identifier
async function activeId() {
  return await evaluate(`(function(){
    const el=document.activeElement;
    if(el.id) return el.id;
    const acc=document.querySelectorAll('#accuse-buttons button');
    for(let i=0;i<acc.length;i++) if(el===acc[i]) return 'accuse-'+i;
    return el.tagName;
  })()`);
}

// Helper to get computed outline style
async function outlineNotNone(id) {
  return await evaluate(`(function(){
    const el=document.getElementById('${id}');
    if(!el) return false;
    const style=getComputedStyle(el);
    return style.outlineStyle !== 'none';
  })()`);
}

// Result tracking
let passed = 0;
let failed = 0;
function pass(name) {
  console.log(`PASS ${name}`);
  passed++;
}
function fail(name, reason) {
  console.log(`FAIL ${name}: ${reason}`);
  failed++;
}

// 1. Tab order and outline
const expectedOrder = ['len', 'lpt', ...suspectIds, 'q', 'ask-btn', 'player'];
// after player, accuse buttons (no ids) will be 'accuse-0' etc.
const accuseCount = 3;
for (let i = 0; i < accuseCount; i++) expectedOrder.push(`accuse-${i}`);

let orderOk = true;
for (let i = 0; i < expectedOrder.length; i++) {
  // press Tab except for first element (focus starts on body)
  await pressTab();
  const cur = await activeId();
  if (cur !== expectedOrder[i]) {
    orderOk = false;
    fail('tab-order', `expected ${expectedOrder[i]}, got ${cur} at position ${i}`);
    break;
  }
  // check outline (skip accuse buttons which have no id)
  const id = cur.startsWith('accuse-') ? null : cur;
  if (id) {
    const ok = await outlineNotNone(id);
    if (!ok) {
      orderOk = false;
      fail('outline-visible', `${id} has no outline`);
      break;
    }
  }
}
if (orderOk) pass('tab-order');

// 2. Enter on suspect selects it and moves focus to #q
for (const sid of suspectIds) {
  // focus suspect button
  await evaluate(`document.getElementById('${sid}').focus()`);
  await pressEnter();
  const pressed = await evaluate(`document.getElementById('${sid}').getAttribute('aria-pressed')`);
  const focus = await evaluate(`document.activeElement.id`);
  if (pressed !== 'true') {
    fail('suspect-select', `aria-pressed not true for ${sid}`);
  } else if (focus !== 'q') {
    fail('suspect-focus', `focus not moved to q after selecting ${sid}`);
  } else {
    pass(`suspect-select-${sid}`);
  }
  break; // test first suspect only
}

// 3. Ask a question and verify log updates
await evaluate(`document.getElementById('q').focus()`);
await insertText('What is your alibi?');
await pressEnter();

// wait for log to contain at least two <p> (question + answer)
await waitFor(async () => {
  const count = await evaluate(`document.querySelectorAll('#log p').length`);
  return count >= 2;
}, 5000);
const logText = await evaluate(`document.getElementById('log').innerText`);
if (logText.includes('What is your alibi?')) {
  pass('ask-question');
} else {
  fail('ask-question', 'question not logged');
}

// 4. Switching suspects retains history
// Assume first suspect already has one entry, switch to second suspect
const secondSuspect = suspectIds[1];
await evaluate(`document.getElementById('${secondSuspect}').focus()`);
await pressEnter();
await evaluate(`document.getElementById('q').focus()`);
await insertText('Did you see anything?');
await pressEnter();
await waitFor(async () => {
  const cnt = await evaluate(`document.querySelectorAll('#log p').length`);
  return cnt >= 2;
}, 5000);
// Switch back to first suspect
await evaluate(`document.getElementById('${suspectIds[0]}').focus()`);
await pressEnter();
const firstLog = await evaluate(`document.getElementById('log').innerText`);
if (firstLog.includes('What is your alibi?') && !firstLog.includes('Did you see anything?')) {
  pass('history-per-suspect');
} else {
  fail('history-per-suspect', 'history not preserved per suspect');
}

// 5. Language toggle with Enter on lpt and len
// Switch to PT
await evaluate(`document.getElementById('lpt').focus()`);
await pressEnter();
let langAttr = await evaluate(`document.documentElement.lang`);
let qLabel = await evaluate(`document.getElementById('question-label').textContent`);
if (langAttr !== 'pt-BR' || qLabel !== 'Pergunta') {
  fail('lang-pt', `lang=${langAttr}, label=${qLabel}`);
} else {
  pass('lang-pt');
}

// Switch back to EN
await evaluate(`document.getElementById('len').focus()`);
await pressEnter();
langAttr = await evaluate(`document.documentElement.lang`);
qLabel = await evaluate(`document.getElementById('question-label').textContent`);
if (langAttr !== 'en' || qLabel !== 'Question') {
  fail('lang-en', `lang=${langAttr}, label=${qLabel}`);
} else {
  pass('lang-en');
}

// 6. Accuse button fills verdict and focuses it
await evaluate(`document.getElementById('player').value = ''`);
await evaluate(`document.getElementById('player').focus()`);
await pressEnter(); // no effect, just ensure focus
await evaluate(`document.querySelectorAll('#accuse-buttons button')[0].focus()`);
await pressEnter();
await waitFor(async () => {
  const hidden = await evaluate(`document.getElementById('verdict').hidden`);
  return hidden === false;
}, 5000);
const verdictFocused = await evaluate(`document.activeElement.id`);
if (verdictFocused !== 'verdict') {
  fail('verdict-focus', `focus is on ${verdictFocused}`);
} else {
  pass('verdict-focus');
}

// 7. Every input has an associated label
const inputs = await evaluate(`Array.from(document.querySelectorAll('input')).map(i=>i.id)`);
let allLabeled = true;
for (const inp of inputs) {
  const hasLabel = await evaluate(`document.querySelector('label[for="${inp}"]') !== null`);
  if (!hasLabel) {
    allLabeled = false;
    fail('input-label', `input ${inp} missing label`);
    break;
  }
}
if (allLabeled) pass('input-labels');

// 8. #err exists with role=alert
const errExists = await evaluate(`document.getElementById('err') !== null`);
const errRole = await evaluate(`document.getElementById('err')?.getAttribute('role')`);
if (errExists && errRole === 'alert') {
  pass('#err-alert');
} else {
  fail('#err-alert', `exists=${errExists}, role=${errRole}`);
}

// Summary
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Cleanup
ws.close();
chrome.kill();
fs.rmSync(userDataDir, { recursive: true, force: true });
server.close();
<<<END>>>

# Test output
file:///workspace/case-files/test/keyboard.mjs:97
  throw new Error('Page target not found');
        ^

Error: Page target not found
    at getPageTargetId (file:///workspace/case-files/test/keyboard.mjs:97:9)
    at async file:///workspace/case-files/test/keyboard.mjs:99:18

Node.js v24.22.1

# Task
Fix the bug(s). Output ONLY the files you change, full content, OR for small changes literal edits in this format: <<<REPLACE path>>> newline, exact old text, newline, =====, newline, new text, newline, <<<END>>> (old text is replaced at every occurrence). Never output content/case.json (it is real data, do not touch).
Spec reminder: tests must follow the spec; if the test is wrong fix the test, if the code is wrong fix the code. Start your reply directly with <<<FILE. No analysis text.
