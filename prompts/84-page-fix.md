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

# Current file (written by you)
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

  await loadCase();
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
    // Use a timeout so the verdict focus happens first
    setTimeout(loadCredits, 50);
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

# Errors from your last change
test/keyboard.mjs output:
FAIL unexpected: Timeout
node --check on the page's inline module script:
/tmp/page.mjs:32
  await loadCase();
  ^^^^^

SyntaxError: Unexpected reserved word
    at checkSyntax (node:internal/main/check_syntax:84:5)

Node.js v24.22.1

# Task: fix public/index.html only
The inline script no longer parses, so the page never loads (keyboard test times out). Keep the intended behavior: switching language reloads the case in the new language and re-renders verdict/credits text without moving focus; an accusation moves focus to the verdict and then to #credits.
Output ONLY literal edits. Each block: exact old text copied from public/index.html, a line with exactly =====, then the new text:
<<<REPLACE public/index.html>>>
exact old text
=====
new text
<<<END>>>
At most 4 blocks. No prose. Start directly with <<<REPLACE.
