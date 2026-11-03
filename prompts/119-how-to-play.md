# Task (sprint 6): player guide docs/HOW_TO_PLAY.md (English + Portuguese)
Write a short player-facing guide for the browser mystery game you built. Audience: players and backers, not developers. Plain, friendly words, short sentences, no em-dashes, no jargon (no "API", "proxy", "endpoint", "model call", "tokens"). NO spoilers: never say who the culprit is, never list clues or solutions.

Facts about the game (all true, use only these):
- Case: "The Vanishing Violin" (PT: "O Violino Desaparecido"). A priceless Stradivarius vanished from the instrument room of the Aurora Music Academy during a rehearsal. Three suspects: Lorenzo Moretti (Conductor / Maestro), Maya Santos (Violinist / Violinista), Carlos Mendes (Janitor / Zelador).
- Each suspect is played live by an AI. They answer in character, keep their story straight, remember what you already asked them, and may hide things. Answers are short (under 60 words).
- How to play: 1) pick EN or PT at the top; 2) choose a suspect; 3) type a question and press Enter or the Ask button; 4) switch suspects and compare stories; 5) when ready, type your name (optional, otherwise "anon") and press one Accuse button. You get one accusation per game.
- Scoring: a correct accusation scores 100 if you asked 3 questions or fewer, then 5 points less per extra question, never below 10. A wrong accusation scores 0. The verdict shows the solution. Top 10 scores appear on the scoreboard.
- Only answered questions count. If a question fails, it is not counted and the suspect does not remember it.
- Play capacity: every question is paid by capacity that backers put into the Case Files Cup on FullCup. If capacity runs out, the game says so in a friendly message; your questions so far are kept; backers can refill it; try again later. Too many questions at once: wait a few seconds.
- Keyboard and screen readers: everything works with Tab and Enter, focus is always visible, answers and the verdict are announced.
- After the verdict, a "Thanks to the backers" screen lists the backers.
- Every question creates a public receipt on FullCup, so backers can see how their capacity is used.
- Tips: ask where each person was and when, ask about the room and the lock, ask one suspect about another, compare details.
- You can also play in a terminal: `node src/cli.js` (add `--lang pt` for Portuguese).

Structure (Markdown):
# How to play / Como jogar
Short line linking both sections: [English](#english) · [Português](#portugues)
## English
### The case, ### How to play (numbered steps), ### Scoring, ### Tips (3 to 4 bullets), ### When the game cannot answer, ### Accessibility, ### Thanks and receipts
## Português {#portugues} is not valid in plain Markdown, so write the heading as "## Português" and put `<a id="portugues"></a>` on the line above it; also put `<a id="english"></a>` above "## English".
Then the same subsections in natural PT-BR (with accents): ### O caso, ### Como jogar, ### Pontuação, ### Dicas, ### Quando o jogo não consegue responder, ### Acessibilidade, ### Agradecimentos e recibos. Keep "FullCup" and "Cup" in English in PT.
Total under 110 lines.

Output ONLY <<<FILE docs/HOW_TO_PLAY.md>>> newline, content, newline, <<<END>>>. No prose, no code fences around the whole file.
