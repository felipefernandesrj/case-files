// Pre-launch QA difficulty pass: hunch score for a blind guess, hint leak gate for generated cases. Written via the Cup key (gemma-4-26b, call prelaunch-05).
import { strict as assert } from 'node:assert';
import { scoreFor, HUNCH_SCORE } from '../src/scoreboard.js';
import { hintLeak, validateCase } from '../src/generator.js';
import { loadCase, CASES } from '../src/case.js';

const results = [];
function check(name, fn) {
  try {
    fn();
    results.push(`[PASS] ${name}`);
  } catch (err) {
    results.push(`[FAIL] ${name}: ${err.message}`);
  }
}

check("a blind or one-question right guess scores the hunch score", () => {
  assert.strictEqual(scoreFor(true, 0), 25);
  assert.strictEqual(scoreFor(true, 1), 25);
  assert.strictEqual(HUNCH_SCORE, 25);
});

check("deduction keeps the old curve", () => {
  assert.strictEqual(scoreFor(true, 2), 100);
  assert.strictEqual(scoreFor(true, 3), 100);
  assert.strictEqual(scoreFor(true, 8), 75);
  assert.strictEqual(scoreFor(true, 30), 10);
  assert.strictEqual(scoreFor(false, 5), 0);
});

check("hint naming the culprit or role is refused", () => {
  const c = {
    culprit: 'm',
    suspects: [
      { id: 'm', name: 'Marta', role: { en: 'Lead Dancer', pt: 'Passista' } },
      { id: 'r', name: 'Ricardo', role: { en: 'Drummer', pt: 'Percussionista' } },
      { id: 'l', name: 'Lucas', role: { en: 'Manager', pt: 'Diretor' } }
    ],
    hints: [{ id: 'h1', after: 45, text: { en: "Note the dancer's shoe.", pt: 'Note o sapato.' } }]
  };
  assert.strictEqual(hintLeak(c), 'hint_names_culprit');

  const c2 = { ...c, hints: [{ id: 'h1', after: 45, text: { en: 'Marta was nervous.', pt: 'Marta estava nervosa.' } }] };
  assert.strictEqual(hintLeak(c2), 'hint_names_culprit');
});

check("hint listing every innocent is refused", () => {
  const c = {
    culprit: 'm',
    suspects: [
      { id: 'm', name: 'Marta', role: { en: 'Lead Dancer', pt: 'Passista' } },
      { id: 'r', name: 'Ricardo', role: { en: 'Drummer', pt: 'Percussionista' } },
      { id: 'l', name: 'Lucas', role: { en: 'Manager', pt: 'Diretor' } }
    ],
    hints: [{ id: 'h1', after: 45, text: { en: 'Ricardo and Lucas have witnesses.', pt: 'Ricardo e Lucas têm testemunhas.' } }]
  };
  assert.strictEqual(hintLeak(c), 'hint_lists_innocents');

  const c2 = { ...c, hints: [{ id: 'h1', after: 45, text: { en: 'A sharp sound came from the drum room.', pt: 'Um som seco veio da sala.' } }] };
  assert.strictEqual(hintLeak(c2), null);
});

check("every case in the pack passes the hint check", () => {
  for (const file of Object.values(CASES)) {
    const c = loadCase(file);
    assert.strictEqual(hintLeak(c), null, `Case ${file} failed hint check`);
  }
});

results.forEach(line => console.log(line));
if (results.some(l => l.startsWith('[FAIL]'))) {
  process.exit(1);
}
// pre-launch QA difficulty pass, part 2 (PO): free questions follow the case's fair minimum
{
  const { scoreFor } = await import('../src/scoreboard.js'); const { fairMinimum } = await import('../src/budget.js'); const { loadCase, CASES } = await import('../src/case.js');
  const out = []; const ok = (c, m) => out.push(c ? `[PASS] ${m}` : `[FAIL] ${m}`);
  ok(fairMinimum(loadCase(CASES.violin)) === 4 && fairMinimum(loadCase(CASES['night-train'])) === 5, 'fair minimum is 4 for the Violin and 5 for the 4-suspect cases');
  ok(scoreFor(true, 4, 4) === 100 && scoreFor(true, 8, 4) === 80 && scoreFor(true, 5, 5) === 100 && scoreFor(true, 10, 5) === 75, 'questions up to the fair minimum are free, then minus 5 each');
  ok(scoreFor(true, 1, 5) === 25 && scoreFor(false, 5, 5) === 0 && scoreFor(true, 40, 5) === 10, 'hunch, wrong and floor still hold with free questions');
  console.log(out.join('\n')); if (out.some((l) => l.startsWith('[FAIL]'))) process.exit(1);
}
// pre-launch QA (PO): suspects may not invent alibis or sightings of others, in every case and both languages
{
  const { systemPrompt, loadCase, CASES } = await import('../src/case.js');
  const out = []; let all = true;
  for (const f of Object.values(CASES)) { const c = loadCase(f); for (const l of ['en', 'pt']) for (const s of c.suspects) if (!systemPrompt(c, s.id, l).includes('Never invent where another person was')) all = false; }
  out.push(`${all ? '[PASS]' : '[FAIL]'} every suspect prompt forbids invented alibis and sightings`);
  console.log(out.join('\n')); if (!all) process.exit(1);
}
