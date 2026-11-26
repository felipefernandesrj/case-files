# Task (pre-launch QA fix 2): three small UI fixes found by the vision bots. Output EXACTLY the 5 blocks below, filled in, and nothing else. Each block: <<<REPLACE path>>> line, old text, a line with =====, new text, <<<END>>> line. Never repeat a block.

1. public/css/game.css. At 768 px and wider, after a verdict the accuse stage is taller than the stage; `justify-content: center` with `flex: 1; min-height: 0` pushes about 470 px of it (the culprit line, the solution start) above the scroll top where nobody can scroll, and the panel background stops halfway. Old text (exact):
  #briefing.is-on, #accuse-stage.is-on {
    justify-content: center;
New text:
  #briefing.is-on, #accuse-stage.is-on {
    flex: 1 0 auto; /* pre-launch QA: grow with the verdict instead of overflowing above the scroll top */
    justify-content: safe center;

2. public/css/game.css. CONTINUE? / GAME OVER box has no backdrop, the page text shows around it. In the `.continue {` rule replace the old text `box-shadow: 0 0 0 4px rgba(12,11,10,0.6), 0 0 40px rgba(232,184,109,0.25); }` with `box-shadow: 0 0 0 4px rgba(12,11,10,0.6), 0 0 40px rgba(232,184,109,0.25), 0 0 0 100vmax rgba(5,4,3,0.72); }`

3. public/best.js. The end line also shows after a win, where "Game over" reads wrong. Old: `    gameOver: 'Game over. Use Start over for a new case.',` New: `    gameOver: 'This game is over. Press Start over to play it again, or Files for another case.',`
4. public/best.js. Old: `    gameOver: 'Fim de jogo. Use Nova partida para um novo caso.',` New: `    gameOver: 'Esta partida acabou. Toque em Nova partida para jogar de novo ou em Arquivos para outro caso.',`
5. test/scoreboard.mjs: old `best.includes("gameOver: 'Game over. Use Start over for a new case.'") || best.includes('gameOver: "Game over. Use Start over for a new case."')` new `best.includes("gameOver: 'This game is over. Press Start over to play it again, or Files for another case.'")`; and in the same block also old `best.includes("gameOver: 'Fim de jogo. Use Nova partida para um novo caso.'") || best.includes('gameOver: "Fim de jogo. Use Nova partida para um novo caso."')` new `best.includes("gameOver: 'Esta partida acabou. Toque em Nova partida para jogar de novo ou em Arquivos para outro caso.'")` (this is one block with both lines: put both old lines, ===== , both new lines; the two lines are consecutive in the file, each starting with four spaces and `assert(` and ending with `, "LABELS.en.gameOver");` / `, "LABELS.pt.gameOver");`).
