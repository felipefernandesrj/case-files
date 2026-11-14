Patch public/index.html only. Output exactly nine REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE public/index.html>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a gothic-noir detective game (one HTML page with an inline module script). New feature: an arcade style CONTINUE countdown after a wrong verdict. It counts 9 to 0 (one step per second), the player can try the same case again (Enter or Space on the focused Try again button) or give up (Give up button or Escape). At the end (or on give up) it shows GAME OVER with the culprit and solution, and a Close button (Escape also closes). It never shows after a correct verdict and is cleared by Start over and by opening another file. While the countdown runs, the wrong verdict hides the culprit and solution lines (they come back at GAME OVER). Also a bug fix: Start over and a ?case= link created the server session without the case id, so the session played the default file (accusing a Night Train suspect failed with "unknown suspect"); both now post the case id. Existing globals: lang ('en' or 'pt'), lastAccuseResult, openFile, LABELS.

Block 1. Old text (exact, one line):
<div id="toasts" class="toasts" role="status" aria-live="polite"></div>
New text:
BEGIN
<div id="toasts" class="toasts" role="status" aria-live="polite"></div>
<div id="continue" class="continue" role="group" aria-labelledby="continue-title" hidden>
  <p id="continue-title" class="continue-title">CONTINUE?</p>
  <p id="continue-num" class="continue-num" aria-hidden="true">9</p>
  <p id="continue-note" class="continue-note"></p>
  <div class="continue-actions">
    <button id="continue-yes" type="button">Try again</button>
    <button id="continue-no" type="button">Give up</button>
    <button id="continue-close" type="button" hidden>Close</button>
  </div>
</div>
<p id="continue-live" class="continue-live" aria-live="polite"></p>
FINISH

Block 2. Old text (exact, four lines):
    renderVerdict(true);
    setGameOver(true);
    await loadScores();
    await loadCredits(true);
New text:
BEGIN
    if (!data.correct) startContinue();
    renderVerdict(!!data.correct);
    setGameOver(true);
    await loadScores();
    await loadCredits(!!data.correct);
FINISH

Block 3. Old text (exact, four lines):
  verdict.appendChild(p1);
  verdict.appendChild(p2);
  verdict.appendChild(p3);
  verdict.appendChild(p4);
New text:
BEGIN
  verdict.appendChild(p1);
  if (correct || contState !== 'run') {
    verdict.appendChild(p2);
    verdict.appendChild(p3);
  }
  verdict.appendChild(p4);
FINISH

Block 4. Old text (exact, three lines):
async function restartGame(){
  if (!confirm(LABELS[lang].confirmRestart)) return;
  const sessRes = await fetch(API + '/session', {method:'POST'});
New text:
BEGIN
async function restartGame(skipConfirm = false){
  if (!skipConfirm && !confirm(LABELS[lang].confirmRestart)) return;
  stopContinue();
  const sessRes = await fetch(API + '/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ case: openFile })});
FINISH

Block 5. Old text (exact, one line):
document.getElementById('restart-btn').addEventListener('click', restartGame);
New text:
BEGIN
document.getElementById('restart-btn').addEventListener('click', () => restartGame());
document.getElementById('continue-yes').addEventListener('click', continueGame);
document.getElementById('continue-no').addEventListener('click', () => { if (contState === 'run') endContinue(); });
document.getElementById('continue-close').addEventListener('click', closeContinue);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || contState === 'off') return;
  e.preventDefault();
  if (contState === 'run') endContinue();
  else closeContinue();
});
FINISH

Block 6. Old text (exact, one line):
async function openPackFile(id) {
New text:
BEGIN
async function openPackFile(id) {
  stopContinue();
FINISH

Block 7. Old text (exact, two lines):
  relabelToasts();
  if (lastAccuseResult) renderVerdict(false);
New text:
BEGIN
  relabelToasts();
  renderContinue();
  if (lastAccuseResult) renderVerdict(false);
FINISH

Block 8. Old text (exact, three lines):
async function init() {
  const sessRes = await fetch(API + '/session', {method:'POST'});
  const sessData = await sessRes.json();
New text:
BEGIN
async function init() {
  const askedCase = new URLSearchParams(location.search).get('case') || '';
  const sessRes = await fetch(API + '/session', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ case: askedCase })});
  const sessData = await sessRes.json();
FINISH

Block 9. Old text (exact, one line):
function relabelToasts() {
New text (new top-level code at column 0, 2 spaces per indent level, then the same old line unchanged):
BEGIN
const CONT_FROM = 9;
let contTimer = null;
let contLeft = 0;
let contState = 'off';
function contLabels() {
  return lang === 'pt'
    ? { title: 'CONTINUAR?', yes: 'Tentar de novo', no: 'Desistir', close: 'Fechar', over: 'FIM DE JOGO', lost: 'O culpado escapou. Use Nova partida para reabrir o caso.', say: 'Continuar? Você tem 10 segundos. Enter tenta o caso de novo, Esc desiste.' }
    : { title: 'CONTINUE?', yes: 'Try again', no: 'Give up', close: 'Close', over: 'GAME OVER', lost: 'The culprit got away. Use Start over to reopen the case.', say: 'Continue? You have 10 seconds. Enter tries the case again, Escape gives up.' };
}
function renderContinue() {
  const box = document.getElementById('continue');
  if (!box) return;
  const L = contLabels();
  box.hidden = contState === 'off';
  box.className = contState === 'over' ? 'continue is-over' : 'continue';
  document.getElementById('continue-title').textContent = contState === 'over' ? L.over : L.title;
  const num = document.getElementById('continue-num');
  num.hidden = contState !== 'run';
  num.textContent = contState === 'run' ? String(contLeft) : '';
  document.getElementById('continue-note').textContent = contState === 'over' ? L.lost : '';
  const yes = document.getElementById('continue-yes');
  const no = document.getElementById('continue-no');
  const close = document.getElementById('continue-close');
  yes.textContent = L.yes;
  yes.hidden = contState !== 'run';
  no.textContent = L.no;
  no.hidden = contState !== 'run';
  close.textContent = L.close;
  close.hidden = contState !== 'over';
}
function contSay(text) {
  const live = document.getElementById('continue-live');
  if (live) live.textContent = text;
}
function startContinue() {
  if (contTimer) clearInterval(contTimer);
  contState = 'run';
  contLeft = CONT_FROM;
  renderContinue();
  contSay(contLabels().say);
  contTimer = setInterval(() => {
    contLeft -= 1;
    if (contLeft < 0) {
      endContinue();
      return;
    }
    renderContinue();
    const num = document.getElementById('continue-num');
    num.classList.remove('tick');
    void num.offsetWidth;
    num.classList.add('tick');
  }, 1000);
  document.getElementById('continue-yes').focus();
}
function endContinue() {
  if (contTimer) clearInterval(contTimer);
  contTimer = null;
  contState = 'over';
  contLeft = 0;
  renderContinue();
  if (lastAccuseResult) renderVerdict(false);
  const L = contLabels();
  contSay(L.over + '. ' + L.lost);
  document.getElementById('continue-close').focus();
}
function stopContinue() {
  if (contTimer) clearInterval(contTimer);
  contTimer = null;
  contState = 'off';
  contLeft = 0;
  renderContinue();
  contSay('');
}
function closeContinue() {
  stopContinue();
  document.getElementById('restart-btn').focus();
}
function continueGame() {
  if (contState !== 'run') return;
  stopContinue();
  restartGame(true);
}
function relabelToasts() {
FINISH
