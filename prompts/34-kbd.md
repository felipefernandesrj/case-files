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

# Files already written by you
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

# Task
Write test/keyboard.mjs: a real keyboard + screen-reader test in headless Chrome driven over the Chrome DevTools Protocol with NO npm deps (spawn Chrome found at env CHROME or /usr/bin/google-chrome or /usr/bin/chromium with --headless=new --no-sandbox --remote-debugging-port=0 --user-data-dir=<tmp>; read the ws:// URL from stderr; get the page target from http://127.0.0.1:<port>/json/list; use global WebSocket; send Input.dispatchKeyEvent keyDown/keyUp for Tab and Enter (Enter keyDown with text '\r'); Runtime.evaluate to read state). If Chrome or WebSocket is missing print 'SKIP keyboard (no Chrome)' and exit 0. Start the app with createServer({mock:true, scoreFile:null}).listen(0). One line per check 'PASS <name>' / 'FAIL <name>: reason', final 'N passed, M failed', exit 1 on failure, always kill Chrome and close the server. Checks (>=8): Tab order reaches len, lpt, the 3 suspect buttons, q, Ask, player, then 3 accuse buttons, each with a computed outline-style not 'none'; Enter on a suspect sets aria-pressed=true and moves focus to #q; typing a question (Input.insertText) and Enter adds the Q and A to #log (role=log, aria-live=polite); switching suspect and back keeps each suspect's history; Enter on lpt sets aria-pressed, html lang 'pt-BR' and PT labels, Enter on len restores EN; Enter on an accuse button fills #verdict (role=status) and focus moves to #verdict; every input has an associated label; #err exists with role=alert. Read suspect ids from content/case.json, never hardcode. Also update package.json test script to: node test/e2e.mjs && node test/keyboard.mjs
Output only the requested files, complete. Never output content/case.json.
