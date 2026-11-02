# M1 rework: Case Files content via the Cup key (Essential tier), 2026-10-31

Tier: Essential (QA /models). Models: DeepSeek V4 Flash, Gemma 4 26B, GLM-4.7 Flash, GLM-5.3 Flash, Llama 4 Scout 17B, gpt-oss-120b.
The tier promises about $0.39 per agent hour (about 1.8M tokens, $0.79 per million tokens) and states "+150% rework margin for this tier". Advanced is +80%.

| # | Step | Model | Result | Retries / fails | Manual fixes | Lines changed by hand |
|---|------|-------|--------|-----------------|--------------|-----------------------|
| 1 | author-case (run 1, interrupted locally, output discarded) | gpt-oss-120b | 200, not used | 1 wasted | 0 | 0 |
| 2 | author-case (run 2) | gpt-oss-120b | 200, needed fixes: 6 issues (time contradiction, personas were only name and role, innocent implicated, clue from a non-suspect so fairPlay() failed, PT "lareira", facts not in role-play form) | 0 | 0 | 0 |
| 3 | revise-case, the 6 findings sent back through the key | gpt-oss-120b | 200, all 6 fixed, fairPlay() ok | 0 | 2 (PT accent "Sarcástica"; Tomás facts did not mention clue c6) | 2 |
| 4 | interrogations, 2 live playthroughs EN and PT | llama-4-scout | 9/9 = 200, in character, all clues surfaced, both verdicts correct | 0 | 0 | 0 |
| 5 | QA probes (models list, allowed model, 3 disallowed models) | glm-4.7-flash | as expected; 403 model_outside_capacity_class | 0 | 0 | 0 |

Totals: 3 authoring calls, 1 used as-is after 1 revision. Usable output was 1 of 2 completed authoring generations without revision (0%) and 100% after one revision pass. 2 manual lines out of about 150 lines of generated JSON (about 1.3%). Rework cost: 1 revise call (3,327 tokens).
Live quality nits, not fixed: PT Tomás said "sala da estufa" for the stove room, and PT Lia used "no tavern".
Lint (eslint recommended no-undef/no-unused-vars): 0 errors after removing 1 unused var. e2e (mock): 17/17.
Note: the game's wiring code (src/*.js, tools/*.mjs) was written by the agent. The key authored the content and runs the interrogations.

Verdict: worth it. The whole M1 content plus live play cost about $0.007 to $0.009 (11,140 tokens, 602 neurons). Rework stayed far under the 150% margin: one extra call, about 1.3x the authoring tokens.

## M1 sprint 2: PT-BR polish of live interrogations, 2026-11-01 00:10 UTC (Essential)
| # | Step | Model | Result | Retries / fails | Manual fixes | Lines changed by hand |
|---|------|-------|--------|-----------------|--------------|-----------------------|
| 6 | live playthrough EN+PT with PT glossary in the system prompt | llama-4-scout | 7/7 = 200, both PT nits gone ("sala do fogão", "lampião", "sala da lanterna do farol"; no English word), both verdicts correct (EN 95, PT 100) | 0 | 0 | 0 |
Prompt change by the agent (not by the key): `systemPrompt()` + `PT_GLOSSARY` in src/server.js, about 7 lines. New e2e case, 18/18.
Usage: 7 calls, 2,039 tokens (1,722 prompt, 317 completion), 66.8 neurons, well under $0.001.
New nit (not fixed yet): PT Lia said "botas todas fuliginosas" (valid but stiff; "sujas de fuligem" reads better).
FullCup observation: these are the first calls after the 2026-11-01 00:00 UTC batch-receipt cutover. Headers now carry x-fullcup-receipt-id and x-fullcup-seal-by 2026-11-02T00:05Z; x-fullcup-promise and its signature are gone. Interrogation latency fell from about 4.7 s median (8 calls, 31 Oct) to about 1.7 s median (7 calls).
Verdict: worth it. The fix is a prompt change, so it costs nothing extra per call beyond about 90 prompt tokens.

## M1 sprint 3: PT wording + keyboard accessibility, 2026-11-01 12:09 UTC (Essential)
| # | Step | Model | Result | Retries / fails | Manual fixes | Lines changed by hand |
|---|------|-------|--------|-----------------|--------------|-----------------------|
| 7 | live playthrough EN+PT, glossary now maps "covered in soot" to "sujas de fuligem" (8 interrogations + 1 GET /models) | llama-4-scout | 9/9 = 200. PT Lia said "as botas dela estavam sujas de fuligem" twice, no "fuliginosas"; no English words in PT; place terms right ("sala do fogão", "lampião", "sala da lanterna do farol"); both verdicts correct (EN 95, PT 95) | 0 | 0 | 0 |
Prompt change by the agent (not by the key): one glossary entry in `PT_GLOSSARY` (src/server.js, 1 line). Keyboard accessibility in public/index.html (labels, aria-live log, role=status verdict, aria-pressed on suspects and language toggle, focus-visible outline, type=button/submit, focus moves to the question box after choosing a suspect): about 10 lines. New tests: 2 e2e (20/20) + 5 real keyboard tests in headless Chrome over CDP (test/keyboard.mjs, 5/5). `npm test`: 25/25.
Usage: 9 calls, 2,531 tokens (2,192 prompt, 339 completion), 80.0 neurons, well under $0.001 at the neuron rate (about $0.002 even at the tier token rate).
Headers on every chat call: x-fullcup-receipt-id (same value also as legacy x-fullcup-receipt), x-fullcup-seal-by 2026-11-02T00:05:00Z, x-ratelimit-limit 60 / remaining 59→52 / reset at the next UTC minute. Receipt ULID time matches the request start (within about 100 ms) on all 8.
Latency: interrogation median 1.12 s (8 calls, range 0.77 to 2.12 s), down from 1.7 s in sprint 2. GET /models 0.55 s.
FullCup observations (no wrong status codes; no refused model since no probes ran this sprint): GET /models still returns no x-ratelimit-* or receipt headers (5 of 5 calls since 31 Oct), and no call carries a cost value (no usage.cost, no x-fullcup-cost), so per-call cost can only be estimated from tokens/neurons.
Verdict: worth it. The PT nit was fixed with one prompt line and zero rework; quality matches Essential for short role-play.

## M1 rebuild sprint 4: PT-BR wording + backer credits screen, 2026-11-02 00:08-00:58 UTC (Essential, gemma-4-26b-a4b-it)
| Call | Target | Model | Status | Latency | Tokens in/out | Neurons | Files | Lines | Accepted / rework |
|---|---|---|---|---|---|---|---|---|---|
| 71 | case.json PT | gemma-4-26b | 200 | 176.1 s | 2620/7579 | 230.5 | content/case.json | 4 | accepted |
| 72 | credits.json | gemma-4-26b | 200 | 9.4 s | 475/356 | 14.0 | data/credits.json | 13 | accepted |
| 73 | server /api/credits | gemma-4-26b | 200 | 48.3 s | 5320/4029 | 158.2 | src/server.js | 32 | accepted (rework in 92) |
| 74 | page | gemma-4-26b | 502 | 236.3 s | - | - | - | 0 | wasted |
| 75 | page (stream) | gemma-4-26b | 200 | 181.8 s | 0/1 | 0.03 | - | 0 | wasted |
| 76 | page (edits) | gemma-4-26b | 200 | 72.5 s | 3904/7987 | 253.3 | - | 0 | wasted (format) |
| 77 | page | gemma-4-26b | 502 | 236.1 s | - | - | - | 0 | wasted |
| 78 | page (full, effort low) | gemma-4-26b | 200 | 147.4 s | 3867/6857 | 222.2 | public/index.html | 309 | accepted |
| 79 | keyboard test | gemma-4-26b | 200 | 78.1 s | 8315/7407 | 277.6 | test/keyboard.mjs | 57 | accepted |
| 80 | page fix | gemma-4-26b | 502 | 236.5 s | - | - | - | 0 | wasted |
| 81 | page fix | gemma-4-26b | 200 | 166.9 s | 4592/7000 | 232.7 | - | 0 | wasted (truncated) |
| 82a-c | probes | gemma-4-26b | 200 | 1.6-5.2 s | 81/407 | 11.8 | - | 0 | QA probe |
| 83 | page fix | gemma-4-26b | 200 | 20.1 s | 4594/830 | 64.4 | index.html | 49 | rework (syntax) |
| 84 | page fix | gemma-4-26b | 200 | 29.6 s | 4680/1856 | 93.2 | index.html | 69 | accepted |
| 85 | page fix | gemma-4-26b | 200 | 15.3 s | 4547/628 | 58.5 | index.html | 37 | rework (focus) |
| 86 | page fix | gemma-4-26b | 200 | 12.5 s | 4586/480 | 51.3 | index.html | 17 | rework (regression) |
| 87 | page fix | gemma-4-26b | 200 | 22.6 s | 4597/892 | 55.1 | index.html | 37 | accepted |
| 88 | e2e checks | gemma-4-26b | 200 | 11.7 s | 9938/1175 | 122.4 | - | 0 | wasted (format) |
| 89 | e2e checks | gemma-4-26b | 200 | 29.8 s | 10015/1254 | 125.2 | test/e2e.mjs | 88 | accepted |
| 90 | e2e fix | gemma-4-26b | 200 | 15.6 s | 493/569 | 20.0 | - | 0 | wasted |
| 91 | e2e fix | gemma-4-26b | 200 | 6.3 s | 588/408 | 16.5 | test/e2e.mjs | 25 | accepted |
| 92 | server fix | gemma-4-26b | 200 | 41.9 s | 4017/1717 | 83.3 | src/server.js | 29 | accepted |
| 93 | SPEC | gemma-4-26b | 502 | 236.2 s | - | - | - | 0 | wasted |
| 94 | README | gemma-4-26b | 200 | 5.2 s | 323/171 | 7.6 | README.md | 1 | accepted |
| 95 | SPEC | gemma-4-26b | 200 | 19.3 s | 1554/793 | 35.8 | docs/SPEC.md | 15 | accepted (nit) |
| 96 | SPEC fix | gemma-4-26b | 200 | 6.0 s | 1333/198 | 17.5 | - | 0 | wasted (format) |
| 97 | SPEC fix | gemma-4-26b | 200 | 73.2 s | 1397/3000 | 88.7 | - | 0 | wasted (loop) |
| 98 | SPEC fix | gemma-4-26b | 200 | 30.0 s | 1321/1158 | 43.6 | docs/SPEC.md | 94 | partly (heading fixed by hand) |

Totals: 30 calls (27 harness + 3 probes), 11 wasted, 83 157 / 56 752 tokens, 2 283 neurons (~US$ 0.025). Rework share: about 40% of neurons (909 of 2 283) went to wasted or reworked calls.
Manual lines: 0 product code; 1 doc line (+1 blank) in docs/SPEC.md; 1 config line in .gitignore.
npm test 67/67 (was 58). Live smoke via key OK (EN + PT ask, accuse, credits).
Verdict: worth it, the result is better than before (two real bugs from earlier sprints found and fixed by the model's own new tests: PT case text never loaded in the page, and focus handling), but gemma-4-26b needs thinking off (chat_template_kwargs.enable_thinking=false) and small edit tasks, or calls die at the ~236 s proxy cutoff.
