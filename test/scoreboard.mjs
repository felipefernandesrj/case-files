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

    const sThrow = throwingStorage();
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

  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  console.log(`${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
