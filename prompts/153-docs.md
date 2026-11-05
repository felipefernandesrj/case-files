# Task (sprint 11): docs for v0.3.0 accuse confirmation
Output ONLY these 7 literal edit blocks. Format: <<<REPLACE path>>> newline, OLD exactly as given, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. The line right after ===== is the first line of NEW; do NOT put an empty line after =====. No prose, no fences, no em-dashes.

Block 1, CHANGELOG.md. OLD is exactly this 1 line:
## 0.2.9 (M1 sprint 10, tidy-up)
NEW is a new entry, then an empty line, then that same OLD line. The new entry is exactly:
## 0.3.0 (M1 sprint 11, accuse confirmation)
- Accuse buttons ask for confirmation before the irreversible accusation (native confirm, EN/PT).
- Cancel keeps the game open; Confirm is the only path that calls /api/accuse.
- Added check that the Accuse click path confirms first.
- Player guide notes the one-accusation confirm step.

Block 2, README.md. OLD is exactly: M1 status (v0.2.9):
NEW is exactly: M1 status (v0.3.0):

Block 3, README.md. OLD is exactly: 90 automated checks.
NEW is exactly: 91 automated checks.

Block 4, README.md. OLD is exactly this fragment inside the M1 status sentence:
personal best per language (shown in your language, new best announced) with a confirmed reset
NEW is exactly:
personal best per language (shown in your language, new best announced) with a confirmed reset, accuse confirmation before the one allowed accusation

Block 5, docs/SPEC.md. OLD is exactly this 1 line:
- Reset requires user confirmation; GET /best.js serves the storage module.
NEW is exactly these 2 lines:
- Reset requires user confirmation; GET /best.js serves the storage module.
- Accuse: the page shows a native confirm (EN "Accuse {name}? You only get one accusation." / PT "Acusar {name}? Você só tem uma acusação.") before POST /api/accuse; Cancel does nothing.

Block 6, docs/SPEC.md. OLD is exactly this 1 line:
Total checks: 90 (e2e: 42, proxy: 12, consistency: 4, capacity: 6, scoreboard: 13, keyboard: 13).
NEW is exactly this 1 line:
Total checks: 91 (e2e: 42, proxy: 12, consistency: 4, capacity: 6, scoreboard: 14, keyboard: 13).

Block 7, docs/HOW_TO_PLAY.md. Two sentence updates via one OLD spanning both languages is risky, so do EN only in this block. OLD is exactly this 1 line:
5. When you are ready, type your name (or "anon") and press the button with the suspect's name in the "Accuse" section. You only get one accusation per game.
NEW is exactly this 1 line:
5. When you are ready, type your name (or "anon") and press the button with the suspect's name in the "Accuse" section. The game asks you to confirm; you only get one accusation per game.

Block 8, docs/HOW_TO_PLAY.md. OLD is exactly this 1 line:
5. Quando estiver pronto, digite seu nome (ou "anon") e aperte o botão com o nome do suspeito na seção "Acusar". Você tem apenas uma acusação por jogo.
NEW is exactly this 1 line:
5. Quando estiver pronto, digite seu nome (ou "anon") e aperte o botão com o nome do suspeito na seção "Acusar". O jogo pede confirmação; você tem apenas uma acusação por jogo.
