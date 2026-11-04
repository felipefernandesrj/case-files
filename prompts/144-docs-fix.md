# Task (sprint 8): fix the whitespace your last docs edit added
Your edits started each NEW text with an extra empty line, which split paragraphs and lists. Fix these 5 places. Do not change any words.
1. CHANGELOG.md: remove the empty line between the `## 0.2.7 ...` heading and its first bullet, like the older entries.
2. README.md: the M1 status text must be one single line again (join the 3 lines with single spaces, no trailing spaces), with exactly one empty line before it.
3-4. docs/HOW_TO_PLAY.md: each of the 2 scoring paragraphs must be one single line again (replace "; " + newline with "; ").
5. docs/SPEC.md: remove the empty line inside the "Personal best (browser)" list.

Output ONLY 5 literal edit blocks. Format: <<<REPLACE path>>> newline, OLD exactly as given below, newline, ===== (exactly five =), newline, NEW, newline, <<<END>>>. IMPORTANT: the line right after ===== is the first line of NEW; do NOT put an empty line after =====. No prose, no fences.

Current OLD texts (between the markers ---OLD--- and ---END---, copy exactly):

CHANGELOG.md
---OLD---
## 0.2.7 (M1 sprint 8, best line wording + new best announcement)

- Personal best lines now match the UI language.
---END---

README.md
---OLD---
M1 status (v0.2.7): bilingual (EN / PT-BR) with full PT wording pass, consistent suspects that never invent people, per-suspect history, answers under 60 words, keyboard and screen reader support, CDP tests, scoreboard, 
personal best per language (shown in your language, new best announced) with a confirmed reset, fair-play check, CLI, clear capacity messages (failed questions never count), and credits screen. 
88 automated checks. Live play requires `FULLCUP_KEY` or `.fullcup-key`.
---END---

docs/HOW_TO_PLAY.md
---OLD---
A correct accusation scores 100 points if you asked 3 questions or fewer. Each extra question reduces your score by 5 points. The minimum score is 10. A wrong accusation scores 0. The verdict will reveal the solution. Top scores appear on the scoreboard. Your own best score for each language is kept in your browser; 
use "Reset my best scores" to clear it (you will be asked to confirm). When you beat your best, the game says "New personal best!".
---END---

docs/HOW_TO_PLAY.md
---OLD---
Uma acusação correta vale 100 pontos se você fizer 3 perguntas ou menos. Cada pergunta extra reduz a pontuação em 5 pontos. A pontuação mínima é 10. Uma acusação errada vale 0. O veredito mostrará a solução. As melhores pontuações aparecem no placar. Seu recorde em cada idioma fica guardado no seu navegador; 
use "Apagar meus recordes" para limpar (o jogo pede confirmação). Quando você bate seu recorde, o jogo avisa "Novo recorde pessoal!".
---END---

docs/SPEC.md
---OLD---
(wrong accusations never count).

- Reset
---END---
