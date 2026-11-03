# Task (sprint 6): fix your player guide docs/HOW_TO_PLAY.md
Review findings on your file (below). Fix all of them, keep everything else as it is:
1. Step 5 (both languages): the accusation is made by pressing the button with the suspect's name in the "Accuse" section (PT: seção "Acusar"). Say that.
2. PT step 3: the button is called "Perguntar" in Portuguese, not "Ask".
3. PT: write "Academia de Música Aurora", not "Aurora Music Academy". Write "pontuação", never "score".
4. Both languages, in "When the game cannot answer": add that only answered questions count; a question that fails is not counted and the suspect does not remember it. Say "your questions so far are kept" instead of "your progress is saved".
5. Both languages, "Thanks and receipts": name the screen "Thanks to the backers" (PT: "Obrigado aos apoiadores").
6. Add a last subsection in each language: "### Play in a terminal" / "### Jogar no terminal" with one line: `node src/cli.js` (add `--lang pt` for Portuguese / para português).
7. EN "The case": also say the suspects keep their story straight and may hide things; answers are short.
No em-dashes, no spoilers, under 110 lines.

Current file (written by you):
<<<FILE docs/HOW_TO_PLAY.md>>>
# How to play / Como jogar
[English](#english) · [Português](#portugues)

<a id="english"></a>
## English

### The case
A priceless Stradivarius vanished from the instrument room of the Aurora Music Academy during a rehearsal. Three suspects are waiting for you: Lorenzo Moretti (Conductor), Maya Santos (Violinist), and Carlos Mendes (Janitor). Each suspect is played live by an AI. They answer in character and remember what you have already asked.

### How to play
1. Pick EN or PT at the top of the screen.
2. Choose a suspect to talk to.
3. Type a question and press Enter or the Ask button.
4. Switch between suspects to compare their stories.
5. When you are ready, type your name (or "anon") and press the Accuse button. You only get one accusation per game.

### Scoring
A correct accusation scores 100 points if you asked 3 questions or fewer. Each extra question reduces your score by 5 points. The minimum score is 10. A wrong accusation scores 0. The verdict will reveal the solution. Top scores appear on the scoreboard.

### Tips
* Ask where each person was and when.
* Ask about the room and the lock.
* Ask one suspect about another person.
* Compare small details in their stories.

### When the game cannot answer
Every question is paid for by capacity provided by our backers in the Case Files Cup on FullCup. If capacity runs out, the game will tell you. Your progress is saved. Backers can refill the capacity so you can try again later. If you ask too many questions too fast, please wait a few seconds.

### Accessibility
The game works with Tab and Enter. Focus is always visible. Screen readers will announce answers and the final verdict.

### Thanks and receipts
After the verdict, you will see a list of our wonderful backers. Every question creates a public receipt on FullCup so backers can see how the capacity is used.

<a id="portugues"></a>
## Português

### O caso
Um Stradivarius de valor inestimável desapareceu da sala de instrumentos da Aurora Music Academy durante um ensaio. Três suspeitos esperam por você: Lorenzo Moretti (Maestro), Maya Santos (Violinista) e Carlos Mendes (Zelador). Cada suspeito é interpretado por uma IA. Eles respondem como personagens e lembram do que você já perguntou.

### Como jogar
1. Escolha EN ou PT no topo da tela.
2. Escolha um suspeito para conversar.
3. Digite uma pergunta e aperte Enter ou o botão Ask.
4. Troque de suspeito para comparar as histórias.
5. Quando estiver pronto, digite seu nome (ou "anon") e aperte o botão Accuse. Você tem apenas uma acusação por jogo.

### Pontuação
Uma acusação correta vale 100 pontos se você fizer 3 perguntas ou menos. Cada pergunta extra reduz o score em 5 pontos. A pontuação mínima é 10. Uma acusação errada vale 0. O veredito mostrará a solução. As melhores pontuações aparecem no placar.

### Dicas
* Pergunte onde cada pessoa estava e quando.
* Pergunte sobre a sala e a fechadura.
* Pergunte a um suspeito sobre outro.
* Compare detalhes nas histórias.

### Quando o jogo não consegue responder
Cada pergunta é paga pela capacidade enviada pelos apoiadores no Case Files Cup via FullCup. Se a capacidade acabar, o jogo avisará. Seu progresso é salvo. Os apoiadores podem recarregar a capacidade para você tentar mais tarde. Se fizer muitas perguntas seguidas, aguarde alguns segundos.

### Acessibilidade
O jogo funciona com Tab e Enter. O foco está sempre visível. Leitores de tela anunciarão as respostas e o veredito final.

### Agradecimentos e recibos
Após o veredito, você verá uma lista de nossos apoiadores. Cada pergunta cria um recibo público no FullCup para que os apoiadores vejam como a capacidade está sendo usada.
<<<END>>>

Output ONLY the full fixed file as <<<FILE docs/HOW_TO_PLAY.md>>> ... <<<END>>>. No prose.
