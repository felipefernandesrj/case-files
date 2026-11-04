# Task (sprint 8): docs for v0.2.7
What changed this sprint: both personal best lines (English record and Portuguese record) are now written in the language the player is reading (e.g. PT UI shows "Seu recorde em inglês: 95 pontos com 4 perguntas."; before, the English line stayed in English in the PT UI). After a correct accusation that beats the stored best, the page announces "New personal best!" / "Novo recorde pessoal!" through the existing role=status line, so screen reader users hear it. Removed an unused variable in test/scoreboard.mjs; new check "best lines follow the UI language". Total 88 automated checks (was 87).

Output ONLY these literal edit blocks (format: <<<REPLACE path>>> newline, OLD exactly, newline, ===== on its own line (exactly five =), newline, NEW, newline, <<<END>>>). No prose, no fences, no em-dashes.
1. CHANGELOG.md: OLD is the line `# Changelog` followed by an empty line; NEW is `# Changelog`, empty line, `## 0.2.7 (M1 sprint 8, best line wording + new best announcement)`, 3 or 4 short bullets, empty line.
2. README.md: OLD is exactly `M1 status (v0.2.6):` NEW is `M1 status (v0.2.7):`
3. README.md: OLD is exactly `personal best per language with a confirmed reset,` NEW is `personal best per language (shown in your language, new best announced) with a confirmed reset,`
4. README.md: OLD is exactly `87 automated checks.` NEW is `88 automated checks.`
5. docs/SPEC.md: OLD is the line `- Reset requires user confirmation; GET /best.js serves the storage module.`; NEW is that line plus one bullet saying both best lines use the UI language wording (bestText(lang, entry, ui)) and a new best is announced in the role=status line.
6. docs/HOW_TO_PLAY.md: OLD is exactly `use "Reset my best scores" to clear it (you will be asked to confirm).` NEW is it plus ` When you beat your best, the game says "New personal best!".`
7. docs/HOW_TO_PLAY.md: OLD is exactly `use "Apagar meus recordes" para limpar (o jogo pede confirmação).` NEW is it plus ` Quando você bate seu recorde, o jogo avisa "Novo recorde pessoal!".`
