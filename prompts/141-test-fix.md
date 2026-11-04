# Task (sprint 8): fix test 11 in your test/scoreboard.mjs
It fails with "assert.strictEqual is not a function": this file defines its own `function assert(cond, msg)` (no node:assert import). Rewrite test 11 using only the local assert: `assert(a === b, "short message")` and `assert(cond, "short message")`. Keep the same 11 checks.

Output ONLY one literal edit block: <<<REPLACE test/scoreboard.mjs>>> newline, the current test 11 lines exactly (below), newline, ===== (exactly five =), newline, the new lines, newline, <<<END>>>. No prose, no fences.

Current lines:
  // 11. best lines follow the UI language
  results.push(await test("best lines follow the UI language", async () => {
    assert.strictEqual(bestText('en', null, 'pt'), "Ainda sem recorde em inglês.");
    assert.strictEqual(bestText('pt', null, 'en'), "No best score yet in Portuguese.");
    assert.strictEqual(bestText('en', {score: 95, questions: 4, at: 't'}, 'pt'), "Seu recorde em inglês: 95 pontos com 4 perguntas.");
    assert.strictEqual(bestText('pt', {score: 90, questions: 1, at: 't'}, 'en'), "Your best in Portuguese: 90 points with 1 question.");
    assert.strictEqual(bestText('pt', null, 'pt'), bestText('pt', null));
    assert.strictEqual(LABELS.en.newBest, 'New personal best!');
    assert.strictEqual(LABELS.pt.newBest, 'Novo recorde pessoal!');
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert.ok(html.includes("bestText('en', b.en, lang)"));
    assert.ok(html.includes("bestText('pt', b.pt, lang)"));
    assert.ok(html.includes("LABELS[lang].newBest"));
  }));
