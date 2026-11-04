# Task (sprint 8): wire the UI language into the best lines, announce a new best, clean the test
public/best.js now has `bestText(lang, entry, ui = lang)` (lang = language of the record, ui = language of the wording; e.g. bestText('en', null, 'pt') === "Ainda sem recorde em inglês.", bestText('pt', {score:90,questions:5,at:'t'}, 'en') === "Your best in Portuguese: 90 points with 5 questions.") and LABELS.en.newBest = 'New personal best!', LABELS.pt.newBest = 'Novo recorde pessoal!'.

Output ONLY these 5 literal edit blocks (format: <<<REPLACE path>>> newline, OLD exactly, newline, ===== on its own line (exactly five =), newline, NEW, newline, <<<END>>>). No prose, no fences, no em-dashes.
1. public/best.js: OLD ` * @param {'en'|'pt'} [ui='en']` NEW ` * @param {'en'|'pt'} [ui=lang] language of the wording`
2. public/index.html: OLD is these 2 lines
  document.getElementById('best-en').textContent = bestText('en', b.en);
  document.getElementById('best-pt').textContent = bestText('pt', b.pt);
NEW: same 2 lines but passing `lang` as third argument.
3. public/index.html: OLD is these 2 lines
    recordResult(store, lang, data);
    renderBest();
NEW: `    const rec = recordResult(store, lang, data);`, `    renderBest();`, `    document.getElementById('best-status').textContent = rec.isNew ? LABELS[lang].newBest : '';` (best-status is already role=status, so screen readers hear it).
4. test/scoreboard.mjs: OLD is the line `    const sThrow = throwingStorage();` followed by a newline; NEW is empty (delete the unused variable). Write OLD as that single line and NEW as an empty line.
5. test/scoreboard.mjs: OLD is the 4 lines
  const passed = results.filter(r => r.ok).length;
NEW: a new test before it, same style as the others:
  // 11. best lines follow the UI language
  results.push(await test("best lines follow the UI language", async () => {
    ...asserts: bestText('en', null, 'pt') === "Ainda sem recorde em inglês."; bestText('pt', null, 'en') === "No best score yet in Portuguese."; bestText('en', {score: 95, questions: 4, at: 't'}, 'pt') === "Seu recorde em inglês: 95 pontos com 4 perguntas."; bestText('pt', {score: 90, questions: 1, at: 't'}, 'en') === "Your best in Portuguese: 90 points with 1 question."; bestText('pt', null, 'pt') === bestText('pt', null); LABELS.en.newBest === 'New personal best!'; LABELS.pt.newBest === 'Novo recorde pessoal!'; and the page source (fs.readFileSync('./public/index.html','utf8')) includes "bestText('en', b.en, lang)", "bestText('pt', b.pt, lang)" and "LABELS[lang].newBest".
  }));
followed by an empty line and then the original line `  const passed = results.filter(r => r.ok).length;`.
(For block 5, OLD is just that one line `  const passed = results.filter(r => r.ok).length;`.)
