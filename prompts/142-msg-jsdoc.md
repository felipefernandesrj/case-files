# Task (sprint 8): two small fixes
1. public/best.js JSDoc: the default of ui is lang, not 'en'.
2. test/scoreboard.mjs test 11: every assert message is the literal "msg", which tells nothing on failure. Give each a short specific message.

Output ONLY literal edit blocks (format: <<<REPLACE path>>> newline, OLD exactly, newline, ===== (exactly five =), newline, NEW, newline, <<<END>>>). No prose, no fences, no em-dashes.
Block 1: <<<REPLACE public/best.js>>> OLD ` * @param {'en'|'pt'} [ui='en']` NEW ` * @param {'en'|'pt'} [ui=lang] language of the wording`
Block 2: <<<REPLACE test/scoreboard.mjs>>> OLD = the 11 assert lines below exactly; NEW = the same lines with specific messages: "pt ui, en empty", "en ui, pt empty", "pt ui, en entry", "en ui, pt single", "pt default ui", "en newBest", "pt newBest", "page passes lang (en)", "page passes lang (pt)", "page announces new best". The `const html` line stays between them unchanged.

Current lines:
    assert(bestText('en', null, 'pt') === "Ainda sem recorde em inglês.", "msg");
    assert(bestText('pt', null, 'en') === "No best score yet in Portuguese.", "msg");
    assert(bestText('en', {score: 95, questions: 4, at: 't'}, 'pt') === "Seu recorde em inglês: 95 pontos com 4 perguntas.", "msg");
    assert(bestText('pt', {score: 90, questions: 1, at: 't'}, 'en') === "Your best in Portuguese: 90 points with 1 question.", "msg");
    assert(bestText('pt', null, 'pt') === bestText('pt', null), "msg");
    assert(LABELS.en.newBest === 'New personal best!', "msg");
    assert(LABELS.pt.newBest === 'Novo recorde pessoal!', "msg");
    const html = fs.readFileSync('./public/index.html', 'utf8');
    assert(html.includes("bestText('en', b.en, lang)"), "msg");
    assert(html.includes("bestText('pt', b.pt, lang)"), "msg");
    assert(html.includes("LABELS[lang].newBest"), "msg");
