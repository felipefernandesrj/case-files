# QA tooling (not product): the doc changes of sprint 15 as substring OLD/NEW pairs; applied here only for the dry run, then sent as the p290 prompt.
import json, sys
P = []
def add(f, o, n): P.append([f, o, n])
add('package.json', '"version": "0.4.23",', '"version": "0.4.24",')
add('package.json', 'node test/after-verdict.mjs && node test/keyboard.mjs', 'node test/after-verdict.mjs && node test/cli-rows.mjs && node test/keyboard.mjs')
add('CHANGELOG.md', '# Changelog\n\n## 0.4.23 (', '# Changelog\n\n## 0.4.24 (M2 game feel, sprint 15: a Portuguese leaderboard in the terminal)\n- In a Portuguese terminal game (node src/cli.js --lang pt) the leaderboard rows after the verdict now read "1. ana - 100 pontos (3 perguntas) [pt]", with "(1 pergunta)" for a single question; before, they kept the English "100 pts (3 Q)" under the Portuguese heading "Melhores pontuações" (reproduced on the Violin and the Night Train). English rows stay "100 pts (3 Q)".\n- The intro heading over the suspect list now reads "Suspeitos:" in Portuguese (it was "Suspects:").\n- New test/cli-rows.mjs with 6 checks. The automated suite now has 277 checks.\n\n## 0.4.23 (')
add('README.md', '**M2 in progress (v0.4.23, game feel sprint 14).**', '**M2 in progress (v0.4.24, game feel sprint 15).**')
add('README.md', 'the terminal verdict follows the language (Culpado, Pontuação in Portuguese).', 'the terminal verdict follows the language (Culpado, Pontuação in Portuguese), down to the leaderboard rows (100 pontos, 3 perguntas) and the Suspeitos heading.')
add('README.md', 'stay under US$0.10. 271 automated checks.', 'stay under US$0.10. 277 automated checks.')
add('docs/BUILD_LOG.md', '- Details and receipts: qa/rework.md (M2 game feel sprint 14).', '- Details and receipts: qa/rework.md (M2 game feel sprint 14).\n\n## M2 game feel sprint 15 (v0.4.24)\n\n- Scope: the terminal leaderboard rows ("pts", "(N Q)") and the intro heading ("Suspects:") follow the language; English output unchanged.\n- Reproduced first and checked after with tools/probe-gf15.mjs (mock mode, Violin and Night Train, EN and PT): before, every PT row read "100 pts (0 Q)" and the heading "Suspects:"; after, "100 pontos (0 perguntas)", "(1 pergunta)" and "Suspeitos:". CLI before and after in qa/m2gf15-probes/cli-*.txt.\n- Result: npm test 277/277 (was 271), new test/cli-rows.mjs 6 checks.\n- Details and receipts: qa/rework.md (M2 game feel sprint 15).')
add('docs/HOW_TO_PLAY.md', 'The verdict prints in the language of the game.', 'The verdict and the leaderboard print in the language of the game.')
add('docs/HOW_TO_PLAY.md', 'o veredito sai em português, com Culpado e Pontuação)', 'o veredito e o placar saem em português, com Culpado, Pontuação e "100 pontos (3 perguntas)")')
add('docs/SPEC.md', '## Web page and CLI: after the verdict (M2 game feel sprint 14)', '## CLI: leaderboard rows and intro heading (M2 game feel sprint 15)\n- `VERDICT_LINES[lang]` also holds `points` ("pts" / "pontos") and the question word (`q1` "Q" / "pergunta" for one, `qn` "Q" / "perguntas" otherwise); each Top Scores row prints `N. player - score points (questions word) [lang]` in the current language, whatever language the row was played in.\n- `SUSPECTS_HEADING[lang]` prints "Suspects:" or "Suspeitos:" over the suspect list.\n\n## Web page and CLI: after the verdict (M2 game feel sprint 14)')
add('docs/SPEC.md', 'English verdict unchanged)\n24. `node test/keyboard.mjs`', 'English verdict unchanged)\n24. `node test/cli-rows.mjs` (terminal leaderboard rows in PT with pontos and perguntas, (1 pergunta) and (0 perguntas), Suspeitos heading, Night Train in PT, English rows and heading unchanged with (1 Q) and (0 Q), no Portuguese in an English game)\n25. `node test/keyboard.mjs`')
add('docs/SPEC.md', 'Total checks: 271 (', 'Total checks: 277 (')
add('docs/SPEC.md', 'after-verdict 6, keyboard 13).', 'after-verdict 6, cli-rows 6, keyboard 13).')
if __name__ == '__main__':
    if sys.argv[1:] == ['apply']:
        for f, o, n in P:
            s = open(f).read(); assert s.count(o) == 1, (f, o[:60]); open(f, 'w').write(s.replace(o, n))
    json.dump(P, open('qa/m2gf15-probes/docs-pairs.json', 'w'), ensure_ascii=False, indent=1)
    print(len(P), 'pairs')
