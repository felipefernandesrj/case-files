# Task (sprint 11): accuse confirmation before the irreversible POST
Today clicking an Accuse button calls accuse(s.id) immediately. Add a confirm step, same pattern as the personal-best reset (native window.confirm). Do NOT call /api/accuse until the player confirms. Keep every other behaviour.

Output ONLY these literal edit blocks, in this order. Format each block: <<<REPLACE path>>> newline, OLD exactly as given, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. The line right after ===== is the first line of NEW; do NOT put an empty line after =====. No prose, no fences, no em-dashes, no thinking aloud.

Block 1, public/best.js. OLD is exactly these 2 lines:
    kept: 'Nothing was reset.',
    newBest: 'New personal best!'
NEW is those 2 lines plus one new line (keep the commas). Add:
    confirmAccuse: 'Accuse {name}? You only get one accusation.'
so the en LABELS object ends with newBest then confirmAccuse (comma after newBest).

Block 2, public/best.js. OLD is exactly these 2 lines:
    kept: 'Nada foi apagado.',
    newBest: 'Novo recorde pessoal!'
NEW is those 2 lines plus:
    confirmAccuse: 'Acusar {name}? Você só tem uma acusação.'
(comma after newBest; closing }; of LABELS stays as in the file after this block).

Block 3, public/index.html. OLD is exactly this 1 line (the current direct accuse click):
    btn.addEventListener('click',()=>accuse(s.id));
NEW is exactly these 5 lines (2-space indent for the forEach body style already used; the confirm string uses LABELS and replaces the literal token {name} with s.name):
    btn.addEventListener('click',()=>{
      if (confirm(LABELS[lang].confirmAccuse.replace('{name}', s.name))) {
        accuse(s.id);
      }
    });

Block 4, test/keyboard.mjs. OLD is exactly this 1 line:
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
NEW is exactly these 3 lines (auto-accept native confirm/alert so Accuse Enter still reaches the verdict; reset-best uses the same confirm):
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  if (msg.method === 'Page.javascriptDialogOpening') {
    send('Page.handleJavaScriptDialog', { accept: true });
  }

Block 5, package.json. OLD is exactly this 1 line:
  "version": "0.2.9",
NEW is exactly this 1 line:
  "version": "0.3.0",

Block 6, test/scoreboard.mjs. OLD is exactly this 1 line:
  const passed = results.filter(r => r.ok).length;
NEW: a new test 14, then an empty line, then that same original line. Test 14, same style as the others (the file's own test(name, fn) and assert(cond, msg); fs and LABELS are already imported; 2-space indentation, 4 spaces inside the test body):
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
