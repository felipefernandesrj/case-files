Product: Case Files, a pack of browser detective games (plain HTML/CSS/JS, no frameworks). M4 "The Pack, published": one web app with every case, a case picker (the "cabinet" of folder cards), a SHARED scoreboard across the pack, a public cost log for each case (page /costs, sections /costs#<case id>), and credits with the real backers.
Server API you can use (already done): GET /api/scores?case=all -> [ { player, total, solved, cases } ] (best score per case summed per player, top 10); GET /api/credits?lang=en|pt -> { title, backers: [names], others: number of backers who chose not to appear, example: boolean }. The page keeps the current language in the global `lang` ('en' | 'pt'), the open case id in the global `openFile`, the string table `UI[lang]`, and `const API = '/api'`.

Make these edits with edit blocks only. Example of ONE block (old text copied exactly with its indentation, a line =====, the new text; no labels):
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

1. public/index.html, cabinet markup. Old (exact, 4 spaces):
    <div id="cabinet-list"></div>
New: keep that line, then add a section `<section id="pack-scores" aria-labelledby="pack-scores-title">` with `<h3 id="pack-scores-title">`, a `<div class="pack-scroll">` holding a table (caption id pack-scores-caption, header cells ids th-pack-rank "#", th-pack-player, th-pack-solved, th-pack-total, tbody id pack-scores-body), a `<p id="pack-scores-empty" hidden></p>`, and then `<p class="pack-links"><a id="cost-link" href="/costs">Cost log for every case</a></p>`. The section closes after the links paragraph.

2. public/index.html, the per-case scoreboard header has 3 columns but each row has 4 cells (rank, player, score, questions). Old (exact, 16 spaces):
                <th id="th-player">Player</th>
New: `                <th id="th-rank">#</th>` on its own line, then the old line.

3. public/index.html, credits markup. Old (exact, 10 spaces):
          <p id="credits-note"></p>
New: keep it, then `          <p id="credits-others" hidden></p>` and `          <p><a id="credits-cost" href="/costs">See what this case cost</a></p>`.

4. public/index.html, string table. Old (exact, 4 spaces; it appears twice, so use the two exact lines below as two separate blocks):
    generated: 'Generated case', drafts: 'drafts',
New: keep it and add on the next line: `    packScores: 'Pack scoreboard', packCaption: 'Best score per case, added up', packPlayer: 'Player', packSolved: 'Cases solved', packTotal: 'Total', packEmpty: 'No named player yet. Solve a case and sign your name.', costLink: 'Cost log for every case', caseCost: 'See what this case cost', others: (n) => `and ${n} more backers who chose not to appear`,`
and the Portuguese one, old (exact):
    generated: 'Caso gerado', drafts: 'rascunhos',
New: keep it and add: `    packScores: 'Placar do pacote', packCaption: 'Melhor pontuação de cada caso, somada', packPlayer: 'Jogador', packSolved: 'Casos resolvidos', packTotal: 'Total', packEmpty: 'Nenhum jogador com nome ainda. Resolva um caso e assine seu nome.', costLink: 'Registro de custos de cada caso', caseCost: 'Veja quanto este caso custou', others: (n) => `e mais ${n} apoiadores que preferiram não aparecer`,`

5. public/index.html, new function. Old (exact):
function showCabinet() {
New: put this new function before it, then the old line:
async function loadPackScores() — fills the pack section: sets the texts of pack-scores-title, pack-scores-caption, th-pack-player, th-pack-solved, th-pack-total from UI[lang]; sets #cost-link text to UI[lang].costLink and href to '/costs?lang=' + lang; fetches API + '/scores?case=all' inside try/catch; clears #pack-scores-body and adds one row per entry with cells i + 1, player, solved, total (always textContent, never innerHTML with data); when the list is empty (or the fetch fails) shows #pack-scores-empty with UI[lang].packEmpty, else hides it.

6. public/index.html, showCabinet calls it. Old (exact, 2 spaces):
  document.body.dataset.view = 'cabinet';
New: the old line then `  if (typeof loadPackScores === 'function') loadPackScores();`

7. public/index.html, language switch. Old (exact, 2 spaces):
  document.getElementById('cabinet-stamp').textContent = UI[newLang].cabinetStamp;
New: the old line then `  if (!document.getElementById('cabinet').hidden) await loadPackScores();` (setLang is async and `lang` is already the new language there).

8. public/index.html, credits. Old (exact, 4 spaces):
    if (data.example) {
New: before it add code that fills #credits-others with UI[lang].others(data.others) and shows it when data.others > 0 (hidden otherwise), and sets #credits-cost text to UI[lang].caseCost and href to '/costs?lang=' + lang + '#' + encodeURIComponent(openFile || 'violin'); then the old line.

9. public/css/game.css, append after the last line, which is exactly:
@media (prefers-reduced-motion: reduce) { #ask-form #q, #ask-form #ask-btn { transition: none; } }
New CSS (keep the old line first): #pack-scores { margin-top: 24px; padding: 12px; border: 1px solid var(--cf-line); background: var(--cf-ink-soft); color: var(--cf-text); } #pack-scores h3 { margin: 0 0 8px; color: var(--cf-lamp); } .pack-scroll { overflow-x: auto; max-width: 100%; } #pack-scores table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; } #pack-scores caption { text-align: left; color: var(--cf-text-dim); font-size: 0.85rem; padding-bottom: 4px; } #pack-scores th, #pack-scores td { padding: 6px 8px; border-bottom: 1px solid var(--cf-line); text-align: left; } #pack-scores td:nth-child(3), #pack-scores td:nth-child(4), #pack-scores th:nth-child(3), #pack-scores th:nth-child(4) { text-align: right; } #pack-scores-empty { color: var(--cf-text-dim); margin: 8px 0; } .pack-links a, #credits-cost { color: var(--cf-lamp); text-decoration: underline; display: inline-block; min-height: 44px; line-height: 44px; } .pack-links a:focus-visible, #credits-cost:focus-visible { outline: 2px solid var(--cf-lamp); outline-offset: 2px; } #credits-others { color: var(--cf-text-dim); font-style: italic; }
Start your reply directly with <<<REPLACE. No analysis text.
