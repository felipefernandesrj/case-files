# Task (sprint 9): scoreboard player names as plain text, plus a test
Problem: in public/index.html, loadScores() builds each row with `tr.innerHTML` and a template string, so a player name like `<img src=x onerror=alert(1)>` (fits in 24 chars) becomes real HTML for every player who opens the scoreboard. Fix: build the 4 cells with document.createElement('td') and textContent, never innerHTML.

Output ONLY these 2 literal edit blocks. Format: <<<REPLACE path>>> newline, OLD exactly as given, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. IMPORTANT: the line right after ===== is the first line of NEW; do NOT put an empty line after =====. No prose, no fences, no comments that think aloud, no em-dashes.

Block 1, public/index.html. OLD is exactly these 3 lines:
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${row.player}</td><td>${row.score}</td><td>${row.questions}</td>`;
    tbody.appendChild(tr);
NEW: the same first and last line; in between, loop over the array [i + 1, row.player, row.score, row.questions], and for each value create a td, set td.textContent = String(value), and tr.appendChild(td). Keep the 4-space indentation.

Block 2, test/scoreboard.mjs. OLD is exactly this 1 line:
  const passed = results.filter(r => r.ok).length;
NEW: a new test 12, then an empty line, then that same original line. Test 12, same style as the others (it uses the file's own `test(name, fn)` and `assert(cond, msg)`; fs is already imported):
  // 12. scoreboard shows player names as plain text
  results.push(await test("scoreboard shows player names as plain text", async () => {
    ...
  }));
Inside the test, in this order:
1. const html = fs.readFileSync('./public/index.html', 'utf8');
2. const src = html.slice(html.indexOf('async function loadScores'), html.indexOf('async function loadCredits'));
3. assert(src.length > 0, "loadScores not found");
4. A tiny fake DOM: function el() returns { children: [], textContent: '', hidden: true, sets: [], appendChild(c) { this.children.push(c); }, set innerHTML(v) { this.sets.push(v); this.children = []; }, get innerHTML() { return ''; } }. Keep every created element in an array `made`. const tbody = el(); const sec = el(); const fakeDoc = { getElementById: id => id === 'scores-body' ? tbody : sec, createElement: tag => { const e = el(); e.tag = tag; made.push(e); return e; } };
5. const evil = '<img src=x onerror=alert(1)>'; const fakeFetch = async () => ({ json: async () => [{ player: evil, score: 100, questions: 3 }] });
6. const loadScores = new Function('document', 'fetch', 'API', src + '\nreturn loadScores;')(fakeDoc, fakeFetch, '/api'); await loadScores();
7. Asserts with these exact messages:
   - tbody.children.length === 1, "one row"
   - const tds = tbody.children[0].children; tds.length === 4, "four cells"
   - tds.every(td => td.tag === 'td'), "cells are td"
   - tds.map(td => td.textContent).join('|') === `1|${evil}|100|3`, "cells hold plain text"
   - made.every(e => e.sets.length === 0), "no innerHTML on rows or cells"
   - tbody.sets.every(v => v === ''), "tbody only cleared"
   - sec.hidden === false, "scoreboard shown"
