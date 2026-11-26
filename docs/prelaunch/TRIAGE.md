# Case Files pre-launch QA: triage (v1.0.0 -> v1.0.1, branch m1-via-key, local only)

All model calls went through the Case Files Cup key and are logged in qa/key-usage-log.json (purposes prelaunch-*) and qa/build-log.json (labels prelaunch-01..05). Spend for this QA: about US$0.2375 (play bots US$0.2163, vision bots US$0.0161, build US$0.0050). No image generation.

## 1. Stress test (tools/stress-server.mjs + tools/stress-bots.mjs, results in stress/)
| run | load | before fix | after fix |
|---|---|---|---|
| fake upstream (200-1200 ms, ~4% 429, ~4% 502) | 10/50/100/200 bots | over-budget answers in 2/10/20/40 sessions (every burst bot), up to 15 answers on a budget of 10; ask p50 420-520 ms, p95 1.11-1.15 s; RSS 155 MB | 0 over-budget at every stage; p50 320-360 ms, p95 1.11-1.14 s; RSS 121 MB |
| mock upstream | 10-400 bots, then 200 + 5x400 (~4400 sessions) | ~5000 rps, ask p95 < 50 ms, 0 errors; sessions never freed | 0 anomalies, p95 3.6-49.6 ms, RSS ~98 MB stable |
| ask after verdict | | 200 (paid call after the game ended) | 409 already_accused |
| bad inputs (unknown session, suspect, empty or 10 kB question, bad JSON) | | always 400 | always 400 |

| # | finding | severity | decision |
|---|---|---|---|
| S1 | parallel questions passed the budget (race: budget read before the reply came back) | high (cost leak, unfair score) | FIXED: pending counter, budget = questions + pending |
| S2 | ask after the verdict still called the model | medium (cost leak) | FIXED: 409 already_accused |
| S3 | sessions never expired (memory grows with every visitor) | medium | FIXED: TTL 2 h, max 5000 sessions, sweep on new session |
| S4 | a short 429 from the Cup proxy failed the question at once | low | FIXED: one retry when retry-after <= 8 s (not on capacity:empty) |
| S5 | the key allows 60 requests per minute for the whole game (about 60 questions per minute across all players) | launch risk | LATER, needs Felipi: per-IP session limit and daily cap on the launch host; watch 429s at launch |

## 2. Vision bots (tools/vision-bots.mjs, notes/ and notes-after/)
Models allowed by the key with vision: gemma-4-26b-a4b-it, llama-4-scout-17b-16e-instruct, glm-5.3-flash (502 workers_ai_unavailable twice, fell back to gemma). Refused by the key (403 model_outside_capacity_class): llama-3.2-11b-vision, llava-1.5-7b, gemma-3-12b, mistral-small-3.1-24b. gpt-oss-120b, glm-4.7-flash and deepseek-v4-flash have no vision. Evidence: vision-probe.json.
6 personas (casual-mobile and first-time-user on llama-4-scout; detective-game-fan, accessibility-reviewer, pt-native-player, visual-designer on gemma): 41 screen reviews + 6 summaries, 90 screenshots (15 screens x 1280/768/390 x EN/PT). After the fixes, a 7th check (fix-verifier) looked at 6 after shots.

| # | suggestion / bug (bots) | decision | reason |
|---|---|---|---|
| V1 | verdict top "overlaps" / cut off at 768+ (visual-designer, detective-fan, first-time) | FIXED | real: first child at -472 px, not reachable by scroll; now at 81 px (flex 1 0 auto + safe center), test/prelaunch-ui |
| V2 | no backdrop behind CONTINUE?/GAME OVER (visual-designer, casual-mobile) | FIXED | real: page behind was fully readable; added a 72% dark backdrop |
| V3 | "Game over" wording after a win (first-time, pt-native) | FIXED | real: it read like a loss; now "This game is over. Press Start over..." EN/PT |
| V4 | PT page says "em ingles" | REJECTED | it lists both languages by design |
| V5 | truncated rows and decimal comma on /costs | REJECTED | measured: no truncation, PT already uses comma |
| V6 | "Caso gerado" badge over the card | REJECTED | no overlap in the DOM boxes |
| V7 | typo "incenotados", Ines without accent | REJECTED | text not in the build; accent shown (model misread pixels) |
| V8 | credits modal over the scoreboard | REJECTED | it sits below; the real issue was the backdrop (V2) |
| V9 | low contrast of dim text | REJECTED | #C9BFAE on #0C0B0A is about 11:1; test/legibility covers it |
| V10 | confirm checkbox 20x20 target | REJECTED | the label row is 44 px high and clickable; my metric measured the input alone |
| V11 | Locations tab shows the timetable; two "Seu recorde" lines; narrow input at 390 | REJECTED | by design (one record per language) / fine when checked |
| V12 | fix-verifier still saw clipping and no backdrop on the after shots | REJECTED | checked the after PNGs by eye and by DOM metrics: verdict top visible, backdrop present; the persona text named the bugs, so the model repeated them |
| V13 | tutorial/onboarding, lineup UI, drag-and-drop board, scanlines, zebra rows on /costs, "Read more" on cards, clue summary on Accuse, better empty board, "Carregador noturno" wording | LATER | good ideas but new features or copy changes, not launch blockers |
| V14 | generated cases share the same cover art (Samba card shows the Lapa bookshop) | LATER | needs new art; no image budget spent now |

## 3. Difficulty (tools/llm-players.mjs, brain gemma-4-26b, suspects live llama-4-scout through the real server)
Data: players.json (82 valid games r1-r3, old hints), players-after.json (r4, hints v1), players-after2.json (r5, hints v2, 10 games), players-after3.json (r6, + suspect rule), players-after4.json (r7, 16 games, harness fixed). Reports: DIFFICULTY.md (r1-r3), DIFFICULTY-r7.md.

Main numbers (r1-r3, old v1.0.0 scoring): win EN 86%, PT 97%; Violin 96% (mean 79.2, median 80, p10 75, p90 96), Night Train 81% (mean 59.5, median 70, p10 0, p90 85), Lapa 94% (73.3), Samba 94% (75). Methodical won 100%.
Harness correction: every loss in r2-r6 was a reasonless accusation. At the question cap the brain still sent an ask, and the harness accused that ask target. Fixed (one accusation-only retry). r7 with the fix: 16/16 wins (careless and average, all 4 cases, EN/PT), mean score 92.5-95. So the bot-measured confusion (Night Train: Tomas, Victor, Helena; Samba: Lucas) is mostly a harness artifact. Real confusers seen in transcripts: live suspects inventing alibis and sightings (Samba: Beatriz said Marta was with her at 23:50; Lapa: Daniela and Arthur contradict each other).

| # | finding | decision | reason |
|---|---|---|---|
| D1 | v1.0.0 scoring: a blind 0-question guess expects 27.1 and can score 100; careless (75) beat methodical (69.7) | FIXED | hunch < 2 questions = 25; free questions = fair minimum (Violin 4, others 5). New EV: careless 75, average 77.2, methodical 78.4, blind 6.8 |
| D2 | both generated cases' 45 s hint named the culprit's role (heel -> dancer, gloves...) | FIXED | hints rewritten twice; generator gate hintLeak() rejects hints naming the culprit or listing all innocents |
| D3 | suspects invent where others were (false alibis that talk a careful player out of the right answer) | FIXED | systemPrompt rule: never invent another person's place, time or action beyond your facts; test in prelaunch-difficulty |
| D4 | question budgets 8/10 | KEEP | methodical used the whole budget 63% and still won 100%; no loss came from running out |
| D5 | guard that blocks accusing before any clue | REJECTED | keyword clue detector missed the culprit in 42 of 75 wins; it would block fair players |
| D6 | game looks easy for an LLM (hints given at the start, upper bound) | LATER | balance across cases is even after the fixes; real human playtest after launch before making it harder |

## 4. Rework disclosure
Gemma build calls prelaunch-01..05: 01 echoed the prompt, 02 looped 22 blocks, 04 applied 4 of 5 blocks, 05 wrong format. The PO applied server/proxy/scoreboard/generator/CSS edits by hand and kept the gemma tests from 03 and 05 after small fixes. See qa/rework.md.
