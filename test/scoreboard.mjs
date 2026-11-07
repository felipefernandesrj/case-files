import fs from 'fs';
import { createServer } from '../src/server.js';
import { 
  BEST_KEY, 
  readBest, 
  recordResult, 
  resetBest, 
  bestText, 
  questionsText, 
  LABELS 
} from '../public/best.js';

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    return { name, ok: true };
  } catch (err) {
    console.log(`FAIL ${name}: ${err.message}`);
    return { name, ok: false, error: err.message };
  }
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'Assertion failed');
}

function fakeStorage(initial = {}) {
  const data = { ...initial };
  let writes = 0;
  return {
    getItem: (k) => data[k] || null,
    setItem: (k, v) => { data[k] = v; writes++; },
    removeItem: (k) => { delete data[k]; },
    get writes() { return writes; }
  };
}

function throwingStorage() {
  return {
    getItem: () => { throw new Error('err'); },
    setItem: () => { throw new Error('err'); },
    removeItem: () => { throw new Error('err'); }
  };
}

async function run() {
  const results = [];
  const NOW = '2026-11-03T12:00:00Z';

  // 1. best is kept per language
  results.push(await test("best is kept per language", async () => {
    const s = fakeStorage();
    recordResult(s, 'en', { score: 90, questions: 5, correct: true }, NOW);
    recordResult(s, 'pt', { score: 70, questions: 9, correct: true }, NOW);
    const b = readBest(s);
    assert(b.en.score === 90, "en score mismatch");
    assert(b.pt.score === 70, "pt score mismatch");
    const stored = JSON.parse(s.getItem(BEST_KEY));
    assert(stored.en.score === 90 && stored.pt.score === 70, "stored JSON mismatch");
  }));

  // 2. higher score replaces, lower does not
  results.push(await test("higher score replaces, lower does not", async () => {
    const s = fakeStorage();
    let res = recordResult(s, 'en', { score: 80, questions: 7, correct: true }, NOW);
    assert(res.isNew === true, "80 should be new");
    res = recordResult(s, 'en', { score: 95, questions: 4, correct: true }, NOW);
    assert(res.isNew === true, "95 should be new");
    assert(readBest(s).en.score === 95, "95 score mismatch");
    assert(readBest(s).en.questions === 4, "95 questions mismatch");
    res = recordResult(s, 'en', { score: 60, questions: 2, correct: true }, NOW);
    assert(res.isNew === false, "60 should not be new");
    assert(readBest(s).en.score === 95, "score dropped to 60");
    assert(readBest(s).en.questions === 4, "questions dropped to 2");
  }));

  // 3. same score with fewer questions wins
  results.push(await test("same score with fewer questions wins", async () => {
    const s = fakeStorage();
    recordResult(s, 'en', { score: 100, questions: 3, correct: true }, NOW);
    let res = recordResult(s, 'en', { score: 100, questions: 2, correct: true }, NOW);
    assert(res.isNew === true, "100/2 should be new");
    assert(readBest(s).en.questions === 2, "questions should be 2");
    res = recordResult(s, 'en', { score: 100, questions: 2, correct: true }, NOW);
    assert(res.isNew === false, "100/2 again should not be new");
  }));

  // 4. wrong accusation never becomes best
  results.push(await test("wrong accusation never becomes best", async () => {
    const s = fakeStorage();
    const res = recordResult(s, 'pt', { score: 0, questions: 1, correct: false }, NOW);
    assert(res.isNew === false, "wrong result should not be new");
    assert(readBest(s).pt === null, "pt should remain null");
    assert(s.writes === 0, "writes should be 0");
  }));

  // 5. unknown language counts as English
  results.push(await test("unknown language counts as English", async () => {
    const s = fakeStorage();
    recordResult(s, 'fr', { score: 50, questions: 11, correct: true }, NOW);
    const b = readBest(s);
    assert(b.en.score === 50, "fr should map to en");
    assert(b.pt === null, "pt should be null");
  }));

  // 6. corrupt or missing storage never throws
  results.push(await test("corrupt or missing storage never throws", async () => {
    assert(JSON.stringify(readBest(null)) === '{"en":null,"pt":null}', "null storage");
    assert(JSON.stringify(readBest(throwingStorage())) === '{"en":null,"pt":null}', "throwing storage");
    assert(JSON.stringify(readBest(fakeStorage({[BEST_KEY]:'not json'}))) === '{"en":null,"pt":null}', "corrupt json");
    assert(JSON.stringify(readBest(fakeStorage({[BEST_KEY]:'null'}))) === '{"en":null,"pt":null}', "string null");
    assert(JSON.stringify(readBest(fakeStorage({[BEST_KEY]:JSON.stringify({en:{score:'x',questions:2,at:'t'}})}))) === '{"en":null,"pt":null}', "bad schema");

    const sErr = fakeStorage({[BEST_KEY]:JSON.stringify({en:{score:'x',questions:2,at:'t'}})});
    let res = recordResult(sErr, 'en', {score: 40, questions: 3, correct: true}, NOW);
    assert(res.isNew === true && res.best.score === 40, "should recover from bad schema");

    const { isNew, best } = recordResult(throwingStorage(), 'en', {score: 1, questions: 1, correct: true}, NOW); assert(isNew === true && best.score === 1);

    const sNull = fakeStorage({[BEST_KEY]:'null'});
    res = recordResult(sNull, 'en', {score: 40, questions: 3, correct: true}, NOW);
    assert(res.isNew === true && res.best.score === 40, "should handle 'null' string");
  }));

  // 7. reset clears both languages
  results.push(await test("reset clears both languages", async () => {
    const s = fakeStorage();
    recordResult(s, 'en', { score: 90, questions: 5, correct: true }, NOW);
    recordResult(s, 'pt', { score: 70, questions: 9, correct: true }, NOW);
    assert(resetBest(s) === true, "reset should return true");
    assert(readBest(s).en === null && readBest(s).pt === null, "reset failed to clear");
    assert(resetBest(throwingStorage()) === false, "throwing reset should be false");
    assert(resetBest(null) === false, "null reset should be false");
  }));

  // 8. texts EN and PT
  results.push(await test("texts EN and PT", async () => {
    assert(bestText('en', null) === "No best score yet in English.", "en null");
    assert(bestText('pt', null) === "Ainda sem recorde em português.", "pt null");
    assert(bestText('en', {score: 95, questions: 4, at: 't'}) === "Your best in English: 95 points with 4 questions.", "en entry");
    assert(bestText('en', {score: 95, questions: 1, at: 't'}) === "Your best in English: 95 points with 1 question.", "en single");
    assert(bestText('pt', {score: 95, questions: 4, at: 't'}) === "Seu recorde em português: 95 pontos com 4 perguntas.", "pt entry");
    assert(bestText('pt', {score: 95, questions: 1, at: 't'}) === "Seu recorde em português: 95 pontos com 1 pergunta.", "pt single");
    assert(questionsText('en', 3) === "Questions used: 3", "en q text");
    assert(questionsText('pt', 3) === "Perguntas feitas: 3", "pt q text");

    const allTexts = [
      LABELS.en.bestTitle, LABELS.en.reset, LABELS.en.confirm, LABELS.en.done, LABELS.en.kept,
      LABELS.pt.bestTitle, LABELS.pt.reset, LABELS.pt.confirm, LABELS.pt.done, LABELS.pt.kept
    ];
    for (const t of allTexts) {
      assert(t && t.length > 0 && !t.includes('—'), `Invalid text: ${t}`);
    }
    assert(LABELS.pt.reset !== LABELS.en.reset, "PT reset must differ from EN");
  }));

  // 9. server serves /best.js as JavaScript
  results.push(await test("server serves /best.js as JavaScript", async () => {
    const server = createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true });
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;
    try {
      const res = await fetch(`http://127.0.0.1:${port}/best.js`);
      assert(res.status === 200, "status 200");
      const contentType = res.headers.get('content-type');
      assert(contentType && contentType.includes('javascript'), `Wrong content-type: ${contentType}`);
      const text = await res.text();
      assert(text.includes('export function recordResult'), "body missing export");
    } finally {
      server.close();
    }
  }));

  // 10. page wires the personal scoreboard
  results.push(await test("page wires the personal scoreboard", async () => {
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert(html.includes("from '/best.js'"), "missing best.js import");
    assert(html.includes('id="best-section"'), "missing best-section");
    const bestSection = html.match(/<section id="best-section"[^>]*>/)[0];
    assert(!bestSection.includes('hidden'), "best-section should not be hidden");
    assert(bestSection.includes('aria-labelledby="best-title"'), "best-section missing aria-labelledby");
    assert(html.includes('id="reset-best"'), "missing reset-best button");
    assert(html.includes('id="questions-used"'), "missing questions-used");
    assert(html.includes('confirm('), "missing confirm()");
    assert(html.includes('localStorage'), "missing localStorage");
  }));

  // 11. best lines follow the UI language
  results.push(await test("best lines follow the UI language", async () => {
    assert(bestText('en', null, 'pt') === "Ainda sem recorde em inglês.", "pt ui, en empty");
    assert(bestText('pt', null, 'en') === "No best score yet in Portuguese.", "en ui, pt empty");
    assert(bestText('en', {score: 95, questions: 4, at: 't'}, 'pt') === "Seu recorde em inglês: 95 pontos com 4 perguntas.", "pt ui, en entry");
    assert(bestText('pt', {score: 90, questions: 1, at: 't'}, 'en') === "Your best in Portuguese: 90 points with 1 question.", "en ui, pt single");
    assert(bestText('pt', null, 'pt') === bestText('pt', null), "pt default ui");
    assert(LABELS.en.newBest === 'New personal best!', "en newBest");
    assert(LABELS.pt.newBest === 'Novo recorde pessoal!', "pt newBest");
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert(html.includes("bestText('en', b.en, lang)"), "page passes lang (en)");
    assert(html.includes("bestText('pt', b.pt, lang)"), "page passes lang (pt)");
    assert(html.includes("LABELS[lang].newBest"), "page announces new best");
  }));

  // 12. scoreboard shows player names as plain text
  results.push(await test("scoreboard shows player names as plain text", async () => {
    const html = fs.readFileSync('./public/index.html', 'utf8');
    const src = html.slice(html.indexOf('async function loadScores'), html.indexOf('async function loadCredits'));
    assert(src.length > 0, "loadScores not found");
    const made = [];
    function el() { return { children: [], textContent: '', hidden: true, sets: [], appendChild(c) { this.children.push(c); }, set innerHTML(v) { this.sets.push(v); this.children = []; }, get innerHTML() { return ''; } }; }
    const tbody = el();
    const sec = el();
    const fakeDoc = { getElementById: id => id === 'scores-body' ? tbody : sec, createElement: tag => { const e = el(); e.tag = tag; made.push(e); return e; } };
    const evil = '<img src=x onerror=alert(1)>';
    const fakeFetch = async () => ({ json: async () => [{ player: evil, score: 100, questions: 3 }] });
    const loadScores = new Function('document', 'fetch', 'API', src + '\nreturn loadScores;')(fakeDoc, fakeFetch, '/api');
    await loadScores();
    assert(tbody.children.length === 1, "one row");
    const tds = tbody.children[0].children;
    assert(tds.length === 4, "four cells");
    assert(tds.every(td => td.tag === 'td'), "cells are td");
    assert(tds.map(td => td.textContent).join('|') === `1|${evil}|100|3`, "cells hold plain text");
    assert(made.every(e => e.sets.length === 0), "no innerHTML on rows or cells");
    assert(tbody.sets.every(v => v === ''), "tbody only cleared");
    assert(sec.hidden === false, "scoreboard shown");
  }));

  // 13. package.json version matches the latest CHANGELOG entry
  results.push(await test("package.json version matches CHANGELOG", async () => {
    const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
    const top = fs.readFileSync('./CHANGELOG.md', 'utf8').match(/^## (\d+\.\d+\.\d+)/m);
    assert(top, "no CHANGELOG version heading");
    assert(pkg.version === top[1], `package.json ${pkg.version} vs CHANGELOG ${top[1]}`);
  }));

  // 14. accuse requires confirmation before POST /api/accuse
  results.push(await test("accuse requires confirmation", async () => {
    assert(LABELS.en.confirmAccuse === 'Accuse {name}? You only get one accusation.', "en confirmAccuse");
    assert(LABELS.pt.confirmAccuse === 'Acusar {name}? Você só tem uma acusação.', "pt confirmAccuse");
    const html = fs.readFileSync('./public/index.html', 'utf8');
    const src = html.slice(html.indexOf('function renderAccuseButtons'), html.indexOf('async function loadScores'));
    assert(src.includes('confirm('), "renderAccuseButtons must call confirm");
    assert(src.includes('LABELS[lang].confirmAccuse'), "uses confirmAccuse label");
    assert(src.includes(".replace('{name}', s.name)"), "substitutes the suspect name");
    assert(!/addEventListener\('click',\s*\(\)\s*=>\s*accuse\(s\.id\)\)/.test(src), "must not call accuse directly on click");
    assert(/confirm\(LABELS\[lang\]\.confirmAccuse/.test(src) && /accuse\(s\.id\)/.test(src), "accuse runs only after confirm");
  }));

  // 15. askQuestion busy state disables #q / accuse and sets aria-busy
  results.push(await test("askQuestion busy state", async () => {
    assert(LABELS.en.thinking === '…thinking', "en thinking");
    assert(LABELS.pt.thinking === '…pensando', "pt thinking");
    const html = fs.readFileSync('./public/index.html', 'utf8');
    const src = html.slice(html.indexOf('async function askQuestion'), html.indexOf('async function accuse'));
    assert(src.includes("LABELS[lang].thinking"), "uses LABELS.thinking");
    assert(!src.includes("'…pensando'") && !src.includes("'…thinking'"), "no hardcoded thinking strings");
    assert(src.includes("setAttribute('aria-busy', 'true')"), "sets aria-busy");
    assert(src.includes("removeAttribute('aria-busy')"), "clears aria-busy");
    assert(src.includes("qInput.disabled = true"), "disables #q while busy");
    assert(src.includes("qInput.disabled = false"), "re-enables #q");
    assert(src.includes("accuseBtns.forEach"), "toggles Accuse buttons");
    assert(src.includes("qInput.focus()"), "refocuses #q");
    assert(src.includes("thinking.parentNode") && src.includes("thinking.remove()"), "removes leftover thinking line");
    function el(extras = {}) {
      return {
        children: [], textContent: '', value: '', disabled: false, attrs: {}, focused: false,
        appendChild(c) { this.children.push(c); c.parentNode = this; },
        remove() { if (this.parentNode) { const p = this.parentNode; p.children = p.children.filter(x => x !== this); this.parentNode = null; } },
        setAttribute(k, v) { this.attrs[k] = v; },
        removeAttribute(k) { delete this.attrs[k]; },
        focus() { this.focused = true; },
        ...extras
      };
    }
    const qInput = el({ value: 'Where were you?' });
    const askBtn = el();
    const askForm = el();
    const accuseA = el();
    const accuseB = el();
    const log = el();
    const fakeDoc = {
      getElementById: id => ({ q: qInput, 'ask-btn': askBtn, 'ask-form': askForm, log }[id]),
      querySelectorAll: sel => sel === '#accuse-buttons button' ? [accuseA, accuseB] : [],
      createElement: () => el()
    };
    const calls = { renderQuestions: 0, renderConversation: 0, showError: 0 };
    const mid = [];
    const observingFetch = async () => {
      mid.push({ q: qInput.disabled, ask: askBtn.disabled, a1: accuseA.disabled, a2: accuseB.disabled, busy: askForm.attrs['aria-busy'], think: log.children.length, thinkText: log.children[0] && log.children[0].textContent });
      await Promise.resolve();
      return { ok: true, json: async () => ({ answer: 'I was in the hall.', questions: 1 }) };
    };
    const askQuestionObs = new Function(
      'document', 'fetch', 'API', 'LABELS', 'selectedSuspect', 'lang', 'sessionId', 'histories',
      'renderQuestions', 'renderConversation', 'showError',
      'let questionsUsed = 0; let gameOver = false;\n' + src + '\nreturn askQuestion;'
    )(
      fakeDoc, observingFetch, '/api', LABELS, 'maya', 'en', 'sess-1', {},
      () => { calls.renderQuestions++; },
      () => { calls.renderConversation++; log.children = []; },
      () => { calls.showError++; }
    );
    qInput.value = 'Where were you?';
    await askQuestionObs({ preventDefault() {} });
    assert(mid.length === 1, "fetch ran once");
    assert(mid[0].q === true && mid[0].ask === true && mid[0].a1 === true && mid[0].a2 === true, "disabled while in flight");
    assert(mid[0].busy === 'true', "aria-busy while in flight");
    assert(mid[0].think === 1 && mid[0].thinkText === '…thinking', "thinking line while in flight");
    assert(qInput.disabled === false && askBtn.disabled === false && accuseA.disabled === false && accuseB.disabled === false, "re-enabled after");
    assert(askForm.attrs['aria-busy'] === undefined, "aria-busy cleared");
    assert(qInput.value === '', "clears #q");
    assert(qInput.focused === true, "focuses #q");
    assert(calls.renderConversation === 1 && calls.showError === 0, "success path ran");
    const q2 = el({ value: 'Again?' });
    const askBtn2 = el();
    const askForm2 = el();
    const accuseC = el();
    const log2 = el();
    const fakeDoc2 = {
      getElementById: id => ({ q: q2, 'ask-btn': askBtn2, 'ask-form': askForm2, log: log2 }[id]),
      querySelectorAll: () => [accuseC],
      createElement: () => el()
    };
    const askFail = new Function(
      'document', 'fetch', 'API', 'LABELS', 'selectedSuspect', 'lang', 'sessionId', 'histories',
      'renderQuestions', 'renderConversation', 'showError',
      'let questionsUsed = 0; let gameOver = false;\n' + src + '\nreturn askQuestion;'
    )(
      fakeDoc2,
      async () => ({ ok: false, json: async () => ({ message: 'busy' }) }),
      '/api', LABELS, 'maya', 'en', 'sess-1', {},
      () => {}, () => {}, () => {}
    );
    await askFail({ preventDefault() {} });
    assert(log2.children.length === 0, "thinking removed on error");
    assert(q2.disabled === false && askBtn2.disabled === false && accuseC.disabled === false, "re-enabled on error");
    assert(askForm2.attrs['aria-busy'] === undefined, "aria-busy cleared on error");
    assert(q2.focused === true, "focuses #q on error");
  }));

  // 16. restartGame confirm cancel vs new session + clear
  results.push(await test("restartGame start over", async () => {
    assert(LABELS.en.startOver === 'Start over', "en startOver");
    assert(LABELS.pt.startOver === 'Nova partida', "pt startOver");
    assert(LABELS.en.confirmRestart.includes('Start a new game'), "en confirmRestart");
    assert(LABELS.pt.confirmRestart.includes('novo jogo'), "pt confirmRestart");
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert(html.includes('id="restart-btn"'), "has #restart-btn");
    assert(html.includes("LABELS[newLang].startOver"), "setLang sets startOver");
    assert(html.includes("if (restartBtn) restartBtn.disabled = true"), "busy disables restart");
    assert(html.includes("if (restartBtn) restartBtn.disabled = false"), "busy re-enables restart");
    const src = html.slice(html.indexOf('async function restartGame'), html.indexOf("document.getElementById('restart-btn').addEventListener"));
    assert(src.includes("confirm(LABELS[lang].confirmRestart)"), "confirms restart");
    assert(src.includes("API + '/session'"), "posts new session");
    assert(src.includes("Object.keys(histories)"), "clears histories");
    assert(src.includes("questionsUsed = 0"), "resets questionsUsed");
    assert(src.includes("selectedSuspect = null"), "clears selectedSuspect");
    assert(src.includes("lastAccuseResult = null"), "clears lastAccuseResult");
    assert(src.includes("verdict.hidden = true"), "hides verdict");
    assert(src.includes("renderBest()"), "refreshes best display");
    function el(extras = {}) {
      return {
        children: [], textContent: '', value: '', disabled: false, hidden: false, innerHTML: '', attrs: {}, focused: false,
        appendChild(c) { this.children.push(c); },
        setAttribute(k, v) { this.attrs[k] = v; },
        removeAttribute(k) { delete this.attrs[k]; },
        focus() { this.focused = true; },
        ...extras
      };
    }
    const log = el({ innerHTML: 'Q' });
    const verdict = el({ hidden: false, innerHTML: 'v' });
    const credits = el({ hidden: false });
    const scores = el({ hidden: false });
    const err = el({ hidden: false });
    const askBtn = el({ disabled: true });
    const q = el({ disabled: true, value: 'old' });
    const askForm = el({ attrs: { 'aria-busy': 'true' } });
    const restartBtn = el({ disabled: true });
    const bestStatus = el({ textContent: 'x' });
    const accuseA = el({ disabled: true });
    const firstSuspect = el();
    const fakeDoc = {
      getElementById: id => ({ log, verdict, credits, 'scores-section': scores, err, 'ask-btn': askBtn, q, 'ask-form': askForm, 'restart-btn': restartBtn, 'best-status': bestStatus }[id]),
      querySelectorAll: sel => sel === '#accuse-buttons button' ? [accuseA] : [],
      querySelector: sel => sel === '#suspect-buttons button' ? firstSuspect : null
    };
    const histories = { maya: [{ q: 'a', a: 'b' }] };
    let sessionId = 'old-sess';
    let questionsUsed = 3;
    let selectedSuspect = 'maya';
    let lastAccuseResult = { score: 1 };
    const renders = { q: 0, best: 0, case: 0, accuse: 0, conv: 0 };
    let fetchCalls = [];
    let confirmRet = false;
    const fakeConfirm = () => confirmRet;
    const fakeFetch = async (url, opts) => { fetchCalls.push({ url, opts }); return { json: async () => ({ sessionId: 'new-sess' }) }; };
    const makeRestart = () => new Function(
      'document', 'fetch', 'confirm', 'API', 'LABELS', 'lang', 'histories',
      'renderQuestions', 'renderBest', 'renderCase', 'renderAccuseButtons', 'renderConversation',
      'let sessionId = "old-sess"; let questionsUsed = 3; let selectedSuspect = "maya"; let lastAccuseResult = { score: 1 }; let gameOver = true; function setGameOver(on){ gameOver = !!on; }\n' + src + '\nreturn { restartGame, get sessionId(){return sessionId}, get questionsUsed(){return questionsUsed}, get selectedSuspect(){return selectedSuspect}, get lastAccuseResult(){return lastAccuseResult}, histories };'
    )(
      fakeDoc, fakeFetch, fakeConfirm, '/api', LABELS, 'en', histories,
      () => { renders.q++; }, () => { renders.best++; }, () => { renders.case++; }, () => { renders.accuse++; }, () => { renders.conv++; }
    );
    confirmRet = false;
    fetchCalls = [];
    const cancelled = makeRestart();
    await cancelled.restartGame();
    assert(fetchCalls.length === 0, "cancel does not fetch");
    assert(cancelled.sessionId === 'old-sess', "cancel keeps session");
    assert(Object.keys(histories).length === 1, "cancel keeps histories");
    assert(cancelled.questionsUsed === 3, "cancel keeps questionsUsed");
    confirmRet = true;
    fetchCalls = [];
    const ok = makeRestart();
    await ok.restartGame();
    assert(fetchCalls.length === 1 && fetchCalls[0].url === '/api/session' && fetchCalls[0].opts.method === 'POST', "confirm posts session");
    assert(ok.sessionId === 'new-sess', "assigns new sessionId");
    assert(Object.keys(histories).length === 0, "clears histories");
    assert(ok.questionsUsed === 0, "resets questionsUsed");
    assert(ok.selectedSuspect === null, "clears selectedSuspect");
    assert(ok.lastAccuseResult === null, "clears lastAccuseResult");
    assert(log.innerHTML === '' && verdict.hidden === true && verdict.innerHTML === '', "clears log and verdict");
    assert(credits.hidden === true && scores.hidden === true && err.hidden === true, "hides closed UI");
    assert(askBtn.disabled === false && q.disabled === false && q.value === '' && accuseA.disabled === false && restartBtn.disabled === false, "re-enables controls");
    assert(askForm.attrs['aria-busy'] === undefined, "clears aria-busy");
    assert(bestStatus.textContent === '', "clears best-status");
    assert(renders.q === 1 && renders.best === 1 && renders.case === 1 && renders.accuse === 1 && renders.conv === 1, "rerenders");
    assert(firstSuspect.focused === true, "focuses first suspect");
  }));

  // 17. Escape clears #q when focused
  results.push(await test("Escape clears question input", async () => {
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert(html.includes("document.addEventListener('keydown'"), "has document keydown listener");
    assert(html.includes("e.key !== 'Escape'") || html.includes('e.key !== "Escape"') || html.includes("e.key === 'Escape'") || html.includes('e.key === "Escape"'), "checks Escape key");
    assert(html.includes("getElementById('q')") || html.includes('getElementById("q")'), "reads #q");
    assert(html.includes("activeElement") || html.includes("e.target"), "guards on focus/#q");
    assert(/q\.value\s*=\s*['"]['"]/.test(html) || /qInput\.value\s*=\s*['"]['"]/.test(html), "clears #q value");
    const escIdx = html.search(/addEventListener\(['"]keydown['"]/);
    assert(escIdx >= 0, "keydown listener present");
    const slice = html.slice(escIdx, escIdx + 400);
    assert(slice.includes("focus()"), "refocuses #q after clear");
    assert(slice.includes("Escape"), "Escape in keydown handler");
  }));

  // 18. Game over locks Ask/Accuse after verdict
  results.push(await test("Game over locks Ask and Accuse after verdict", async () => {
    const html = fs.readFileSync('./public/index.html', 'utf8');
    const best = fs.readFileSync('./public/best.js', 'utf8');
    assert(html.includes('let gameOver') || html.includes('var gameOver') || /gameOver\s*=\s*false/.test(html), "declares gameOver");
    assert(html.includes('function setGameOver') || html.includes('setGameOver('), "has setGameOver");
    assert(best.includes("gameOver: 'Game over. Use Start over for a new case.'") || best.includes('gameOver: "Game over. Use Start over for a new case."'), "LABELS.en.gameOver");
    assert(best.includes("gameOver: 'Fim de jogo. Use Nova partida para um novo caso.'") || best.includes('gameOver: "Fim de jogo. Use Nova partida para um novo caso."'), "LABELS.pt.gameOver");
    assert(/if\s*\(\s*gameOver\s*\)\s*return/.test(html), "askQuestion/accuse guard returns when gameOver");
    const askIdx = html.indexOf('async function askQuestion');
    assert(askIdx >= 0, "askQuestion present");
    const askSlice = html.slice(askIdx, askIdx + 200);
    assert(/if\s*\(\s*gameOver\s*\)\s*return/.test(askSlice), "askQuestion returns when gameOver before selectedSuspect");
    assert(html.includes('setGameOver(true)'), "accuse success calls setGameOver(true)");
    assert(html.includes('setGameOver(false)') || /gameOver\s*=\s*false/.test(html), "restart clears gameOver");
    const restartIdx = html.indexOf('async function restartGame');
    assert(restartIdx >= 0, "restartGame present");
    const restartSlice = html.slice(restartIdx, restartIdx + 900);
    assert(/gameOver\s*=\s*false/.test(restartSlice) || restartSlice.includes('setGameOver(false)'), "restartGame clears lock");
  }));

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
