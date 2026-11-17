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

## M1 rebuild sprint 5: consistent suspects + waste cut, 2026-11-02 12:07-12:22 UTC (09:07-09:22 BRT) (Essential, gemma-4-26b-a4b-it, thinking off)
All build calls: `chat_template_kwargs.enable_thinking=false` (NOTHINK=1), max_tokens 400-5000 sized to the task (was 16000), one small task per call, requirements only (no pre-rebuild code).
| Call | Target | Model | Status | Latency | Tokens in/out | Neurons | Files | Lines | Accepted / rework |
|---|---|---|---|---|---|---|---|---|---|
| 99 | case.js systemPrompt (edit block) | gemma-4-26b | 200 | 11.9 s | 985/565 | 24.36 | src/case.js | 30 | wasted: re-declared `let prompt` + duplicated glossary (SyntaxError) |
| 100 | case.js fix | gemma-4-26b | 200 | 6.3 s | 1027/330 | 18.34 | src/case.js | 1 | wasted: removed both copies, `prompt` undeclared |
| 101 | case.js fix | gemma-4-26b | 200 | 3.7 s | 762/134 | 10.58 | src/case.js | 6 | wasted: lost suspect name, made-up glossary; reverted 99-101 |
| 102 | case.js, full file | gemma-4-26b | 200 | 44.2 s | 2274/1915 | 70.57 | src/case.js | +24 | accepted |
| 103 | server.js history (user+assistant) | gemma-4-26b | 200 | 2.6 s | 287/64 | 4.35 | src/server.js | 1 | accepted |
| 104 | test/consistency.mjs + package.json | gemma-4-26b | 200 | 72.3 s | 1163/3007 | 92.58 | 2 files | 261+1 | accepted (rework 105-107) |
| 105 | consistency fix (.mjs imports) | gemma-4-26b | 200 | 8.0 s | 253/98 | 4.97 | test/consistency.mjs | 2 | accepted (rework of 104) |
| 106 | consistency fix (cast parse, counter) | gemma-4-26b | 200 | 5.0 s | 404/215 | 9.54 | test/consistency.mjs | 5 | accepted, but test hung (unclosed server) |
| 107 | consistency fix (close, exit, summary) | gemma-4-26b | 200 | 1.9 s | 362/123 | 6.65 | test/consistency.mjs | 4 | accepted, 4/4 |
| 108 | test/live-consistency.mjs | gemma-4-26b | 200 | 59.6 s | 1182/2547 | 80.21 | test/live-consistency.mjs | 239 | accepted (rework 109-110: syntax, dummy baseUrl, exit skipped finally) |
| 109 | live smoke fix, full file | gemma-4-26b | 200 | 48.0 s | 3013/2533 | 96.47 | test/live-consistency.mjs | 239 | accepted (receipts still from wrong response) |
| 110 | live smoke fix (receipts) | gemma-4-26b | 200 | 5.0 s | 302/180 | 7.65 | - | 0 | format: `=======` (7 =); content right, harness re-parse 110-reparse applied it (2 occurrences) |
| 112 | README status + CHANGELOG 0.2.4/0.2.3 | gemma-4-26b | 200 | 7.8 s | 720/364 | 16.47 | README.md, CHANGELOG.md | 1+13 | accepted with nit (1 bullet said "to prevent repeating questions", reworded by hand) |
| live x10 | test/live-consistency.mjs EN+PT (maya x3, carlos x2 per lang) | llama-4-scout | 10/10 200 | median 1.62 s (1.12-1.84) | 5159/346 | 153.37 | qa/live-consistency-sprint5.txt | - | 10/10 checks pass |
| probes x3 | GET /models, disallowed model, /v1/receipts/{id} | - | 200 / 403 / 404 | 0.39-0.44 s | 0 | 0 | - | - | QA probe |

Totals: 26 requests (13 build + 10 live + 3 probes), 17 893 in / 12 421 out tokens, 596.1 neurons, about US$ 0.0066 at $0.011/1k neurons.
Build only: 13 calls, 12 734 / 12 075 tokens, 442.8 neurons. Wasted calls 3 (99-101, 53.3 neurons, 12% of build neurons), 0 API failures, 0 x 502, slowest call 72.3 s (sprint 4: 30 calls, 11 wasted, 5 API failures, 2 283 neurons, four calls killed at ~236 s). Rework share (wasted + calls that fixed the model's own bugs: 99-101, 105-107, 109, 110): 178.6 of 442.8 build neurons = 40%. Same share as sprint 4, but on a fifth of the neurons and no proxy failures.
Lesson: with thinking off, gemma-4-26b gets sloppy on literal edit blocks against code it has to re-quote (99-101); a full small file (102) or a one-line anchor (103) works first time.
Root cause found and fixed: systemPrompt never sent the suspect's private facts or clues to the model, and the server history stored only answers (never questions). That is why Maya "noticed nothing" about the lock and Carlos invented "Joe the janitor". Mutation check: with the old src, test/consistency.mjs fails 2 of 4.
Manual lines: 0 product code. 1 CHANGELOG bullet reworded + 1 blank line (docs). 2 harness lines in tools/build-via-key.mjs (accept `={5,}` as the separator, tooling only).
npm test: 71/71 (e2e 42, proxy 12, consistency 4 new, keyboard 13; was 67). Live smoke 10/10.
Verdict: worth it. Equal or better: the two live nits are gone in both languages, with the same tests still green plus 4 new tests.
Receipts (seal-by 2026-11-03T00:05:00Z): build 01M6E2G7BETE0J2P5B66P80CXV, 01M6E2GXDTS1HFH4TYYE4RWW50, 01M6E2HFP7VYFA4W401QF9XPY2, 01M6E2J27V8SKX9RBETVRTXJ14, 01M6E2KNBM6KPFW27DBZJPTAZP, 01M6E2MQAHCN65M3HB3N9EXMF1, 01M6E2Q44A3SC299WVRV5D943R, 01M6E2QVM9AN9P6WP1CCP5NRZE, 01M6E309XX37PFFXQQNPYH9V1J, 01M6E31B34W00VF89WD6JTRBW0, 01M6E33XCYJRDHBJJ01ZTR6HNP, 01M6E35SGGSFD2RYSJQ0TZ43R5, 01M6E387FVDM4S6Y7VJFN7454V; live 01M6E369DN79FAQ0RVGJYFJGSM .. 01M6E36PN5HD4PQ9V52JA7HQEX (10, listed in qa/live-consistency-sprint5.txt).

### FullCup observations, sprint 5
- Reproduced: GET /v1/models returns no x-ratelimit-* and no receipt headers (1 of 1 this sprint, 6 of 6 since 31 Oct).
- Reproduced: error body shape is flat, outside the documented `{"error":{"message","code"}}`: 403 `{"error":"model_outside_capacity_class","message":"...","allowed":[6 models]}` (1 of 1), no receipt id, x-ratelimit-* present.
- Reproduced: no API receipt endpoint, GET /v1/receipts/{id} 404 (1 of 1).
- Reproduced: no per-call cost anywhere (26 of 26), cost only from neurons.
- Reproduced: duplicate receipt headers x-fullcup-receipt (legacy) + x-fullcup-receipt-id on every chat 200 (23 of 23).
- Reproduced: chat_template_kwargs.enable_thinking=false is honoured by gemma-4-26b (13 of 13, no reasoning text), still undocumented in /v1/models.
- Not reproduced: 502 workers_ai_unavailable at ~236 s and empty 200 stream (0 of 13; no call ran past 73 s, no stream used). So the cutoff waste is avoidable on the client side, but the proxy behaviour itself is unchanged as far as we know.
- New, low: usage.prompt_tokens_details.cached_tokens 512 on call 102 (prompt cache hit reported, 1 of 13); check whether cached tokens are billed at a lower neuron rate.

## M1 rebuild sprint 6: player guide + fair capacity messages, 2026-11-03 00:06-00:13 UTC (02/11 21:06-21:13 BRT) (Essential, gemma-4-26b-a4b-it, thinking off)
| Call | Target | Model | Status | Latency | Tokens in/out | Neurons | Files | Accepted / rework |
|---|---|---|---|---|---|---|---|---|
| 113 | messages.js EN/PT texts | gemma-4-26b | 200 | 12.2 s | 781/465 | 19.78 | src/messages.js | accepted |
| 114 | server.js count only on success | gemma-4-26b | 200 | 3.9 s | 362/115 | 6.43 | src/server.js | accepted |
| 115 | test/capacity.mjs | gemma-4-26b | 200 | 68.8 s | 1088/3056 | 93.24 | test/capacity.mjs | accepted, 3/6 (test bugs) |
| 116 | capacity fix, full file | gemma-4-26b | 200 | 58.2 s | 3505/2520 | 100.59 | test/capacity.mjs | rework, 5/6 |
| 117 | capacity fix, one line | gemma-4-26b | 200 | 3.2 s | 233/84 | 4.41 | test/capacity.mjs | rework, 6/6 |
| 118 | package.json test script | gemma-4-26b | 200 | 3.4 s | 197/102 | 4.57 | package.json | accepted |
| 119 | docs/HOW_TO_PLAY.md | gemma-4-26b | 200 | 18.1 s | 880/914 | 32.93 | docs/HOW_TO_PLAY.md | accepted with 7 review findings |
| 120 | guide review fixes | gemma-4-26b | 200 | 10.5 s | 1327/1062 | 41.03 | docs/HOW_TO_PLAY.md | accepted, 1 regression |
| 121 | guide regression fix | gemma-4-26b | 200 | 2.7 s | 226/84 | 4.35 | docs/HOW_TO_PLAY.md | rework, accepted |
| 122 | no_capacity wording | gemma-4-26b | 200 | 3.5 s | 226/73 | 4.05 | src/messages.js | accepted (polish) |
| 123 | SPEC counting rule | gemma-4-26b | 200 | 4.4 s | 248/119 | 5.50 | docs/SPEC.md | accepted |
| 124 | README status + guide link | gemma-4-26b | 200 | 7.4 s | 519/283 | 12.44 | README.md | accepted |
| 125 | CHANGELOG 0.2.5 | gemma-4-26b | 200 | 3.6 s | 343/105 | 5.98 | CHANGELOG.md | accepted (nit: double blank line) |
| live x2 | EN Maya, PT Carlos + PT accuse | llama-4-scout | 200, 200 | 2.1 / 1.9 s | 921/99 | 30.26 | qa/live-smoke-sprint6.json | pass |
| probes x3 | GET /models, GET /v1/receipts/{id}, disallowed model | - | 200 / 404 / 403 | 0.10-0.76 s | 0 | 0 | - | QA probe |

Totals: 18 requests (13 build + 2 live + 3 probes), 10 856 in / 9 081 out tokens, 365.5 neurons, about US$ 0.0040 at $0.011/1k neurons. Build only: 13 calls, 9 935 / 8 982 tokens, 335.3 neurons. Wasted 0, rework 3 (116, 117, 121) = 109.4 neurons (33% of build; sprint 5: 40%), 0 API failures, 0 x 502, slowest 68.8 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s6.mjs (new, PO tooling, logs headers, never the key).
npm test: 77/77 (was 71). Note: the first baseline run before any change hit a one-off keyboard.mjs "Timeout" (cold headless Chrome); all 4 later runs 13/13.
Verdict: worth it. Players now get a clear EN/PT message when capacity runs out and a failed question no longer lowers their score (a real fairness bug since sprint 1, found while writing the guide); 6 new checks; players have a guide.
Receipts (seal-by 2026-11-04T00:05:00Z), 15, first..last: 01M6FBKZM0CFTPR25YCA4QTF0J (113) .. 01M6FBZE8KQJSBK8Q82ME2YXQM (live PT). All ids in qa/key-usage-log.json (purpose sprint6-*).

### Seal check of earlier receipts (public page, curl)
- 00:05:38 UTC (33 s after seal-by 2026-11-03 00:05Z): 01M6E2G7BETE0J2P5B66P80CXV, 01M6CSVT02GTYBSMQW8HG2X7N1, 01M6E387FVDM4S6Y7VJFN7454V still said "Recorded, waiting for the daily seal, will be sealed on 2026-11-03 00:05 UTC".
- 00:12:35 UTC: all three plus 01M6E369DN79FAQ0RVGJYFJGSM (sprint 5 live) and 01M6A72KQ3M2KM8082JCC4S4HN (sprint 2) show "Genuine receipt", "one of 53 in the signed root of 2026-11-02", root signature matches the FullCup key. Sprint 6 receipts show "waiting for the daily seal, will be sealed on 2026-11-04 00:05 UTC".

### FullCup observations, sprint 6
- Reproduced: no per-call cost (15 of 15 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (15 of 15).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers, and still lists only id/object/owned_by (no capabilities, enable_thinking undocumented) (1 of 1).
- Reproduced: chat_template_kwargs.enable_thinking=false honoured by gemma-4-26b (13 of 13, no reasoning text).
- Reproduced: 403 model_outside_capacity_class body still flat `{"error":"model_outside_capacity_class","message","allowed":[6]}`, no receipt, x-ratelimit-* present (1 of 1).
- Changed: GET /v1/receipts/{id} still 404, but the body is now OpenAI-style nested `{"error":{"message","type":"invalid_request_error","param":null,"code":"unsupported_endpoint"}}` (sprint 5: flat `{"error":"not_found"}`). So error shapes are now mixed: 404 nested, 403 flat. The message also lists POST /v1/responses as supported (not in our prompts/_api.md).
- New, low: seal lag. At 00:05:38Z the public page still promised sealing "on 2026-11-03 00:05 UTC" (a time already past); sealed by 00:12:35Z. Lag under 7 minutes.
- Not reproduced: 502 workers_ai_unavailable at ~236 s and empty 200 stream (0 of 15; slowest call 68.8 s, no stream).
- cached_tokens 0 on 15 of 15.

## M1 sprint 7: scoreboard polish (personal best per language), 2026-11-03 12:05-12:12 UTC (Essential)
Model gemma-4-26b-a4b-it, thinking off, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Lines | Result |
|---|---|---|---|---|---|---|---|---|
| 126 | public/best.js | 200 | 25.0 s | 777 / 1142 | 38.2 | public/best.js | 128 | accepted, 1 bug found by test (131) |
| 127 | server GET /best.js | 200 | 4.7 s | 372 / 188 | 8.5 | src/server.js (2 edits) | 5 | rework: fs.sendFile + writeHead crash |
| 128 | test/scoreboard.mjs | 200 | 67.7 s | 1368 / 3212 | 100.0 | test/scoreboard.mjs | 225 | accepted with test bugs |
| 129 | test fix (now as ISO string, dead helpers) | 200 | 48.9 s | 3659 / 2866 | 111.4 | test/scoreboard.mjs | full | rework, accepted 8/10 |
| 130 | server fix | 200 | 3.4 s | 267 / 88 | 4.8 | src/server.js | 2 | rework, accepted |
| 131 | best.js fix (reuse readBest) | 200 | 3.3 s | 1438 / 107 | 16.0 | public/best.js | 1 | rework (real product bug), accepted |
| 132 | test fix (no-op throw check) | 200 | 1.1 s | 262 / 112 | 5.4 | test/scoreboard.mjs | 1 | rework, accepted 9/10 |
| 133 | page: best section, counter, reset | 200 | 17.4 s | 4292 / 948 | 64.9 | index.html (8 blocks, 6 applied) | 33 | 1 bad separator swallowed 1 block |
| 134 | page fix: resend 2 blocks | 200 | 4.9 s | 304 / 173 | 7.5 | index.html | 8 | rework: added `hidden` |
| 135 | page fix: visible + test check | 200 | 4.2 s | 374 / 177 | 8.2 | index.html, test | 4 | rework, 10/10 |
| 136 | package.json | 200 | 2.9 s | 213 / 118 | 5.2 | package.json | 1 | accepted |
| 137 | CHANGELOG, README, SPEC, HOW_TO_PLAY | 200 | 14.2 s | 772 / 585 | 23.0 | 4 files (5 edits) | 17 | accepted |
| live | smoke EN Maya + PT Carlos | 200 x2 | 3.1 / 2.3 s | 921 / 107 | 30.9 | - | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.5-1.0 s | 0 | 0 | - | - | QA probe |

Totals: 17 requests (12 build + 2 live + 3 probes), 15 019 in / 9 823 out tokens, 424.0 neurons, about US$ 0.0047 at $0.011/1k neurons. Build only: 12 calls, 14 098 / 9 716 tokens, 393.2 neurons. Wasted 0, rework 6 (129, 130, 131, 132, 134, 135) = 153.3 neurons (39% of build; sprint 6: 33%), 0 API failures, 0 x 502, slowest 67.7 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s7.mjs (copy of smoke-s6 with sed, plus best.js check on the accusation; PO tooling, logs headers, never the key).
npm test: 87/87 (was 77).
Verdict: worth it. Players see their own best per language, how many questions they used, and can clear it safely; the test caught one real product bug (131) and one invisible-section regression (135).
Receipts (seal-by 2026-11-04T00:05:00Z), 14, first..last: 01M6GMR2XW1XCNVWR07CRQ72CF (126) .. 01M6GN4GBX439MBEZEJP2Q6ZYC (137); live 01M6GN3DF6C8HXB3M61WGRX632, 01M6GN3G8E8K1PQT999CVMC7V6. All ids in qa/key-usage-log.json (purpose sprint7-*).

### FullCup observations, sprint 7 (evidence qa/s7-probes/)
- Reproduced: no per-call cost (14 of 14 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (14 of 14).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers, still only id/object/owned_by (models.h, models.json).
- Reproduced: GET /v1/receipts/{id} 404, nested OpenAI-style body (receipt.json), while 403 model_outside_capacity_class stays flat (disallowed.json): mixed error shapes.
- Reproduced: enable_thinking=false honoured by gemma-4-26b (12 of 12).
- No new anomaly. Log fix only: sprint 6 key-usage-log stored `allowed: 6`; the real 403 body has `allowed` as an array of 6 model ids.
- cached_tokens 0 on 14 of 14, including 129 which resent the same file as 128.

## M1 sprint 8: best line wording + new best announcement, 2026-11-04 00:02-00:06 UTC (03/11 21:02-21:06 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 1000-1500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 138 | best.js: bestText(lang, entry, ui) + LABELS.newBest | 200 | 34.3 s | 728 / 1345 | 43.3 | public/best.js | wasted: 4 duplicate bestText versions with thinking-aloud comments (prompt used ${name}/${nome} placeholders, too loose); discarded with git checkout |
| 139 | retry with explicit NAMES table + examples | 200 | 10.5 s | 796 / 592 | 23.4 | public/best.js (3 edits) | accepted (JSDoc default said 'en', fixed in 142) |
| 140 | page passes ui lang, announces new best, remove sThrow, test 11 | 200 | 7.7 s | 912 / 643 | 25.8 | index.html (2), scoreboard.mjs (2); best.js JSDoc block did not match | accepted 4/5, test used assert.strictEqual (not in file) |
| 141 | test 11 fix: local assert | 200 | 24.6 s | 548 / 683 | 23.6 | test/scoreboard.mjs | rework, green, but every message "msg" |
| 142 | specific assert messages + JSDoc [ui=lang] | 200 | 19.4 s | 648 / 704 | 25.1 | best.js, scoreboard.mjs | rework, accepted |
| 143 | CHANGELOG 0.2.7, README, SPEC, HOW_TO_PLAY | 200 | 9.8 s | 625 / 424 | 17.2 | 4 files (7 edits) | accepted with whitespace damage (empty line after =======, split paragraphs) |
| 144 | docs whitespace fix | 200 | 17.4 s | 802 / 863 | 30.8 | 4 files (5 edits) | rework, accepted |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 3.9 / 2.3 s | 921 / 105 | 30.7 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.1-0.2 s | 0 | 0 | - | QA probe |

Totals: 12 requests (7 build + 2 live + 3 probes), 5 980 in / 5 359 out tokens, 220.0 neurons, about US$ 0.0024 at $0.011/1k neurons. Build only: 7 calls, 5 059 / 5 254 tokens, 189.3 neurons. Wasted 1 (138) = 43.3 neurons (23% of build); rework 3 (141, 142, 144) = 79.5 neurons (42% of build; sprint 7: 39%); wasted + rework 65%. 0 API failures, slowest 34.3 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s8.mjs (smoke-s7 via sed, adds cross-language best lines), tools/probe-s8.mjs (3 probes, logs headers, never the key). Nits left as generated: CHANGELOG.md now starts with 2 empty lines, README has 2 empty lines before the status line (both render the same).
npm test: 88/88 (was 87). Mutation check: new test 11 fails on the sprint 7 best.js.
Verdict: worth it, but the costliest sprint per line changed. Lesson: give gemma exact tables and examples, never template placeholders, and warn it about the empty line after the separator.
Receipts (seal-by 2026-11-05T00:05:00Z), 9, first..last: 01M6HXSZB17G8ZQ2FSC0WT1A9W (138) .. 01M6HY015ZQTN8YY3Z0FTDKSFD (144); live 01M6HY0QNT36A43HHEMRRM5CH4, 01M6HY0V084JNZQ3556CTBNXJV. All ids in qa/key-usage-log.json (purpose sprint8-*).

### FullCup observations, sprint 8 (evidence qa/s8-probes/)
- Reproduced: no per-call cost (9 of 9 chat 200s, no usage.cost or cost header). The public receipt page does show "Exact cost" per call (s7 137: $0.000253).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (9 of 9).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers, still only id/object/owned_by.
- Reproduced: mixed error shapes, 404 /v1/receipts/{id} nested {"error":{code:"unsupported_endpoint"}}, 403 model_outside_capacity_class flat with allowed array of 6 ids.
- Reproduced: enable_thinking=false honoured (7 of 7, no reasoning in output; 138 thought aloud inside code comments, which is a prompt problem, not thinking).
- Known, seen again: x-ratelimit-reset already in the past on arrival for a 34 s call (138: reset 00:03:00Z, response 00:03:19Z). The window is per UTC minute, so any call that crosses the minute shows it, not only calls over 150 s.
- No new anomaly. cached_tokens 0 on 9 of 9.
- Seal check 2026-11-04 00:06:23Z (signed out): sprint 6 (01M6FBKZM0CFTPR25YCA4QTF0J, 01M6FBZE8KQJSBK8Q82ME2YXQM) and sprint 7 (01M6GMR2XW1XCNVWR07CRQ72CF, 01M6GN4GBX439MBEZEJP2Q6ZYC) all "Genuine receipt, one of 29 in the signed root of 2026-11-03" (15 s6 + 14 s7 chat receipts = 29, matches). Seal lag under 1.5 min (sprint 5: under 7 min).

## M1 sprint 9: scoreboard names as plain text + doc nits, 2026-11-04 12:07-12:09 UTC (04/11 09:07-09:09 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 200-1500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 145 | index.html loadScores cells via textContent + test 12 (fake DOM runs loadScores with `<img src=x onerror=alert(1)>`) | 200 | 15.9 s | 1004 / 701 | 28.25 | public/index.html, test/scoreboard.mjs | accepted (nit: forEach body indented 8 spaces instead of 6) |
| 146 | CHANGELOG 0.2.8 + top empty lines, README status v0.2.8 / 89 checks / one empty line, SPEC scoreboard bullet + blank before heading | 200 | 8.1 s | 850 / 335 | 16.86 | 3 files (5 edits) | accepted 4.5/5: CHANGELOG OLD had 1 empty line instead of 2, so 1 leading empty line was left |
| 147 | CHANGELOG remove last leading empty line (REPLACE with =====) | 200 | 1.5 s | 196 / 36 | 2.76 | CHANGELOG.md | wasted: block split in two, NEW empty, deleted `# Changelog`; discarded (git checkout + REPARSE of 146 for CHANGELOG only, no new call) |
| 148 | same as unified-diff hunk (`@@`, `-` empty line, ` # Changelog`) | 200 | 2.4 s | 218 / 22 | 2.58 | CHANGELOG.md | rework, accepted |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 5.9 / 3.9 s | 921 / 109 | 31.03 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.07-0.54 s | 0 | 0 | - | QA probe |

Totals: 9 requests (4 build + 2 live + 3 probes), 3 189 in / 1 203 out tokens, 81.5 neurons, about US$ 0.0009 at $0.011/1k neurons. Build only: 4 calls, 2 268 / 1 094 tokens, 50.5 neurons. Wasted 1 (147) = 2.8 neurons (5% of build); rework 1 (148) = 2.6 neurons (5% of build; sprint 8: 42%); wasted + rework 11%. 0 API failures, slowest 15.9 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s9.mjs, tools/probe-s9.mjs (smoke-s8 / probe-s8 via sed; log headers, never the key). Nit left as generated: the new forEach body in loadScores is indented 8 spaces (file style is 6); renders and runs the same.
npm test: 89/89 (was 88). Mutation check: new test 12 fails on the sprint 8 index.html ("four cells", the old row had 0 td children because it used innerHTML).
Verdict: worth it, cheapest sprint so far. Real bug fixed: any player name with HTML (24 chars is enough for `<img src=x onerror=...>`) ran as HTML on every player's scoreboard. Lesson: a leading empty line is hard to express in a `=====` block; the `@@`/`-` hunk format did it in one call.
Receipts (seal-by 2026-11-05T00:05:00Z), 6, first..last: 01M6K79REJ3CPFMAKP9PPEN9EZ (145) .. 01M6K7CP5AWA1ASMMRHGDNWBAX (live PT); build 01M6K79REJ3CPFMAKP9PPEN9EZ, 01M6K7ATS20V8JQ552Y5BEK30X, 01M6K7BEH4P5WQVFE6P08DM3AK, 01M6K7C0MNH44NC4GT5SMJEV44; live 01M6K7CGWX7R7QCJ656XNZ2S5H, 01M6K7CP5AWA1ASMMRHGDNWBAX. All ids in qa/key-usage-log.json (purpose sprint9-*).

### FullCup observations, sprint 9 (evidence qa/s9-probes/)
- Reproduced: no per-call cost (6 of 6 chat 200s, no usage.cost or cost header). Public receipt page shows "Exact cost" (145: $0.000311 = 28.25 neurons x $0.011/1k, consistent).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (6 of 6).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers, still only id/object/owned_by (models.h, models.json).
- Reproduced: mixed error shapes, 404 /v1/receipts/{id} nested {"error":{code:"unsupported_endpoint"}}, 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* present on the 403.
- Reproduced: enable_thinking=false honoured (4 of 4, no reasoning text).
- Reproduced: cached_tokens 0 on 6 of 6.
- Not seen: x-ratelimit-reset in the past (no call crossed a UTC minute boundary this sprint).
- No new anomaly. Seal check 12:09Z (signed out): s8 01M6HXSZB17G8ZQ2FSC0WT1A9W and s9 01M6K79REJ3CPFMAKP9PPEN9EZ both "Recorded, waiting" (seal-by 2026-11-05 00:05 UTC, not due yet).

## M1 sprint 10: tidy-up (indent nit, package.json version, version check, SPEC testing section), 2026-11-05 00:06-00:08 UTC (04/11 21:06-21:08 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 300-1200, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 149 | loadScores forEach body 8 -> 6 spaces (`@@` hunk), package.json version 1.0.0 -> 0.2.9, test 13 (package.json version = latest CHANGELOG heading) | 200 | 10.5 s | 720 / 340 | 15.82 | public/index.html, package.json, test/scoreboard.mjs | accepted: model output exact; harness bug swallowed the package.json block (the `=====` regex ran from the index.html hunk block across its `<<<END>>>`); fixed the regex in tools/build-via-key.mjs, git checkout + REPARSE (no new call) |
| 150 | CHANGELOG 0.2.9, README v0.2.9 / 90 checks, SPEC testing section (6 files, 90 checks) | 200 | 11.5 s | 602 / 403 | 16.46 | 3 files (5 edits) | accepted 4.5/5: SPEC got 2 empty lines before "Total checks" (my prompt said "then the same empty line" while OLD did not end in one) |
| 151 | SPEC remove 1 of 2 empty lines (`@@` hunk) | 200 | 3.4 s | 283 / 83 | 4.84 | docs/SPEC.md | rework, accepted |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 3.0 / 2.7 s | 921 / 107 | 30.87 | - | 2/2 |
| probes | GET /models (x2, first run crashed before saving evidence), GET /receipts/{id}, disallowed model | 200 / 200 / 404 / 403 | 0.09-0.87 s | 0 | 0 | - | QA probe |

Totals: 9 requests (3 build + 2 live + 4 probes), 2 526 in / 933 out tokens, 68.0 neurons, about US$ 0.00075 at $0.011/1k neurons. Build only: 3 calls, 1 605 / 826 tokens, 37.1 neurons. Wasted 0; rework 1 (151) = 4.8 neurons (13% of build; sprint 9: 5%). 0 API failures, slowest 11.5 s. 1 extra probe call (GET /models, 0 neurons) from my own harness crash (qa/s10-probes not created).
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s10.mjs, tools/probe-s10.mjs (sed from s9), tools/build-via-key.mjs regex fix (OLD may not cross `<<<END>>>`).
npm test: 90/90 (was 89). Mutation check: test 13 fails with the old package.json ("package.json 1.0.0 vs CHANGELOG 0.2.9").
Verdict: worth it, cheapest sprint so far. The version check keeps package.json and CHANGELOG from drifting again; SPEC testing section was stale since sprint 4 (listed 3 of 6 files, 67 checks). Lesson: never describe an empty line in prose next to a `=====` block; use a `@@` hunk.
Receipts (seal-by 2026-11-06T00:05:00Z), 5, first..last: 01M6MGDR9RTM08XQYNZKB7N46B (149) .. 01M6MGG699F82AQYXE7YZ8D6CX (live PT); build 01M6MGDR9RTM08XQYNZKB7N46B, 01M6MGEXP593TKRWR10CFX42FB, 01M6MGFP78M5EQFJCA0VJR81KF; live 01M6MGG3SSY5Z7ABZX4EXXCAXX, 01M6MGG699F82AQYXE7YZ8D6CX. All ids in qa/key-usage-log.json (purpose sprint10-*).

### FullCup observations, sprint 10 (evidence qa/s10-probes/)
- Seal check (signed out, curl): 00:05:06Z both s8 01M6HXSZB17G8ZQ2FSC0WT1A9W and s9 01M6K79REJ3CPFMAKP9PPEN9EZ still "Recorded, waiting for the daily seal"; 00:07:47Z both "Genuine receipt", "one of 15 in the signed root of 2026-11-04", "Sealed at 2026-11-05 00:05:23 UTC" (lag under 3 min). Last s8 and s9 ids also Genuine. Exact cost s8 $0.000476, s9 $0.000311. Pages saved as seal-*.html.
- Reproduced: no per-call cost (5 of 5 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (5 of 5).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers, only id/object/owned_by.
- Reproduced: mixed error shapes, 404 /v1/receipts/{id} nested {"error":{code:"unsupported_endpoint"}}, 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (3 of 3), cached_tokens 0 (5 of 5).
- Not seen: x-ratelimit-reset in the past (no call crossed a UTC minute boundary).
- No new FullCup anomaly. The only new failures were mine (harness regex, probe dir), both fixed.

## M1 sprint 11: accuse confirmation (v0.3.0), 2026-11-05 12:08-12:10 UTC (05/11 09:08-09:10 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 2200-2500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 152 | Accuse native confirm (EN/PT LABELS.confirmAccuse + replace {name}), keyboard auto-accept JS dialog, package.json 0.3.0, test 14 | 200 | 19.4 s | 1153 / 746 | 30.83 | public/best.js, public/index.html, test/keyboard.mjs, package.json, test/scoreboard.mjs | accepted 6/6 edits exact |
| 153 | CHANGELOG 0.3.0, README v0.3.0 / 91 checks + accuse phrase, SPEC accuse UX + totals, HOW_TO_PLAY EN+PT confirm note | 200 | 16.5 s | 948 / 696 | 27.60 | 4 files (8 edits) | accepted 8/8 |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 2.8 / 1.3 s | 921 / 105 | 30.72 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.07-0.53 s | 0 | 0 | - | QA probe |

Totals: 7 requests (2 build + 2 live + 3 probes), 3 022 in / 1 547 out tokens, 89.1 neurons, about US$ 0.00098 at $0.011/1k neurons. Build only: 2 calls, 2 101 / 1 442 tokens, 58.4 neurons. Wasted 0; rework 0 (0%). 0 API failures, slowest 19.4 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s11.mjs, tools/probe-s11.mjs (sed from s10).
npm test: 91/91 (was 90). Mutation check: test 14 fails when renderAccuseButtons is restored to `()=>accuse(s.id)` ("renderAccuseButtons must call confirm").
Verdict: worth it. Native confirm matches the personal-best reset pattern; keyboard CDP auto-accepts Page.javascriptDialogOpening so verdict-then-credits still passes. Lesson: any native confirm() in the Accuse path needs the keyboard harness to handle JS dialogs or the CDP session hangs.
Receipts (seal-by 2026-11-06T00:05:00Z), 4 chat, first..last: 01M6NSR1K7M57JSP37EXD53DK1 (152) .. 01M6NSTCVH7E9GQMJFPQF6WQCD (live PT); build 01M6NSR1K7M57JSP37EXD53DK1, 01M6NSS5VC8KG3QM5K7ADTWNSG; live 01M6NSTB23KY07RM05FSAY3DK1, 01M6NSTCVH7E9GQMJFPQF6WQCD. All ids in qa/key-usage-log.json (purpose sprint11-*).

### FullCup observations, sprint 11 (evidence qa/s11-probes/)
- Seal check (signed out, curl): s8 01M6HXSZB17G8ZQ2FSC0WT1A9W Genuine receipt, $0.000476, one of 15 in the signed root of 2026-11-04, Sealed at 2026-11-05 00:05:23 UTC. s9 01M6K79REJ3CPFMAKP9PPEN9EZ Genuine receipt, $0.000311, same seal. Pages saved as seal-*.html / .snip.txt. s10 seals still wait until 2026-11-06 00:05Z (OK).
- Reproduced: no per-call cost (4 of 4 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (4 of 4).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers.
- Reproduced: mixed error shapes, 404 /v1/receipts/{id} nested unsupported_endpoint, 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (2 of 2), cached_tokens 0 (4 of 4).
- Not seen: x-ratelimit-reset in the past (remaining stayed high within the minute).
- No new FullCup anomaly.

## M1 sprint 12: ask busy-state polish (v0.3.1), 2026-11-06 00:12-00:14 UTC (05/11 21:12-21:14 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 1800-2500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 154 | LABELS.thinking EN/PT + askQuestion busy (#q / Accuse disabled, aria-busy, finally restore + focus) + package 0.3.1 | 200 | 55.2 s | 3274 / 2500 | 97.95 | public/best.js, public/index.html, package.json | accepted product 4/4; truncated at max_tokens before test 15 finished (MAXTOK=2500 too low for the stubbed-fetch test) |
| 155 | test 15 askQuestion busy state (static asserts + stubbed fetch fake DOM, success + error paths) | 200 | 32.0 s | 1870 / 1593 | 60.45 | test/scoreboard.mjs | rework (follow-up for truncated 154), accepted |
| 156 | CHANGELOG 0.3.1, README v0.3.1 / 92 checks + busy phrase, SPEC ask busy + totals, HOW_TO_PLAY EN+PT lock note | 200 | 17.8 s | 949 / 716 | 28.15 | 4 files (8 edits) | accepted 8/8 |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 2.2 / 0.9 s | 921 / 103 | 30.57 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.08-0.17 s | 0 | 0 | - | QA probe |

Totals: 8 requests (3 build + 2 live + 3 probes), 7 014 in / 4 912 out tokens, 217.1 neurons, about US$ 0.0024 at $0.011/1k neurons. Build only: 3 calls, 6 093 / 4 809 tokens, 186.5 neurons. Wasted 0; rework 1 (155) = 60.4 neurons (32% of build; sprint 11: 0%). Cause: first prompt packed a long stubbed-fetch test after the product hunks and hit max_tokens. 0 API failures, slowest 55.2 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s12.mjs, tools/probe-s12.mjs (sed from s11).
npm test: 92/92 (was 91). Mutation check: test 15 fails on the sprint 11 best.js/index.html ("en thinking", LABELS.thinking missing).
Verdict: worth it. Busy state matches the accuse-confirm polish pattern. Lesson: keep long stubbed-fetch tests in their own key call; do not share a 2500-token budget with a full-function REPLACE.
Receipts (seal-by 2026-11-07T00:05:00Z), 5 chat, first..last: 01M6Q345C32V3WYFWK20NBKCFA (154) .. 01M6Q38WF3GDWP50K3BPNFMD9X (live PT); build 01M6Q345C32V3WYFWK20NBKCFA, 01M6Q36F5EMDW5C317B116GVGH, 01M6Q37W7JKJE4W6QS4FH8HZ9G; live 01M6Q38TZ6YR18RCY5V55V8YEJ, 01M6Q38WF3GDWP50K3BPNFMD9X. All ids in qa/key-usage-log.json (purpose sprint12-*).

### FullCup observations, sprint 12 (evidence qa/s12-probes/)
- Seal check (signed out, curl qa.fullcup.ai): s10 01M6MGDR9RTM08XQYNZKB7N46B Genuine receipt, Exact cost $0.000174, one of 9 in the signed root of 2026-11-05, Sealed at 2026-11-06 00:05:27 UTC. s11 01M6NSR1K7M57JSP37EXD53DK1 Genuine receipt, Exact cost $0.000339, same seal. Snips in seal-*.snip.txt.
- Reproduced: no per-call cost (5 of 5 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (5 of 5).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers.
- Reproduced: enable_thinking=false honoured (3 of 3), cached_tokens 0 (5 of 5).
- Reproduced: 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- NEW: GET /v1/models entries now include capabilities {type, endpoint, vision} (s11 was only id/object/owned_by). Evidence models.json.
- NEW: 404 GET /v1/receipts/{id} error shape flipped from nested OpenAI-style {error:{message,type,param,code:"unsupported_endpoint"}} (s11) to flat {error:"unsupported_endpoint", message, supported, docs}. Message now lists POST /v1/images/generations. Evidence receipt.json.
- Mixed error shapes remain (403 flat string error vs older nested 404); the 404 side moved toward the flat style.
- Not seen: x-ratelimit-reset in the past (remaining stayed high within the minute).

## M1 sprint 13: Start over / Nova partida (v0.3.2), 2026-11-06 12:09-12:12 UTC (06/11 09:09-09:12 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 800-3500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 157 | LABELS startOver/confirmRestart EN+PT, #restart-btn, setLang label, ask busy locks restart, restartGame (confirm + POST /session + clear), package 0.3.2 | 200 | 28.6 s | 1539 / 1257 | 48.27 | public/best.js, public/index.html, package.json | accepted 8/8 |
| 158 | test 16 restartGame cancel vs confirm (stubbed fetch fake DOM) | 200 | 40.5 s | 1990 / 1742 | 65.60 | test/scoreboard.mjs | accepted |
| 159 | CHANGELOG 0.3.2, README v0.3.2 / 93 checks + Start over phrase, SPEC restart + totals, HOW_TO_PLAY EN+PT | 200 | 18.8 s | 1071 / 838 | 32.59 | 4 files (8 edits) | accepted 8/8 |
| 160 | keyboard tab-order includes restart-btn after lpt | 200 | 3.2 s | 276 / 80 | 4.69 | test/keyboard.mjs | rework (header placement shifted tab order), accepted |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 2.6 / 1.4 s | 921 / 105 | 30.72 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.05-0.50 s | 0 | 0 | - | QA probe |

Totals: 9 requests (4 build + 2 live + 3 probes), 5 797 in / 4 022 out tokens, 181.9 neurons, about US$ 0.0020 at $0.011/1k neurons. Build only: 4 calls, 4 876 / 3 917 tokens, 151.2 neurons. Wasted 0; rework 1 (160) = 4.7 neurons (3% of build). 0 API failures, slowest 40.5 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s13.mjs, tools/probe-s13.mjs (sed from s12).
npm test: 93/93 (was 92). Mutation: test 16 fails without LABELS.startOver / restartGame.
Verdict: worth it. Native confirm matches accuse + reset-best. Lesson: a new header control must update the CDP tab-order list in the same sprint (or place the control after #ask-btn so the old list still matches).
Receipts (seal-by 2026-11-07T00:05:00Z), 6 chat, first..last: 01M6RC6FD4G7PHA1CC7H3R1JZZ (157) .. 01M6RCC6S2JV00FCMF7S7JRJRH (live PT); build 01M6RC6FD4G7PHA1CC7H3R1JZZ, 01M6RC8ACM789TQS43F0CD81F7, 01M6RC9Q5T9ANDDA0MMVRSK00R, 01M6RCBQF6ECDN49JWWB7QNX2G; live 01M6RCC5B6NB688T6ZX0P73ZVY, 01M6RCC6S2JV00FCMF7S7JRJRH. All ids in qa/key-usage-log.json (purpose sprint13-*).

### FullCup observations, sprint 13 (evidence qa/s13-probes/)
- Seal check (signed out, curl qa.fullcup.ai): s12 01M6Q345C32V3WYFWK20NBKCFA still "Recorded, waiting for the daily seal" / Will be sealed on 2026-11-07 00:05 UTC (expected; today is 2026-11-06). Snip in seal-*.snip.txt.
- Reproduced: no per-call cost (6 of 6 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (6 of 6).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers; entries still include capabilities {type, endpoint, vision}.
- Reproduced: flat 404 GET /v1/receipts/{id} {error:"unsupported_endpoint", message, supported, docs} listing POST /v1/images/generations.
- Reproduced: 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (4 of 4), cached_tokens 0 (6 of 6).
- No new FullCup anomaly vs sprint 12.

## M1 sprint 14: Escape clears question (v0.3.3), 2026-11-07 00:10-00:12 UTC (06/11 21:10-21:12 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 1500-2500, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 161 | Escape keydown clears #q when focused + keep focus, package 0.3.3 | 200 | 2.5 s | 475 / 194 | 9.61 | public/index.html, package.json | accepted 2/2 |
| 162 | test 17 Escape clears question input (static asserts, mutation-friendly) | 200 | 10.0 s | 620 / 378 | 15.95 | test/scoreboard.mjs | accepted |
| 163 | CHANGELOG 0.3.3, README v0.3.3 / 94 checks + Escape phrase, SPEC Escape + totals, HOW_TO_PLAY EN+PT | 200 | 29.7 s | 1035 / 799 | 31.20 | 4 files (8 edits) | accepted 8/8 |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 3.1 / 3.0 s | 921 / 105 | 30.72 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.05-0.16 s | 0 | 0 | - | QA probe |

Totals: 8 requests (3 build + 2 live + 3 probes), 3 051 in / 1 476 out tokens, 87.5 neurons, about US$ 0.00096 at $0.011/1k neurons. Build only: 3 calls, 2 130 / 1 371 tokens, 56.8 neurons. Wasted 0; rework 0 (0%). 0 API failures, slowest 29.7 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s14.mjs, tools/probe-s14.mjs (sed from s13).
npm test: 94/94 (was 93). Mutation: test 17 fails without the Escape keydown / clear.
Verdict: worth it. Tiny polish; Escape only clears #q when focused and does not touch accuse/restart confirms.
Receipts (seal-by 2026-11-08T00:05:00Z), 5 chat, first..last: 01M6SNF6SFB4WWXBJHVWD2271Z (161) .. 01M6SNHJMYGDFMXYEH2NY5XKSK (live PT); build 01M6SNF6SFB4WWXBJHVWD2271Z, 01M6SNFEPRX5Y72DP6BW86NJ3F, 01M6SNFX4KN3NQMMBT4Z1RQ8ZW; live 01M6SNHG5C29GY40ANRF7WYXXR, 01M6SNHJMYGDFMXYEH2NY5XKSK. All ids in qa/key-usage-log.json (purpose sprint14-*).

### FullCup observations, sprint 14 (evidence qa/s14-probes/)
- Seal check (signed out, curl qa.fullcup.ai): s12 01M6Q345C32V3WYFWK20NBKCFA Genuine receipt, Exact cost $0.001077, one of 11 in the signed root of 2026-11-06, Sealed at 2026-11-07 00:05:25 UTC. s13 01M6RC6FD4G7PHA1CC7H3R1JZZ Genuine receipt, Exact cost $0.000531, same seal. Snips in seal-*.snip.txt.
- Reproduced: no per-call cost (5 of 5 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (5 of 5).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers; entries still include capabilities {type, endpoint, vision}.
- Reproduced: flat 404 GET /v1/receipts/{id} {error:"unsupported_endpoint", message, supported, docs} listing POST /v1/images/generations.
- Reproduced: 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (3 of 3), cached_tokens 0 (5 of 5).
- No new FullCup anomaly vs sprint 13.

## M1 sprint 15: lock Ask/Accuse after verdict (v0.3.4), 2026-11-07 12:11-12:13 UTC (07/11 09:11-09:13 BRT, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 2000-4000, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 164 | LABELS.gameOver EN+PT, setGameOver, ask/accuse guards, restart clear, setLang/renderAccuseButtons, package 0.3.4 | 200 | 21.3 s | 1339 / 947 | 38.00 | public/best.js, public/index.html, package.json | accepted 10/10 |
| 165 | test 18 Game over locks Ask and Accuse (static asserts) | 200 | 8.2 s | 816 / 568 | 22.91 | test/scoreboard.mjs | accepted |
| 166 | CHANGELOG 0.3.4, README v0.3.4 / 95 checks + post-verdict lock, SPEC Game over + totals, HOW_TO_PLAY EN+PT | 200 | 18.5 s | 1049 / 807 | 31.55 | 4 files (8 edits) | accepted 8/8 |
| 167 | rework: inject gameOver/setGameOver into ask+restart Function stubs (tests 15/16) | 200 | 7.0 s | 511 / 277 | 12.20 | test/scoreboard.mjs | rework, accepted 3/3 |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 7.3 / 5.6 s | 921 / 105 | 30.72 | - | 2/2 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.04-0.54 s | 0 | 0 | - | QA probe |

Totals: 9 requests (4 build + 2 live + 3 probes), 4 636 in / 2 704 out tokens, 135.4 neurons, about US$ 0.0015 at $0.011/1k neurons. Build only: 4 calls, 3 715 / 2 599 tokens, 104.7 neurons. Wasted 0; rework 1 (167) = 12.2 neurons (12% of build). 0 API failures, slowest 21.3 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s15.mjs, tools/probe-s15.mjs (sed from s14).
npm test: 95/95 (was 94). Mutation: test 18 fails without gameOver/setGameOver / LABELS.gameOver.
Verdict: worth it. Post-verdict lock is a small UX guard; older stubbed busy/restart tests needed gameOver in scope (lesson: when product adds free vars into sliced functions, update Function stubs in the same sprint).
Receipts (seal-by 2026-11-08T00:05:00Z), 6 chat, first..last: 01M6TYQ1SF3KWCYNR8RY6YH2HS (164) .. 01M6TYTAQM20G6YQB1QG7ADBNX (live PT); build 01M6TYQ1SF3KWCYNR8RY6YH2HS, 01M6TYQZ7MEHTK016GNYCJR0T3, 01M6TYR9C53KEGDT1SP3WN0VWH, 01M6TYSKXFZ1FW280BMCN1YT5M; live 01M6TYT3XMDQC8VZ3JJ0F097QW, 01M6TYTAQM20G6YQB1QG7ADBNX. Build ids in qa/build-log.json; live/probe in qa/key-usage-log.json (purpose sprint15-*).

### FullCup observations, sprint 15 (evidence qa/s15-probes/)
- Seal check (signed out, curl qa.fullcup.ai): s12 01M6Q345C32V3WYFWK20NBKCFA Genuine receipt, Exact cost $0.001077, one of 11 in the signed root of 2026-11-06, Sealed at 2026-11-07 00:05:25 UTC. s13 01M6RC6FD4G7PHA1CC7H3R1JZZ Genuine receipt, Exact cost $0.000531, same seal. s14 01M6SNF6SFB4WWXBJHVWD2271Z still Recorded, waiting for the daily seal / Will be sealed on 2026-11-08 00:05 UTC (expected). Snips in seal-*.snip.txt.
- Reproduced: no per-call cost (6 of 6 chat 200s, no usage.cost or cost header).
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (6 of 6).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers; entries still include capabilities {type, endpoint, vision}.
- Reproduced: flat 404 GET /v1/receipts/{id} {error:"unsupported_endpoint", message, supported, docs} listing POST /v1/images/generations.
- Reproduced: 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (4 of 4), cached_tokens 0 (6 of 6).
- No new FullCup anomaly vs sprint 14.

## M1 sprint 16: Ask hints when no suspect or empty question (v0.3.5), 2026-11-08 00:08 UTC (07/11 21:08 BRT, hints) and 2026-11-08 12:11-12:13 UTC (08/11 09:11-09:13 BRT, this run, Essential)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 4000, via the Cup key. Live smoke llama-4-scout.
Hints product edits (168) landed last night and stayed in the working tree; tests, docs, live smoke, probes and commit were missing locally (notes had claimed commit ea797c2 and 96 tests; that commit does not exist). This run restored tracked qa/build, generated the remaining files via the key, then smoked and committed.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 168 | LABELS pickSuspect/emptyQuestion EN+PT + askQuestion writes #best-status (no silent return) and focuses #q | 200 | 4.2 s | 478 / 279 | 11.95 | public/best.js, public/index.html | accepted 3/3 (preexisting, 2026-11-08T00:08:17.214Z) |
| 169 | test 19 Ask hints when no suspect or empty question (static asserts) | 200 | 11.2 s | 733 / 486 | 19.92 | test/scoreboard.mjs | accepted |
| 170 | CHANGELOG 0.3.5, README v0.3.5 / 96 checks + Ask hints, SPEC Ask hints + totals, HOW_TO_PLAY EN+PT; package.json missed | 200 | 18.3 s | 1203 / 960 | 37.12 | CHANGELOG.md, README.md, docs/SPEC.md, docs/HOW_TO_PLAY.md (package.json 0 occurrences) | accepted 8/9; package.json OLD indent was 4 spaces vs file 2 spaces |
| 171 | rework: package.json 0.3.5 (2-space indent) | 200 | 1.5 s | 235 / 38 | 3.17 | package.json | rework, accepted 1/1 |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 2.5 / 1.6 s | 921 / 105 | 30.72 | - | 2/2 HTTP 200 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.46 / 0.04 / 0.07 s | 0 | 0 | - | QA probe |

Totals from local logs only: 9 requests (4 build + 2 live + 3 probes), 3 570 in / 1 868 out tokens, 102.9 neurons, about US$ 0.0011 at $0.011/1k neurons. Build only: 4 calls, 2 649 / 1 763 tokens, 72.16 neurons. Wasted 0; rework 1 (171) = 3.17 neurons (4.4% of build). 0 API failures, slowest 18.3 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s16.mjs, tools/probe-s16.mjs (sed from s15). Prompts 169/170/171 written by the agent; 168 already on disk.
npm test: 96/96 (was 95; e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 19, keyboard 13). Mutation: test 19 fails on the pre-hint silent `if (!selectedSuspect) return` (missing pickSuspect/emptyQuestion and the silent-return regex).
Verdict: worth it. Ask hints is a small UX guard so Ask explains a missing suspect or empty question. Lesson: copy package.json indent exactly (2 spaces); the docs prompt used 4 spaces and that one hunk did not apply.
Receipts in local logs (seal-by 2026-11-09T00:05:00Z), 6 chat: build 01M6W7QX8TF6V66QVMK39M0W0W (168), 01M6XH4GCGHASKD871BRANYV89 (169), 01M6XH4Y5BRCW5V62EW2Z4BHW9 (170), 01M6XH5R5GT4Z15YSCEJJ68KCC (171); live 01M6XH6E23J5KVNGRW6156VDNR (EN), 01M6XH6G7BXX958W3821GNFP67 (PT). Build ids in qa/build-log.json; live/probe in qa/key-usage-log.json (purpose sprint16-*). last night's qa/build/sprint16-hints.raw.txt is not on disk (only the build-log entry remains).

Claimed extra receipt IDs from last night's notes (exist on qa.fullcup.ai, not in local logs, not counted above): 01M6W7RMGE0HHXD5EFJMQDA254 (Recorded, Exact cost $0.000437, 2,294 tokens 1,258/1,036, gemma-4-26b-a4b-it, executed 2026-11-08 00:09:08 UTC, work case-files:build-m1; likely a test/docs call whose file output did not persist); 01M6W7TCW1CN8KVF662RBGHSR3 (Recorded, Exact cost $0.000164, 494 tokens 441/53, llama-4-scout-17b-16e-instruct, executed 2026-11-08 00:09:38 UTC, work case-files:play); 01M6W7TFYRH8C8KHBWMBXM1NE0 (Recorded, Exact cost $0.000170, 528 tokens 480/48, llama-4-scout-17b-16e-instruct, executed 2026-11-08 00:09:39 UTC, work case-files:play). Community post https://qa.fullcup.ai/p/01M6W7W7G2GX7J6X4D8T2HW211 was reported present ("M1 progress: sprint 16 done"); local test count is the 96/96 run after this run's generated files, not that post.

### FullCup observations, sprint 16 (evidence qa/s16-probes/)
- Seal check (signed out, curl qa.fullcup.ai): s14 01M6SNF6SFB4WWXBJHVWD2271Z Genuine receipt, Exact cost $0.000106, 669 tokens (475/194), gemma-4-26b-a4b-it, executed 2026-11-07 00:10:27 UTC, one of 11 in the signed root of 2026-11-07, Sealed at 2026-11-08 00:05:40 UTC. s15 01M6TYQ1SF3KWCYNR8RY6YH2HS Genuine receipt, Exact cost $0.000418, 2,286 tokens (1,339/947), gemma-4-26b-a4b-it, executed 2026-11-07 12:11:34 UTC, one of 11 in the signed root of 2026-11-07, Sealed at 2026-11-08 00:05:40 UTC. s16 hints 01M6W7QX8TF6V66QVMK39M0W0W Recorded, waiting for the daily seal, Exact cost $0.000131, 757 tokens (478/279), gemma-4-26b-a4b-it, executed 2026-11-08 00:08:17 UTC, will be sealed about 2026-11-09 00:05 UTC. This-run receipts 01M6XH4GCGHASKD871BRANYV89 ($0.000219, 1,219 tokens 733/486), 01M6XH4Y5BRCW5V62EW2Z4BHW9 ($0.000408, 2,163 tokens 1,203/960), 01M6XH5R5GT4Z15YSCEJJ68KCC ($0.000035, 273 tokens 235/38), 01M6XH6E23J5KVNGRW6156VDNR ($0.000169, 500 tokens 441/59, llama-4-scout), 01M6XH6G7BXX958W3821GNFP67 ($0.000169, 526 tokens 480/46, llama-4-scout) are all Recorded, waiting, seal about 2026-11-09 00:05 UTC. Snips in seal-*.snip.txt.
- Reproduced: no per-call cost (6 of 6 chat 200s, no usage.cost or cost header). Public receipt pages do show Exact cost after the fact.
- Reproduced: duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id, same value (6 of 6).
- Reproduced: GET /v1/models has no x-ratelimit-* and no receipt headers; entries still include capabilities {type, endpoint, vision} (6 models).
- Reproduced: flat 404 GET /v1/receipts/{id} {error:"unsupported_endpoint", message, supported, docs} listing POST /v1/images/generations.
- Reproduced: 403 model_outside_capacity_class flat with allowed array of 6 ids, x-ratelimit-* on the 403.
- Reproduced: enable_thinking=false honoured (4 of 4), cached_tokens 0 (6 of 6).
- No new FullCup anomaly vs sprint 15.

## M1 sprint 17: clear stale Ask hint when a suspect is selected (v0.3.6), 2026-11-09 12:06 UTC (09:06 BRT)
Model gemma-4-26b-a4b-it, thinking off, max_tokens 4000, via the Cup key. Live smoke llama-4-scout.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 172 | selectSuspect clears pickSuspect hint (EN/PT) | 200 | 3.1 s | 275 / 98 | 5.17 | public/index.html | accepted 1/1 |
| 173 | test 20 selectSuspect clears stale hint | 200 | 5.3 s | 479 / 248 | 11.12 | test/scoreboard.mjs | accepted |
| 174 | CHANGELOG 0.3.6, package.json, README, SPEC, HOW_TO_PLAY EN+PT | 200 | 12.8 s | 792 / 540 | 21.93 | 5 files | accepted 9/9, but SPEC fragment "and #q is focused." matched 2 lines, a sentence landed in the Ask busy line too |
| 175 | rework: remove misplaced SPEC sentence | 200 | 2.7 s | 216 / 67 | 3.79 | docs/SPEC.md | rework, accepted |
| live | smoke EN Maya + PT Carlos + PT wrong accuse | 200 x3 (2 key calls) | 3.8 / 2.2 s | 921 / 103 | 30.57 | - | 2/2 HTTP 200 |
| probes | GET /models, GET /receipts/{id}, disallowed model | 200 / 404 / 403 | 0.51 / 0.05 / 0.18 s | 0 | 0 | - | QA probe |

Totals: 9 requests (4 build + 2 live + 3 probes), 2 683 in / 1 056 out tokens, 72.58 neurons, about US$ 0.0008 at $0.011/1k neurons. Build only: 4 calls, 1 762 / 953 tokens, 42.01 neurons. Wasted 0; rework 1 (175) = 3.79 neurons (9.0% of build). 0 API failures, slowest 12.8 s.
Manual lines: 0 product, 0 docs. Harness: tools/smoke-s17.mjs, tools/probe-s17.mjs (sed from s16). Prompts 172-175 written by the agent.
npm test: 97/97 (was 96; e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, keyboard 13).
Verdict: small UX polish, worth it. Lesson: when OLD is a short fragment, make it unique (the "and #q is focused." fragment occurred twice).
Receipts (seal-by 2026-11-10T00:05:00Z): build 01M7037B798DQXF3VHKHHYFJ2A (172), 01M7037DZCN4VAQSM0R0J5P4D1 (173), 01M7037KH3A3GK8T51GZD21307 (174), 01M70389EATXWNAAA41H2HZ9J5 (175); live 01M7038JJGT5PTN1VPAHDV6BCK (EN), 01M7038NZKWJ3HV9328T97JVMC (PT).
Seal check of s16 receipts (signed out, curl): all 9 Genuine receipt, sealed 2026-11-09 00:05:24 UTC, signed root of 2026-11-08. Snips in qa/s17-probes/seal-*.snip.txt.

## M1 delivery acceptance, 2026-11-09 (v0.4.0)
No product code change. Docs only, written by hand: CHANGELOG 0.4.0, package.json 0.4.0, README (M1 Delivered), PRD (M1 status, scoreboard no longer out of scope), docs/M1_DELIVERY.md. Harness tools/smoke-m1.mjs (sed from smoke-s17).
npm test: 97/97 (e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, keyboard 13); first cold run had 3 keyboard timeouts, rerun 13/13.
Live acceptance smoke (llama-4-scout): EN Maya 200 41 words + correct accuse score 100; PT Carlos 200 34 words + wrong accuse score 0, no best. 2 key calls, 921 / 104 tokens, 30.64 neurons (~US$ 0.0003). Receipts 01M71DXPH99V0EA0CR170X3MYW, 01M71DXTQMZN91NFP0DD1Q0VBM, seal-by 2026-11-11T00:05:00Z.
M1 totals from local logs: 318 requests, 270 x 200, 172 with receipt id, 529,836 / 358,666 tokens, 29,670 neurons, ~US$ 0.33.

## M2 sprint 1: Night Train case file + shared engine step 1 (v0.4.1), 2026-11-10 12:08-12:16 UTC (09:08-09:16 BRT)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 4000, via the Cup key. Live smoke llama-4-scout. M2 in progress; Night Train not wired into the game; M2 not declared.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 176 | content/cases/night-train.json: 4 suspects (EN/PT role, persona, alibi, facts), 5 stop timeline across midnight, 5 clues, glossary, solution | 200 | 53.6 s | 1278 / 2737 | 86.26 | content/cases/night-train.json | accepted after review: valid JSON, fairPlay(4) ok, but Inês public persona was "The culprit." (answer leak), thin facts without names, clues in third person |
| 177 | rework: 25 unique one-line edits (persona, 4 facts, 5 asks, 10 clue texts first person, PT cabine-leito / vagão) | 200 | 34.6 s | 2031 / 1619 | 62.62 | content/cases/night-train.json | rework, accepted 25/25 (every OLD checked unique before sending, every NEW verified present) |
| 178 | src/case.js: fairPlay(c, { suspects = 3 }) + new timelineCheck(c) | 200 | 17.9 s | 875 / 924 | 33.15 | src/case.js | accepted 4/4 hunks, but timelineCheck had 3 bugs (suspect objects instead of ids, stop.en instead of stop.stop.en, midnight offset not kept) |
| 179 | rework: 6 unique edits to timelineCheck | 200 | 16.3 s | 958 / 638 | 26.11 | src/case.js | rework, accepted 6/6; timelineCheck(night-train) ok |
| 180 | test/night-train.mjs (8 checks) + package.json npm test script | 200 | 51.9 s | 1073 / 1801 | 58.87 | test/night-train.mjs, package.json | accepted, 7/8 green: test 5 read entry.stop.time |
| 181 | rework: test 5 uses entry.time | 200 | 2.3 s | 310 / 77 | 4.92 | test/night-train.mjs | rework, accepted, 8/8 |
| 182 | CHANGELOG 0.4.1, package.json 0.4.1, README M2 in progress, SPEC test list + totals + Case engine | 200 | 13.9 s | 1106 / 669 | 28.30 | 4 files (5 edits) | accepted 5/5 but 2 NEW texts cut at their first empty line (lost CHANGELOG 0.4.0 heading, SPEC Case engine section) |
| 183 | rework: restore 0.4.0 heading + SPEC Case engine section | 200 | 25.0 s | 725 / 430 | 18.32 | CHANGELOG.md, docs/SPEC.md | rework, accepted 2/2 |
| live | smoke EN Maya + correct accuse, PT Carlos + wrong accuse (Violin regression) | 200 x4 (2 key calls) | 2.7 / 1.5 s | 921 / 104 | 30.64 | - | 2/2 HTTP 200, EN 41 words score 100, PT 34 words score 0 no best |

Totals: 10 key calls (8 build + 2 live), 9 277 in / 8 999 out tokens, 349.2 neurons, about US$ 0.0038 at $0.011/1k neurons. Build only: 8 calls, 8 356 / 8 895 tokens, 318.6 neurons. Wasted 0; rework 4 (177, 179, 181, 183) = 112.0 neurons (35.2% of build). 0 API failures, slowest 53.6 s. Probes skipped (optional).
Manual lines: 0 product, 0 docs (qa/rework.md, docs/BUILD_LOG.md are PO logs). Harness: tools/smoke-m2s1.mjs (sed from smoke-m1). Prompts 176-183 written by the agent; 177, 179, 182, 183 assembled by a script that checks every OLD occurs exactly once before the call.
npm test: 105/105 (was 97; e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8 new, keyboard 13); no keyboard flake this run.
Mutation: with the v0.4.0 src/case.js test/night-train.mjs cannot load (timelineCheck missing); with Inês persona back to "The culprit." test 4 fails; with the midnight wrap disabled test 5 fails (timeline_out_of_order).
Verdict: worth it as a first M2 step, but rework is high (35%). Lessons: (1) review generated case text for answer leaks in public fields, a schema check alone passed the leaking file; (2) gemma cuts NEW at its first empty line unless the prompt says the line count and that empty lines are part of NEW; (3) give field paths explicitly (stop.stop.en, entry.time) when a key name repeats.
Receipts (seal-by 2026-11-11T00:05:00Z), 10 chat: build 01M72NRCX1X2EZASSMTQP2SDPW (176), 01M72NVRKSW176ZY3MFBA6B26T (177), 01M72NXQQ0N4DYXTM04RYT28MG (178), 01M72NZ0EM2M0RE01QBPY54FQJ (179), 01M72P0G79M201C0NNYPGKWYJ1 (180), 01M72P2Q5QDBQTJY3C3HVTTZ54 (181), 01M72P3XPF1066JA2FYWMB58AB (182), 01M72P54E85ENNJSGXJG0KJBCP (183); live 01M72P67XGGGA762NA2K6SG7W1 (EN), 01M72P69JMT9BDP0QHZQKKK4K4 (PT). Build ids in qa/build-log.json (label m2s1-*); live in qa/key-usage-log.json (purpose m2s1-smoke:*).

### FullCup observations, M2 sprint 1 (evidence qa/m2s1-probes/)
- Seal check (signed out, curl https://qa.fullcup.ai/receipts/<id>): all 6 s17 receipts Genuine receipt, one of 6 in the signed root of 2026-11-09, Sealed at 2026-11-10 00:05:23 UTC. 01M7037B798DQXF3VHKHHYFJ2A $0.000057, 01M7037DZCN4VAQSM0R0J5P4D1 $0.000122, 01M7037KH3A3GK8T51GZD21307 $0.000241, 01M70389EATXWNAAA41H2HZ9J5 $0.000042 (gemma-4-26b-a4b-it); 01M7038JJGT5PTN1VPAHDV6BCK $0.000168, 01M7038NZKWJ3HV9328T97JVMC $0.000169 (llama-4-scout). Snips in seal-*.snip.txt.
- Reproduced: no per-call cost (10 of 10 chat 200s, cost null), duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id same value (10 of 10), enable_thinking=false honoured (8 of 8), cached_tokens 0.
- No new FullCup anomaly.

## M2 sprint 2: load a case by id behind a flag (v0.4.2), 2026-11-11 00:25-00:31 UTC (21:25-21:31 BRT 10/11)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 1000 to 4000, via the Cup key. Live smoke llama-4-scout (Night Train by id, PT). M2 in progress; not in the page; M2 not declared.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 184 | src/case.js CASES + caseFileFor; server.js caseId option + CASE_ID; cli.js --case (9 edits) | 200 | 16.4 s | 1201 / 728 | 30.77 | src/case.js, src/server.js, src/cli.js | accepted 9/9 hunks, but caseFileFor had no body: the model ended NEW right after "export function caseFileFor(id) {" and wrote "<<<<END>>>", leaving a stray "<" (SyntaxError on import) |
| 185 | rework: caseFileFor body | 200 | 3.2 s | 310 / 123 | 6.17 | src/case.js | rework, accepted; rejects toString, ../package, '', undefined |
| 186 | test/case-select.mjs (7 checks) + package.json script + rename night-train test 8 | 200 | 28.5 s | 1527 / 1962 | 67.39 | test/case-select.mjs, package.json, test/night-train.mjs | accepted first try, 7/7 |
| 187 | CHANGELOG 0.4.2, package 0.4.2, README M2 sprint 2, SPEC test list + totals + Case engine | 200 | 10.9 s | 1308 / 793 | 33.52 | 4 files (5 edits) | accepted 5/5, but CHANGELOG bullets and one SPEC bullet copied the prompt shorthand (lowercase fragments) |
| 188 | rework: full-sentence CHANGELOG bullets + SPEC CASES bullet | 200 | 8.1 s | 584 / 298 | 13.44 | CHANGELOG.md, docs/SPEC.md | rework, accepted 2/2 |
| live | Night Train by id (caseId night-train), PT Helena + PT Inês + correct accuse | 200 x2 key calls | 4.1 / 1.5 s | 983 / 118 | 33.25 | - | both PT, in character, no confession, no invented people; accuse Inês correct, score 100 |

Totals: 7 key calls (5 build + 2 live), 5 913 in / 4 022 out tokens, 184.54 neurons, about US$ 0.0020 at $0.011/1k neurons. Build only: 5 calls, 4 930 / 3 904 tokens, 151.29 neurons. Wasted 0; rework 2 (185, 188) = 19.61 neurons (13.0% of build, was 35.2% in sprint 1). 0 API failures, slowest 28.5 s.
Manual lines: 0 product, 0 docs (qa/rework.md, docs/BUILD_LOG.md are PO logs). Harness: tools/smoke-m2s2.mjs. Prompts 184-188 written by the agent.
npm test: 112/112 (was 105; e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 7 new, keyboard 13); no keyboard flake, 2 full runs.
Mutation: server ignoring caseId fails 4 of 7 case-select checks; caseFileFor using CASES[id] (no own-property check) fails "unknown or path-like ids are rejected" on toString.
Manual check: CASE_ID=night-train MOCK=1 node src/server.js serves caseId case-night-train-002; CASE_ID=nope and cli --case nope exit with an unhandled "unknown case" stack trace (works as a guard, not friendly; left for a later sprint).
Live smoke notes: Helena says she keeps the safe key herself (consistent with her facts, she hides the dining car hook); Inês repeats her false kitchen alibi and mentions flour (a fair hint). No confession.
Verdict: worth it, small and safe; rework down to 13%. Lessons: (1) when a NEW ends on an opening line like "function x(id) {", gemma treats that line as the end of NEW, so give the full body line count; (2) shorthand facts in a prompt get copied verbatim into docs, ask for full sentences up front.
Receipts (seal-by 2026-11-12T00:05:00Z), 7 chat: build 01M73ZXN0R8A3J8VZE4AEVHYM8 (184), 01M73ZYPSNJ9P2XJQDC5E7H7VQ (185), 01M73ZZTAG3121CMCQGH5RWADX (186), 01M740646V33WCKR94JSYH19KX (187), 01M7406TK8KACBDHCG3X7ZRW9V (188); live 01M7401B9MRPS3SVG831BQ5046 (PT Helena), 01M7401EECT79SWA6WGHZ6E0MB (PT Inês). Build ids in qa/build-log.json (label m2s2-*); live in qa/key-usage-log.json (purpose m2s2-smoke:*), qa/live-smoke-m2s2.json.

### FullCup observations, M2 sprint 2 (evidence qa/m2s2-probes/)
- Seal check (signed out, curl https://qa.fullcup.ai/receipts/<id>, 2026-11-11 00:23Z): all 10 M2s1 receipts HTTP 200, Genuine receipt, Sealed at 2026-11-11 00:05:25 UTC, one of 12 in the signed root of 2026-11-10. Exact cost: 01M72NRCX1X2EZASSMTQP2SDPW $0.000949, 01M72NVRKSW176ZY3MFBA6B26T $0.000689, 01M72NXQQ0N4DYXTM04RYT28MG $0.000365, 01M72NZ0EM2M0RE01QBPY54FQJ $0.000287, 01M72P0G79M201C0NNYPGKWYJ1 $0.000648, 01M72P2Q5QDBQTJY3C3HVTTZ54 $0.000054, 01M72P3XPF1066JA2FYWMB58AB $0.000311, 01M72P54E85ENNJSGXJG0KJBCP $0.000202 (gemma-4-26b-a4b-it); 01M72P67XGGGA762NA2K6SG7W1 $0.000167, 01M72P69JMT9BDP0QHZQKKK4K4 $0.000170 (llama-4-scout-17b-16e-instruct). Sum $0.003842 matches the ~US$0.0038 estimate. Snips seal-*.snip.txt.
- Reproduced again: no per-call cost in the chat response (7 of 7 cost null), duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id same value (7 of 7), enable_thinking=false honoured (5 of 5), cached_tokens 0.
- No new FullCup anomaly.

## M2 sprint 3: friendly error for an unknown case id (v0.4.3), 2026-11-11 12:15-12:18 UTC (09:15-09:18 BRT)
Model gemma-4-26b-a4b-it, thinking off (chat_template_kwargs.enable_thinking=false), max_tokens 600 to 2000, via the Cup key. Live smoke llama-4-scout (Night Train by id, PT, 1 call). M2 in progress; not in the page; M2 not declared.

| # | Step | Status | Time | Tokens in / out | Neurons | Files | Result |
|---|---|---|---|---|---|---|---|
| 189 | src/case.js unknownCaseLine(id); server.js main block and cli.js catch unknown_case, print the line to stderr, exit 2 (5 edits) | 200 | 12.9 s | 899 / 496 | 21.70 | src/case.js, src/server.js, src/cli.js | accepted first try 5/5; other errors still rethrown |
| 190 | test/case-select.mjs 2 new checks (server CASE_ID=nope, CLI --case Night-Train) | 200 | 13.1 s | 838 / 501 | 21.28 | test/case-select.mjs | accepted 2/2, 9/9 pass, but both tests indented 2 extra spaces |
| 191 | rework: indentation of the 2 new tests | 200 | 23.8 s | 631 / 785 | 27.15 | test/case-select.mjs | rework, accepted; whole 17 line block rewritten, cost more than the original call |
| live | Night Train by id, PT Victor + correct accuse | 200 x1 key call | 3.6 s | 481 / 54 | 15.98 | - | PT, in character (sleeper 7, heard Tomás singing in car 4, matches his facts), no invented people; one English word kept ("a sleeper 7"); accuse Inês correct, score 100 |
| 192 | CHANGELOG 0.4.3, package 0.4.3, README M2 sprint 3, SPEC test list + totals + Case engine | 200 | 18.3 s | 1224 / 797 | 32.86 | 4 files (7 edits) | accepted 7/7, full sentences this time; the first CHANGELOG bullet quoted the example message as bare text |
| 193 | rework: example message in backticks | 200 | 5.5 s | 306 / 124 | 6.16 | CHANGELOG.md | rework, accepted |

Totals: 6 key calls (5 build + 1 live), 4 379 in / 2 757 out tokens, 125.13 neurons, about US$ 0.0014 at $0.011/1k neurons. Build only: 5 calls, 3 898 / 2 703 tokens, 109.15 neurons. Wasted 0; rework 2 (191, 193) = 33.31 neurons (30.5% of build, was 13.0% in sprint 2). 0 API failures, slowest 23.8 s.
Manual lines: 0 product, 0 docs (qa/rework.md, docs/BUILD_LOG.md are PO logs). Harness: tools/smoke-m2s3.mjs (copy of smoke-m2s2 with one step). Prompts 189-193 written by the agent.
npm test: 114/114 (was 112; e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 9 (+2), keyboard 13); no keyboard flake, 2 full runs.
Mutation: server rethrowing fails the CASE_ID check; CLI exiting 0 fails the CLI check; a line without the valid ids fails the CASE_ID check (qa/m2s3-probes/manual-check.txt).
Manual check: CASE_ID=nope node src/server.js and node src/cli.js --case nope print `Unknown case "nope". Valid case ids: violin, night-train.` and exit 2; CASE_ID=night-train still starts.
Verdict: worth it, tiny and safe. Rework up to 30.5%, almost all a cosmetic indent fix. Lessons: (1) when a NEW inserts top-level code before a column 0 line, say "column 0" explicitly, gemma copied the indent of the block body it was describing; (2) an indent-only rework makes the model echo the whole block, so it costs more than the original; cheaper to state indentation up front; (3) example messages inside docs need "in backticks" in the prompt.
Receipts (seal-by 2026-11-12T00:05:00Z), 6 chat: build 01M758GFHJTZV664VCHY1F3PQX (189), 01M758HEBCSY4KX7Z41KCPNGGZ (190), 01M758J5R5NE1W4ZFY0FYP2D55 (191), 01M758MKQANJ9NT9Z9N0A1YB71 (192), 01M758NE8C24CG0F62GCAAFAZK (193); live 01M758KRCCC3VQB2TGG70X204B (PT Victor). Build ids in qa/build-log.json (label m2s3-*); live in qa/key-usage-log.json (purpose m2s3-smoke:*), qa/live-smoke-m2s3.json.

### FullCup observations, M2 sprint 3 (evidence qa/m2s3-probes/)
- Seal check of the 7 M2s2 receipts not due yet (sealed after 2026-11-12 00:05Z); skipped.
- Reproduced again: no per-call cost in the chat response (6 of 6 cost null), duplicate receipt headers x-fullcup-receipt + x-fullcup-receipt-id same value (6 of 6), enable_thinking=false honoured (5 of 5), cached_tokens 0.
- No new FullCup anomaly.

## Visual V3 (v0.4.6, Cup text key)

V1 (0da9fc5, v0.4.4) and V2 (1f583da, v0.4.5) were handwritten. This pass regenerated the shipped chrome (icons.svg, game.css, page shell, layout JS) through qa-api.fullcup.ai with @cf/google/gemma-4-26b-a4b-it so the player UI is key-produced. Receipts and cost: see /workspace/casefiles-qa/run26/receipts.md.

Rework and wasted calls: first icons output truncated (no apply); HTML used === instead of ===== (NEW applied from the receipt); a later steplabels <<<FILE>>> overwrote index.html (restored from the saved shell + REPARSE of v3-js, no new debit); tablet CSS also arrived as <<<FILE>>> and overwrote game.css (restored by REPARSE of v3-css and v3-css-rework, then the tablet NEW was applied from that receipt). Formal rework that applied cleanly: icons-rework, css-rework, kbd-rework. No live play smoke in this pass.

## Visual V4 (v0.4.7, Cup text key, polish only)

Layout polish items 1–6. Mechanics, motion and generated art are scheduled in /workspace/casefiles-qa/run26/milestones-visual.md. Icons and HTML applied cleanly. The CSS REPLACE call did not auto-apply (malformed framing); NEW blocks from that receipt were applied from the raw file. Receipts: run26/receipts.md. 119/119 checks.

## M2 sprint 4 (v0.4.8, per-case call cap + worst-case spend test, 2026-11-11 21:19-21:23 BRT)
Promise to backer Giovana Macedo (run 25 reply): a per-case generation cap and a worst-case spend test before M3.
Calls 194-198 (gemma-4-26b-a4b-it, thinking off, max_tokens 300-3000) + 1 live llama-4-scout smoke.
- 194 src/budget.js (PLAY_MODEL, PLAY_PRICE 0.27/0.85 USD per 1M from the Cloudflare model page, DEFAULT_MAX_CALLS 20, PLAYTHROUGH_CEILING_USD 0.10, maxCallsFor, worstCaseSpend), friendly('call_cap') EN/PT, server cap in /api/ask (sess.calls counted before the model call, 429 call_cap, no model call once capped). Applied clean.
- 195 test/budget.mjs 7 checks + package.json test script + messages JSDoc. The 2 edits came framed as `<REPLACE path>` (single brackets) and were not applied; re-parsed from the same receipt with the framing fixed (label m2s4-call-cap-test-reframe, content verbatim, no new call).
- 196 rework: mutation M4 (worst case without input tokens) passed all 7 checks, so one hand-computed formula check was added (8 checks). After it, M4 and M5 fail.
- 197 CHANGELOG 0.4.8, package 0.4.8, README, SPEC list/totals/Play budget. 198 rework: SPEC total dropped "icons: 3", CHANGELOG bullets used "*", README "reaches a friendly message".
npm test: 127/127 (was 119; budget 8 new), 2 full runs + 1 pre-commit run, no keyboard flake.
Mutations (qa/m2s4-probes/mutation-check.txt): M1 cap check disabled fails 2/7; M2 default 1000 fails 4/7 (worst case US$108.87 over 0.10); M3 only successful calls counted fails 1/7; M4 input tokens dropped fails the formula check (after 196); M5 resent answers dropped fails the formula check.
Worst case today: Violin 20 calls x 300 max_tokens, system 2180 chars, US$0.0606; Night Train 20 x 300, 1976 chars, US$0.0595 (ceiling US$0.10).
Live smoke (tools/smoke-m2s4.mjs, Night Train by id, PT, 1 call): Helena 200 45 words, consistent with the case (sleeper 7, Black Ridge tunnel, talking with Victor), cap 20; accuse Inês correct score 100. qa/live-smoke-m2s4.json.
Key: 6 calls (5 build + 1 live), 5,980 / 4,406 tokens, 185.78 neurons, ~US$0.0020. Rework 2 calls (196, 198) = 16.40 neurons, 9.8% of build neurons (168.04). 0 wasted, 0 API failures, 1 re-parse.
Receipts (seal-by 2026-11-13T00:05:00Z): build 01M76HYZ9HD4PMHGETGYCBZ3R9 (194), 01M76J01DBRFPJBK37CN16CY7V (195), 01M76J2ZYCMBQAVHR0S3Z6WNBY (196), 01M76J4MBSJ81NZ08J58GS8PC9 (197), 01M76J5VEF4N1XZSM6DQMR2VRX (198); live 01M76J65DA82FZ71D5VBM8FRYV (PT Helena).
Known limit (not in scope): the cap is per session, so Start over gives a fresh cap; a per-day or per-player cap would be a later sprint.

### FullCup observations, M2 sprint 4 (evidence qa/m2s4-probes/)
- Seal check (signed out curl, 2026-11-12 00:18Z): all 13 pending receipts (7 M2s2 + 6 M2s3) HTTP 200, Genuine receipt, Sealed at 2026-11-12 00:05:23 UTC, one of 30 in the signed root of 2026-11-11. Exact costs M2s2 sum $0.002031 (logged ~$0.0020), M2s3 sum $0.001377 (logged ~$0.0014). Models match (gemma for build, llama-4-scout for live).
- Reproduced again: cost null in the chat response (6/6), duplicate receipt headers (6/6), enable_thinking=false honoured (5/5), cached_tokens 0.
- No new FullCup anomaly.

## M2 game feel sprint 1 (v0.4.10), 2026-11-12 09:17-09:26 BRT
- Bugs reproduced before building (headless Chrome 1280x800, /workspace/casefiles-qa/run29/before-1280.png): suspect roles light grey on light paper (unreadable), desktop right column empty until the first pin.
- 199 html (tracker, rail, verdict stamp): accepted. Block 1 OLD had a typo (`</div >`), 0 matches; re-parsed from the same receipt with the OLD typo fixed, no new call.
- 200 css + i18n + reset: accepted. My prompt anchor `syncTitle();` matched 4 places, so renderProgress is called 4 times (harmless). The reset anchor matched 2 places (Start over and opening a file), both wanted.
- 201 rework: keyboard harness evaluates restartGame alone, `visitedSteps is not defined`; guarded with typeof.
- 202 test/progress.mjs: 3 of 8 checks broken (lazy regex stopped at the first brace, declaration never called).
- 203 rework of the test: model wrote `OLD/=====/old/NEW/new` framing (0 matches); re-parsed with framing fixed, no new call. 8/8.
- Mutations (qa/m2gf1-probes/mutation-check.txt): rail hidden, all steps done, showStep without add, role back to text-dim, stamp without animation each fail exactly one check. First role mutation hit another rule (sed), redone targeted.
- 204 rework: screenshot showed the desktop verdict collapsed to ~40px (overflow hidden on a flex item drops min-height auto); flex-shrink 0 fixed it, re-verified at 1280 and 390.
- 205 docs: accepted. 206 SPEC: emitted `<<<FILE>>>` instead of REPLACE and overwrote SPEC.md with 4 lines; caught, restored from git, re-parsed as REPLACE. 207 echoed my instruction as the totals line; 208 fixed it.
- Key: 10 calls, 5,861/6,015 tokens, 217.04 neurons, ~US$0.0024. Rework 201, 203, 204, 207, 208 = 42.17 neurons, 19.4%. 0 API failures.
- Receipts (seal-by 2026-11-13 00:05Z): 199 01M77V186JWF4893R1KX2B7NQD, 200 01M77V2Z8NBQMMEK7FKN0546RH, 201 01M77V41GK475GNFZRE2VB0GP9, 202 01M77V6DN5YK0W2Y6GQNNS7RRK, 203 01M77V8PPKQCDCR1Y35ZJ2E7AB, 204 01M77VB9D44C9WV8GVT71KX534, 205 01M77VCQWJ87VEE4M7H4EF20RF, 206 01M77VDW7DCJ2K4HJ99EMHPQVM, 207 01M77VEEZV23YATJQDZMWZJR54, 208 01M77VET97983G20X9PAY5JAD3.
- Known left for next sprints: on desktop the stamp overlaps the Score line a little; suspicion bars, continue countdown, night-train-tomas double portrait, i-restart artefact, weak textures, briefing card is still a blank paper with a dot.
- Prompt lessons: never use a generic anchor like `syncTitle();`; always show the block format with placeholder words that cannot be echoed; give the exact final text when it is a fixed line.

## M2 game feel sprint 2 (v0.4.11), 2026-11-12 21:18-21:26 BRT
- Housekeeping: qa/build/ was again deleted from the working tree at the start (git status D qa/build/*, cause unknown, same as run 25); restored with git restore qa/build before building.
- Reproduced before building (headless Chrome, tools/probe-gf2.mjs, mock mode, /workspace/casefiles-qa/run30/before-*.png, qa/m2gf2-probes/probe-before.json): the opened room is only marked on its button in Places and disappears from the screen as soon as the player moves to Ask/People/Board (no backdrop in #play at 1280 and 390); on desktop the CASE CLOSED stamp sits on the Score line (inline-block after an inline-flex paragraph, rotated), overlap 24px at 1280 (no overlap at 390).
- 209 html/js (scene markup in #play, syncScene with two-layer crossfade, EN/PT caption, hook at the end of renderRooms so open room, Start over, open file and language switch all update it): applied clean.
- 210 css (scene layers, vignette, caption, see-through conversation, reduced motion; stamp as centred block with 32px margin): applied clean.
- 211 rework (my screenshot review): backdrop almost invisible behind the conversation panel at 1280; panel alpha 0.72 to 0.5, log 0.62 to 0.4.
- 212 test/scene.mjs 8 checks + package.json script: 3 checks failed, the fake currentRoom returned a room object instead of an id.
- 213 rework: getRoom returns ids. 1 check left failing: it asserted that the faded-out layer loses its image (wrong, a crossfade needs it).
- 214 rework: replaced that assertion; my instruction wrongly assumed room a lands on layers[0] (sceneFront flips to 1 on the first apply), so it still failed. 215 rework: capture the room-a layer after the first sync. 8/8.
- 216 docs (CHANGELOG 0.4.11, package 0.4.11, README "M2 in progress (v0.4.11, game feel sprint 2)", BUILD_LOG, SPEC scene section): applied clean; left a double blank line in CHANGELOG. 217 SPEC test list and totals (planned) plus that blank line.
- Mutations (qa/m2gf2-probes/mutation-check.txt), each fails exactly one check: M1 renderRooms without syncScene; M2 no layer flip; M3 caption always English; M4 scene kept after reset; M5 opacity 1; M6 stamp back to inline-block 16px; M7 no fade transition.
- npm test 144/144 (was 136; scene 8 new), 2 clean full runs (qa/m2gf2-probes/npm-test-run1.txt, run2.txt), no keyboard flake. A first run raced with the mutation script and was discarded.
- After (run30/after-*.png, probe-after.json): 1280 and 390 the room plate stays at opacity 0.35 behind Ask with caption "Scene: Instrument room"; mid-crossfade both layers partly visible (0.20/0.15); PT caption "Cena: Sala de ensaio"; Start over clears it; reduced motion transition 0.01ms; stamp 29.5px below the Score line, 0 overlap, at 1280 and 390.
- Key: 9 calls (209-217), 7,260/6,381 tokens, 240.03 neurons, ~US$0.0026. Rework 4 calls (211, 213, 214, 215) = 32.62 neurons, 13.6% (was 19.4%). 0 re-parses, 0 wasted, 0 API failures, no FILE overwrite.
- Receipts (seal-by 2026-11-14 00:05Z): 209 01M794AAZS8KTR05ZB6R705MT4, 210 01M794BCFARB8J4HMXMVSG63XP, 211 01M794DFEBQCEP89NXEBGJYWW8, 212 01M794EAWNR06KAEQMQDXA6HWY, 213 01M794H3E2CFQ1B14V6HCKST95, 214 01M794HRQG8DGTGPQNNKZZ3X2P, 215 01M794J7XSZC8E6VP7PBDKQ7EN, 216 01M794NFJCRJB6NF9G5S23AHPN, 217 01M794QFTW05CT1RGJ1RJXSGK3.
- Seen, not fixed: pins keep the language they were pinned in (EN "Instrument room" still shown in the PT rail, run30/after-1280-pt.png); restartGame has an empty `if (typeof renderProgress === 'function') { }` left by call 201 (progress still re-renders through showStep and renderRooms).
- Prompt lessons: when a test fakes a global, state its exact type (id string vs object); never write a correction inline in a prompt, rewrite the instruction; derive expected indexes from the code before stating them.

### FullCup observations, M2 game feel sprint 2 (evidence qa/m2gf2-probes/seal/)
- Seal check (signed out curl, 2026-11-13 00:23Z): 132/132 HTTP 200, Genuine receipt, Sealed. 6 M2s4 + 10 gf1 + 99 art-batch (98 flux-1-schnell + 1 gemma) in the signed root of 2026-11-12 (one of 121, sealed 2026-11-13 00:05:22 UTC); the other 17 of run26/receipts.md still in the root of 2026-11-11. Exact costs: M2s4 $0.002044, gf1 $0.002388, the 99 $0.186938 (flux $0.186298 + gemma $0.000640), matching the logs. 0 not sealed, 0 not genuine, no bug.

## M2 game feel sprint 3 (v0.4.12), 2026-11-13 09:18-09:27 BRT
- Housekeeping: git status clean at start (qa/build/ present this time), nothing restored.
- Reproduced before building (headless Chrome, tools/probe-gf3.mjs, mock mode, /workspace/casefiles-qa/run31/before-*.png, qa/m2gf3-probes/probe-before.json): /api/case has no hints and the page has no toast container, so no hint ever appears (no #toasts at 1280 and 390, EN and PT); a room pinned in English keeps "Instrument room" on the board and in the rail after switching to PT while the room list shows "Sala de instrumentos" (1280 and 390).
- Not reproduced: the "empty `if (typeof renderProgress === 'function') { }`" in restartGame. The block in restartGame (and the same one in openPackFile) is not empty, it calls renderProgress(); it is only redundant with showStep, so it was left as is.
- 218 content + server (3 hints per case in content/case.json and content/cases/night-train.json, publicCase returns hints localised): applied clean.
- 219 html/js (#toasts markup, stopHints/showToast/startHints, hooks in init/openPackFile/restartGame, renderBoard maps pins to the current-language room name): applied clean; left a double blank line before #toasts.
- 220 css (fixed toast stack above the phone dock, slide-in/fade-out, reduced motion): applied clean.
- 221 test/hints.mjs 12 checks + package.json: 2 checks failed (toast class checked with classList although the page sets className; reduced-motion check took the first prefers-reduced-motion rule in the CSS), and the package.json block used invented old text (0 occurrences).
- 222 rework: those two lines + package.json script. 1 check still failing: the same classList mistake on the kicker and text lines, which I had not listed.
- 223 rework: kicker/text lines + the double blank line from 219. 12/12.
- 224 rework: npm test then failed "restartGame start over" in test/scoreboard.mjs (its sandbox has no startHints); added a no-op stub. A dependency I missed when planning 219.
- 225 docs (CHANGELOG 0.4.12, package 0.4.12, README, BUILD_LOG, SPEC section, test list, totals, case engine hints bullet): applied clean.
- 226 rework: mutation M6 (publicCase without localised text) was NOT caught: checks 2 and 3 were async callbacks inside the synchronous check(), so a throw became an unhandled rejection reported as PASS. Made them synchronous; M6 now caught.
- 227 rework: BUILD_LOG call range 218-225 to 218-227 after 226/227.
- Mutations (qa/m2gf3-probes/mutation-check.txt, script mutation-check.mjs), each fails exactly one check: M1 no gameOver guard; M2 text captured at schedule time; M3 startHints keeps old timers; M4 three toasts kept; M5 pins keep stored label; M6 publicCase drops localisation; M7 kicker always English; M8 restart does not start hints; M9 toast never fades.
- npm test 156/156 (was 144; hints 12 new), 2 clean full runs (qa/m2gf3-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run31/after-*.png, probe-after.json; probe scales timers of 20s or more by 1/10 in the QA browser only): 1280 and 390, EN "HINT A silhouette pushing a cart passed the instrument room window." and PT "PISTA Uma silhueta empurrando um carrinho passou pela janela da sala de instrumentos." at the bottom centre (390: above the dock), one toast; pins show "Sala de instrumentos" in the PT board and rail. Real-time run without scaling (after-real-1280-en.png, probe-after-real.txt): first toast present at about 47s after opening the board, as scheduled at 45s.
- Key: 10 calls (218-227), 9,750/8,269 tokens, 313.57 neurons, ~US$0.0034. Rework 5 calls (222, 223, 224, 226, 227) = 43.04 neurons, 13.7% (was 13.6%). 0 re-parses, 0 FILE overwrites, 0 API failures.
- Receipts (seal-by 2026-11-14 00:05Z): 218 01M7ADFQKE2T3SBB9PZ2JPVQEG, 219 01M7ADGXZCW0Y9GZ62S0HAGQ0K, 220 01M7ADJ7PF9Q1XJ9FCNKD730YA, 221 01M7ADPKXCDPHZYHVDV3QJ8W0V, 222 01M7ADT8DMM9A17J7A1YSDGNBX, 223 01M7ADTRFDKRQX426HD4WFHM8R, 224 01M7ADVNB8YQNZNYYXSG2PNA5G, 225 01M7ADXS629A5ND60PAD9PB04P, 226 01M7AE06ZN160H353AAAW5CKW9, 227 01M7AE0Q4JMPW56A2C85MKD0V2.
- Seen, not fixed: the board heading "Quadro de evidências"/"Evidence board" and the scene caption are light text on the light paper texture (low contrast, also in the before shots); hint toasts already on screen keep their language after a switch (new ones use the new language).
- Prompt lessons: when a test checks classes, say className vs classList for every assertion, not only the first; tell the model check() is synchronous and forbid async callbacks; list every existing test sandbox that evaluates a function you add a call to.

## M2 game feel sprint 4 (v0.4.13), 2026-11-13 21:23-21:30 BRT
- Housekeeping: git status clean at start (qa/build/ present), nothing restored.
- Seal check first (signed out curl, 2026-11-14 00:20Z = 21:20 BRT, qa/m2gf4-probes/seal/): the 9 gf2 (209-217) and 10 gf3 (218-227) receipts are all HTTP 200, Genuine receipt, Sealed at 2026-11-14 00:05:37 UTC, one of 19 in the signed root of 2026-11-13. Exact costs gf2 $0.002640 (240.03 neurons x $0.011/1000 = $0.002640), gf3 $0.003449 (313.57 neurons = $0.003449), both match the logs. 0 not sealed.
- Reproduced before building (tools/probe-gf4.mjs, mock mode, headless Chrome, /workspace/casefiles-qa/run32/before-*.png, qa/m2gf4-probes/probe-before.json): "Evidence board" / "Quadro de evidências" heading is #F3EADF directly on the light cork (median background 222,175,117), contrast 1.68:1 at 1280 and 390, EN and PT; the scene caption is var(--cf-lamp-dim) on rgba(12,11,10,0.6) over the cork, 2.15:1. A hint toast on screen in English stays English after switching to PT (before-1280/390-toast-switch.png, no data-hint on the toast).
- Picked for (b): the toast language follow-up, not suspicion bars. Suspicion bars need clue "implicates" data the client does not get today (publicCase hides it), so they need a server change and a spoiler decision, too big for this sprint.
- 228 css (ink plate on #board-title, light .scene-label text on a 0.88 plate): 0 of 2 blocks applied. The model put "<<<" in front of the old text of both blocks (prompt said "exactly three < characters at the start, then the old text", read as part of the old text).
- 229 rework: same task, format rewritten (marker line, old text with NO < in front, only marker lines start with <<<). Applied clean.
- 230 html (showToast(text, id) stores data-hint, startHints passes cur.id, new relabelToasts() before setLang, called after renderCabinet in setLang): applied clean.
- 231 test/legibility.mjs 8 checks + package.json script: applied clean, 8/8 on first run.
- 232 rework: after screens showed the 390 caption covering the top 6px of the new heading plate (my 228 spec had margin-top: 0); removed that line. 0px overlap after (probe-after.json captionOverHeadingPx).
- 233 docs (CHANGELOG 0.4.13, package 0.4.13, README x3, BUILD_LOG section, SPEC section, test list, totals): applied clean.
- Mutations (qa/m2gf4-probes/mutation-check.txt, script mutation-check.mjs): M1 heading text lamp-dim, M2 heading plate 0.2, M3 caption text lamp-dim, M4 caption plate 0.3, M5 toast drops data-hint, M6 startHints passes no id, M8 relabel blanks unknown toasts, M9 setLang does not relabel: each fails exactly one check; M7 relabel keeps old kicker fails two checks (open toast switches language; unknown toast keeps its text), both assert the kicker. All caught.
- npm test 164/164 (was 156; legibility 8 new), 2 clean full runs (qa/m2gf4-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run32/after-*.png, probe-after.json): heading and caption 13.67:1 at 1280 and 390, EN and PT, plate only as wide as the text (220px EN, 280px PT), caption does not overlap the heading; toast switch (QA browser timers of 20s or more scaled by 1/10): EN "Hint A silhouette pushing a cart..." becomes "Pista Uma silhueta empurrando um carrinho..." on the same toast at 1280 and 390.
- Key: 6 calls (228-233), 7,492/5,633 tokens, 221.45 neurons, ~US$0.0024. Rework 2 calls (228 format miss, 232 margin overlap) = 22.76 neurons, 10.3% (was 13.7%). 0 re-parses, 0 FILE overwrites, 0 API failures.
- Receipts (seal-by 2026-11-15 00:05Z): 228 01M7BPZ9VSKVHWM0DEVAKTSWVN, 229 01M7BPZVV93CQ9FY0KBTZWABGA, 230 01M7BQ0QHM1YVHHZ6FFADXHRXM, 231 01M7BQ253N4G8RS5RVC1MBT5GV, 232 01M7BQ820SMWEDK7RF5WDS5D5Y, 233 01M7BQAT02R53NDBEGBQ52BPKT.
- Prompt lessons: describe the REPLACE marker as its own line and say the old text has no < in front; when moving an element on top of a texture, check absolute siblings (the caption) before removing margins.

## M2 game feel sprint 5 (v0.4.14), 2026-11-14 09:28-09:37 BRT
- Housekeeping: git status clean at start (qa/build/ present), nothing restored. No earlier definition of the continue countdown in README/SPEC/notes (only "continue countdown" in the backlog), so it was designed small: only after a wrong verdict, 9 to 0, Try again / Give up, EN/PT, Escape, one polite announcement, reduced motion without the pulse.
- Reproduced before building (tools/probe-gf5.mjs, mock mode, headless Chrome, /workspace/casefiles-qa/run33/before-*.png, qa/m2gf5-probes/probe-before.json): after a wrong verdict at 1280 and 390, EN and PT, there is no #continue, nothing changes after 3s or 11s, the page only says "Game over. Use Start over for a new case." and the focus lands on the credits; same after a correct verdict, Enter and Escape do nothing.
- Real bug reproduced (before): Start over posted /api/session with no case id, so after opening The Night Train from Files and pressing Start over the server session played the default Violin file while the page showed Night Train; accusing Helena Costa gave "unknown suspect" (before-1280-en-nighttrain-startover.png). Same with a ?case=night-train link (init posted no case, tools/probe-gf5-urlcase.mjs, qa/m2gf5-probes/probe-urlcase-before.json). Fixed in this sprint because Try again reuses restartGame.
- 234 html/js (9 blocks: markup, accuse hook, verdict hides culprit while counting, restartGame(skipConfirm) + stopContinue + case id, listeners, openPackFile stop, setLang relabel, init case id, the continue functions): 8 of 9 applied; the markup block got 0 occurrences because the model wrote the old text as `</div >` (space before >).
- 235 rework: markup again, anchored on `<script type="module">` and with an explicit "no space before >" line. Applied clean.
- 236 css (fixed centred box z-index 120, big monospace number, pulse keyframes, GAME OVER red, visually hidden live region, reduced motion rule): applied clean.
- 237 rework: npm test then failed "Escape clears question input" in test/scoreboard.mjs (it reads the first keydown listener of the page and wants focus() in it); my 234 spec put the new Escape listener before the old one. Moved it after the old handler. Left one empty line, removed in 241.
- 238 test/continue.mjs 15 checks + package.json + scoreboard restartGame sandbox stub (stopContinue, openFile): 14/15; check 11 asserted `async function restartGame(` but fnSource starts at `function`, my spec error.
- 239 rework: that assertion uses startsWith('function restartGame(skipConfirm = false){'). 15/15.
- 240 rework: test/keyboard.mjs step "verdict-then-credits" accuses the first suspect (a wrong verdict) and expected focus on credits and the culprit in the verdict; both changed on purpose. The step now checks focus on Try again, culprit hidden, Escape to GAME OVER with focus on Close and culprit shown, Escape again to Start over with the box hidden. 13/13. A dependency I missed when planning (the keyboard e2e plays a wrong verdict).
- 241 docs (CHANGELOG 0.4.14, package 0.4.14, README x3, BUILD_LOG section, SPEC section, test list, totals) + the empty line from 237: 10/10 applied clean.
- Mutations (qa/m2gf5-probes/mutation-check.txt, script mutation-check.mjs): M1-M18 all caught; 17 fail exactly one check, M2 (count from 5) fails three (start at 9, count to 0, pulse after one tick shows 8).
- npm test 179/179 (was 164; continue 15 new, keyboard step 6 rewritten, same 13 steps), 2 clean full runs after the last change (qa/m2gf5-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run33/after-*.png, probe-after.json): at 1280 and 390, EN and PT, the box is centred and fully in view (1280: 360x210 at 460,295; 390: 358x210 at 16,317), shows 8 at about 1.5s, 5 at about 4.7s, GAME OVER / FIM DE JOGO at 11s with focus on Close and the culprit and solution back in the verdict; while counting the verdict reads "Wrong! Score: 0" only. Correct verdict: box hidden, focus on credits as before. Enter on Try again: new game of the same file, box hidden, verdict hidden, questions 0. Escape: GAME OVER with focus on Close. Reduced motion: animation none, count still went 7 to 5 in 2s. Start over and opening Night Train hide it. Night Train after Start over and a ?case=night-train link: accusing Helena Costa now gives a verdict, no "unknown suspect".
- Key: 8 calls (234-241), 11,696/8,931 tokens, 349.90 neurons, ~US$0.0038 (349.90 x $0.011/1000 = $0.003849). Rework 4 calls (235 markup format, 237 listener order, 239 my assertion, 240 keyboard test I missed) = 39.86 neurons, 11.4% (was 10.3%). 0 re-parses, 0 FILE overwrites, 0 API failures.
- Receipts (seal-by 2026-11-15 00:05Z): 234 01M7D0FB7HMMMX2EHQBYBAJJ81, 235 01M7D0H6FNSBSW5MX5HWS5EVGY, 236 01M7D0HZ5VQ6YZG0V4QQVVM4RJ, 237 01M7D0K2X95TXREVW45EY7NZ8S, 238 01M7D0S3Z5XY38E7ETKHMXPZYC, 239 01M7D0VWWKVY6YE27EXMRYDKYQ, 240 01M7D0WYNP74JK6HZAXPYAX99Q, 241 01M7D0ZG2DX8AE4YQ364G6DH2V.
- Seen, not fixed / gaps: (a) client-only: the server still returns culprit and solution in the /api/accuse response on a wrong verdict (the page just holds them back while counting), and a session is locked after one accusation (409), so Try again is a fresh session of the same file (questions and pins reset, the wrong attempt stays on the scoreboard with score 0). A continue that keeps your questions, a score penalty for continuing, or hiding the answer server-side need a server change and a product decision. (b) The "Game over. Use Start over for a new case." status line sits under the box while it counts (mixed message, minor). (c) The GAME OVER box covers the top of the verdict until Close or Escape (by design, Close returns the focus to Start over).
- Prompt lessons: for any old text with a closing HTML tag, anchor on a line without one or say "no space before >"; before adding a document-level listener, grep the tests for code that reads "the first keydown listener"; fnSource(name) starts at `function`, never assert `async function` on its output; when a sprint changes what a wrong verdict does, list every e2e step that plays a wrong verdict (keyboard.mjs step 6).

## M2 game feel sprint 6 (v0.4.15), 2026-11-14 21:00-21:20 BRT
- Housekeeping: git status clean at start (qa/build/ present), nothing restored. Felipi decided on 2026-11-14 14:52 BRT: Try again keeps restarting from zero (no change), suspicion bars approved, exposing which suspect each clue points to.
- Seal check first (signed out curl, 2026-11-15 00:07Z = 21:07 BRT, qa/m2gf6-probes/seal/all.txt): the 6 gf4 (228-233) and 8 gf5 (234-241) receipts are all HTTP 200, Genuine receipt, Sealed at 2026-11-15 00:05:42 UTC, one of 14 in the signed root of 2026-11-14. Exact cost sums gf4 $0.002436, gf5 $0.003849, both match the logs. 0 not sealed.
- Reproduced before building (tools/probe-gf6.mjs, mock mode, headless Chrome, /workspace/casefiles-qa/run34/before-*.png, qa/m2gf6-probes/probe-before.json): at 1280 and 390, EN and PT, there is no suspicion UI at all, and /api/ask answers only { answer, questions }, so the page cannot know which clue a question found or who it implicates (publicCase hides implicates/clears).
- Design: a question finds a clue when it contains a keyword of one of the asked suspect's clues (same rule as mock mode, case-insensitive, question only, not the answer, because broad keywords like "room" or a suspect's name would fire on almost any answer); once per session. Meter of 3 pips (Violin culprit has 3 implicating clues, Night Train 2), prime suspect at 2 leads. Two panels (under the conversation and above the accuse buttons) because the right rail is hidden at 390 and on tablet.
- 242 server (session `found`, clue lookup, `clue` in the response): 2/2 applied clean.
- 243 html (markup x3, state, susLabels/susNote/renderSuspicion/applyClue, askQuestion hook, renderCase hook, reset in restartGame and openPackFile via one block that matches twice): 8/8 applied, every new text verbatim, syntax ok. npm test then failed "askQuestion busy state: success path ran" (test/scoreboard.mjs sandboxes askQuestion without applyClue); stub added in 245, not a separate call.
- 244 css (panel, pips, hot/cleared/flash, live region, reduced motion): applied verbatim.
- 245 test/suspicion.mjs 15 checks + package.json + applyClue stub in the two scoreboard askQuestion sandboxes: applied verbatim (file identical to the spec, which I had dry-run locally before sending), 15/15.
- 246 rework: after screens read "1 lead(s)" / "2 pista(s)" (clunky) and a language switch replayed the row flash (flash flag never cleared). Proper singular/plural and flash used once after render, plus 3 test lines. 7/7 applied.
- 247 docs (CHANGELOG 0.4.15, package 0.4.15, README x3, BUILD_LOG section, SPEC section, test list, totals) + one test gap found by the mutation check (M6 "cleared keeps pips" was not caught because the cleared suspect had no hits; the check now gives Maya a lead first): 10/10 applied.
- Mutations (qa/m2gf6-probes/mutation-check.txt, script mutation-check.mjs): M1-M12 all caught after 247; 11 fail exactly one check, M8 (no live text) fails three.
- npm test 194/194 (was 179; suspicion 15 new), 2 clean full runs (qa/m2gf6-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run34/after-*.png, probe-after.json): at 1280 the panel is 774x180 under Questions used and 218x180 in the accuse column; at 390 324x180 in Ask and 358x180 above the accuse buttons, EN and PT. Lorenzo "lock" fills 1 pip on Carlos and announces "New lead: points to Carlos Mendes"; "violinist nervous" marks Maya Cleared (struck through, green); Maya "cart" makes Carlos "2 leads · prime suspect" (red edge); "lock" again returns clue null, still 2. Language switch keeps the bars, relabels them and no longer flashes. Start over and opening Night Train empty them; Night Train Tomás "apron" points to Inês Duarte. Reduced motion: flash animation none, pip transition off.
- Key: 6 calls (242-247), 10,989/8,928 tokens, 343.39 neurons, ~US$0.0038 (343.39 x $0.011/1000 = $0.003777). Rework 1 call (246 plural and flash) = 26.05 neurons, 7.6% (was 11.4%). 0 re-parses, 0 FILE overwrites, 0 API failures.
- Receipts (seal-by 2026-11-16 00:05Z): 242 01M7E86PX6CMG181BT6956SZP5, 243 01M7E87S2ZX7KS74EQBARZ9BZH, 244 01M7E89H4S0STCW3P82QKNYMXS, 245 01M7E8C1910P7Z9F2Y2V3QFVFJ, 246 01M7E8H0YMK34941R9JJ0Y4E5P, 247 01M7E8KFCNC91QG8YZTBHTY127.
- Seen, not fixed: (a) the accuse panel row flash plays when the Accuse step is opened (CSS animation restarts when the hidden panel becomes visible; the class stays until the next render); (b) the live line keeps the last announcement's language after a switch (not re-announced, harmless); (c) in live mode a lead counts by the question's keyword, so a vague answer from the model can still count as a found clue; (d) the meter maximum is a fixed 3 for every case.
- Prompt lessons: plural strings belong in the spec, never "(s)"; any one-shot UI flag (flash) must be cleared in the same render that shows it; when a feature adds a call inside a function that tests sandbox (askQuestion), add the stub in the same sprint; mutation-test the "already had hits" path for any reset/clear state.

## M2 game feel sprint 7 (v0.4.16), 2026-11-15 08:55-09:10 BRT
- Housekeeping: git status clean at start (qa/build/ present), nothing restored. No seal check this run: receipts 242-247 seal at 2026-11-16 00:05Z (21:05 BRT tonight). No product decision needed: Raquel Mattos (backer, sprint 11 post) said the accuse confirm step slows quick players, so the skip is optional and off by default (the confirm still shows unless the player unchecks it).
- Reproduced before building (tools/probe-gf7.mjs, mock mode, headless Chrome, /workspace/casefiles-qa/run35/before-*.png, qa/m2gf7-probes/probe-before.json): at 1280 and 390, EN and PT, every accusation opens the native confirm ("Accuse Carlos Mendes? You only get one accusation." / "Acusar Carlos Mendes? Você só tem uma acusação.") and there is no way to skip it (#ask-confirm absent). Seen-not-fixed (a) from sprint 6 reproduced at all four: after a lead is found in Ask, the hidden accuse panel row keeps class `flash` with no running animation; opening Accuse 1.5 s later starts `cf-sus-flash:running` on it. (b) reproduced: after "lock" in EN the live line is "New lead: points to Carlos Mendes" and stays English after switching to PT.
- Design: a native confirm cannot hold a checkbox, so the "don't ask again" control is a labelled checkbox "Confirm before accusing" / "Confirmar antes de acusar" right under the accuse buttons (after them so the tab order test is unchanged), checked by default; unchecked stores localStorage cf-confirm-accuse=off and accuse buttons accuse at once; checking it again removes the key and the dialog is back. Flash fix: the `flash` class is only added to a .sus-list that is on screen (offsetParent not null), so a hidden panel has nothing to replay. Live line: applyClue keeps the last clue (susLast), susSaid() builds the text, relabelSuspicionLive() in setLang rewrites a non-empty line.
- 248 html+css (8 blocks: checkbox markup, state, flash only on screen, susSaid/applyClue/relabelSuspicionLive/confirmOn/setConfirmOn/renderConfirmToggle, accuse click, setLang hook, change listener + first render, CSS): 8/8 applied, but the markup line came back ending `</label>>` (one stray >, the only difference from the dry-run copy).
- 249 rework: remove the stray > (1 block). Page and CSS then identical to the dry run.
- 250 test/quick-accuse.mjs 9 checks (FILE) + package.json script + test/suspicion.mjs sandbox (susSaid in the source list, `let susLast = null`): all verbatim, identical to the dry-run files. My first dry run had found the keyboard accessible-names step needs `label[for]` (wrapping label alone fails), fixed in the spec before 248 was sent.
- 251 docs (CHANGELOG 0.4.16, package 0.4.16, README x3, BUILD_LOG section, SPEC accuse line + new section + test list + totals) + 2 test lines for the one mutation gap (M16 "empty clue still saved": an empty clue wiped the last line and no check saw it): 11/11 applied verbatim.
- Mutations (qa/m2gf7-probes/mutation-check.txt, script mutation-check.mjs, runs test/quick-accuse.mjs and test/suspicion.mjs): M1-M16 all caught after 251; 13 fail exactly one check, M6 (checkbox not synced) two, M1 (stored off ignored) four.
- npm test 203/203 (was 194; quick-accuse 9 new), 2 clean full runs (qa/m2gf7-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run35/after-*.png, probe-after.json): checkbox visible and checked at 1280 (163x44 EN, 170x44 PT at 590,490) and 390 (16,546), default accusation still shows 1 dialog EN/PT. Space on the focused checkbox unchecks it (stored off, focus stays); after a reload it is still unchecked and the accusation opens 0 dialogs and shows the verdict (after-1280-en-skip-on.png); Start over keeps it unchecked; PT relabels it; clicking it again brings the PT dialog back. The talk panel row still flashes (cf-sus-flash running) and the accuse panel row has no flash when Accuse opens, at all four. Live line EN "New lead: points to Carlos Mendes" becomes "Nova pista: aponta para Carlos Mendes" on switch, empty after Start over.
- Key: 4 calls (248-251), 8,601/6,992 tokens, 268.88 neurons, ~US$0.0030 (268.88 x $0.011/1000 = $0.002958). Rework 1 call (249 stray >) = 3.77 neurons, 1.4% (was 7.6%). 0 re-parses, 0 FILE overwrites, 0 API failures. No live play call (no model prompt changed), so qa/key-usage-log.json has no new entry.
- Receipts (seal-by 2026-11-16 00:05Z): 248 01M7FH8993X7FGG4P2VZR5ETX8, 249 01M7FH9BYPSFAZXFW5CC7D293B, 250 01M7FH9VV0N95XTPFFBK5C0SSE, 251 01M7FHDVARA321ETK8C0SP6BVG.
- Seen, not fixed: the choice is per browser (localStorage), not per player account; with the confirm off a mis-click accuses at once (that is the point, and the box is right there to turn it back on). Earlier (c) live-mode keyword leads and (d) fixed meter max 3 unchanged.
- Prompt lessons: a markup line that ends in a closing tag can come back with a doubled > even with the "no space before >" line, so diff every applied block against a dry-run copy; check test/keyboard.mjs rules (label[for] for every input) before adding any input.

## M2 game feel sprint 8 (v0.4.17), 2026-11-15 20:57-21:20 BRT
- Housekeeping: git status clean at start (HEAD 597ef89). No product decision needed: talking portraits were already asked for by Felipi (2026-11-12) and Otto Dias asked whether they cost extra model calls.
- Seal check first (signed out curl, qa/m2gf8-probes/seal/): at 20:58 BRT (before the 00:05Z cut) all 10 receipts 242-251 were "Recorded, waiting for the daily seal"; at 21:07 BRT all 10 HTTP 200, Genuine receipt, Sealed at 2026-11-16 00:05:22 UTC, one of 10 in the signed root of 2026-11-15. Exact cost sums gf6 $0.003779, gf7 $0.002957, match the logs within rounding. 0 not sealed.
- Reproduced before building (tools/probe-gf8.mjs, mock mode, headless Chrome, /workspace/casefiles-qa/run36/before-*.png, qa/m2gf8-probes/probe-before.json): at 1280 and 390, EN and PT, an answer lands as one plain line ("A: ..." / "Resposta: ...") with no speaker avatar, no reveal, nothing moves; same on Night Train.
- Design: the generated "speaking" frames are a different pose (Helena even has a different outfit), so swapping neutral/speaking would jump, not talk. Instead scripts/assets/talk_frames.py (CPU, no model call) copies each neutral portrait and draws a small open mouth on the lip line (hand measured centre per suspect, darkest row within 3 px), giving a 256x128 two frame sheet; CSS `steps(1, end)` swaps the frames at 240 ms while startTalk() reveals 2 characters every 30 ms. Full line in an sr-only span (typed copy aria-hidden) so the role=log region is not read letter by letter; reduced motion shows the line at once; a click on #log finishes it; any re-render finishes a line in progress and shows history at once.
- 252 html (renderConversation + helpers, askQuestion renderConversation(true), log click listener) + css + FILE talk_frames.py: the 3 html blocks and the css block applied verbatim (identical to the dry run), but the model replaced the Python FILE with a 3 line `<<<FILE public/css/game.css>>>` that overwrote the stylesheet. Restored game.css from git and re-parsed only the CSS REPLACE block of the same output (label m2gf8-252b, no new call).
- 253 rework: the Python file alone (ALLOW=scripts/assets/talk_frames.py): verbatim. Ran it locally: 7 sheets, byte-identical to the dry-run sheets.
- 254 test/talk.mjs 10 checks (FILE) + package.json script (ALLOW set): verbatim.
- 255 docs (CHANGELOG 0.4.17, package 0.4.17, README x3, BUILD_LOG section, SPEC section + test list + totals, scripts/assets/README): 11/11 verbatim.
- Mutations (qa/m2gf8-probes/mutation-check.txt, script mutation-check.mjs): M1-M22 all caught (19 code/CSS/script, 3 asset: mouth missing, sheet missing, mouth shifted); 16 fail exactly one check, M1 (no avatar) six.
- npm test 213/213 (was 203; talk 10 new), 2 clean full runs (qa/m2gf8-probes/npm-test-run1.txt, run2.txt), no keyboard flake.
- After (run36/after-*.png, probe-after.json, after-talk-sheets.png): speaker 56x56 at 1280 and 48x48 at 390, EN and PT, sheet violin-lorenzo-talk.png; on landing the visible copy is empty, `is-talking` with cf-talk running, the sr-only copy already full; done after about 1.16 s for 77 characters, still face (background 0 0). Reduced motion: full at once, no animation. Click on the log: full at once, mouth stops. Language switch mid-line: finished and relabelled "Resposta:", no talking. Suspect switch and back: 3 answers, none talking. Night Train Helena uses night-train-helena-talk.png.
- Key: 4 calls (252-255), 10,978/8,807 tokens, 339.99 neurons, ~US$0.0037 (339.99 x $0.011/1000 = $0.003740). Rework 1 call (253 Python file dropped in 252) = 39.19 neurons, 11.5% (was 1.4%). 1 re-parse (252b), 1 FILE overwrite (game.css, restored from git before anything else ran), 0 API failures. No live play call (no model prompt changed), so qa/key-usage-log.json has no new entry.
- Receipts (seal-by 2026-11-17 00:05Z): 252 01M7GTWZPABGH6ZHJSRJ99WE33, 253 01M7GTYB6PRS62MXG33JSZK1NM, 254 01M7GTZ84AR2D6PX82Q67M2ZHW, 255 01M7GV6PVHGWHHMKN35V7V1E7W.
- Seen, not fixed: (a) after a language switch, earlier answers keep the language they were given in under the new prefix ("Resposta: I saw the case lock...", reproduced before and after; history stores the answer text, not a key); (b) the mouth flaps at a steady rate, not per syllable, and pauses only when the line ends; (c) the avatar's hidden initials ("LM") are part of the paragraph textContent (aria-hidden, invisible).
- Prompt lessons: never mix a non-web FILE (Python) with HTML/CSS REPLACE blocks in one prompt; the model swapped the file for the language of the blocks. Send such files alone and always set ALLOW so a stray FILE cannot overwrite a tracked file.

## M2 game feel sprint 9 (v0.4.18), 2026-11-16 08:51-09:20 BRT
- Housekeeping: git status clean at start (HEAD 36512ef). No product decision needed: a wrong verdict with a story and consequences was asked for by Felipi (2026-11-12) and promised in the sprint 8 post. Seal check of 252-255 not due yet (seal-by 2026-11-17 00:05Z).
- Reproduced before building (tools/probe-gf9.mjs on a HEAD worktree, mock mode, headless Chrome, /workspace/casefiles-qa/run37/before-*.png, qa/m2gf9-probes/probe-before.json): at 1280 and 390, EN and PT, Give up shows only "Wrong! / Culprit / Solution / Score 0" and GAME OVER "The culprit got away"; no consequence for the player, nothing about the accused. Also seen: after a language switch the Solution line keeps the language of the accusation ("Solução: The culprit is ..."), not fixed (same class as the answer-language issue of sprint 8).
- 256 stories (gemma, thinking off): 10 texts, all 25 to 30 words (asked 45 to 70) and wrong PT job titles.
- 257 rework (gemma): right length was still missed and Portuguese job titles leaked into the English texts ("A cozinheira do vagao-restaurante escaped...").
- 258 rework (gpt-oss-120b, reasoning low): lengths right, but violin/maya named Tomas Reyes (other case) as the thief, lorenzo said the investigation found Carlos, the necklace "vanished from the dining car", U+2011 hyphens.
- 259 fix (gpt-oss-120b): night train stories right; violin stories still wrong.
- 260 fix (gpt-oss-120b, violin only, sentence 2 only): better, still "after the missing violin was discovered" and "the blamed porter".
- Hand edits after 260 (qa/m2gf9-probes/hand-edits.txt, NOT via key): 5 phrase swaps (lorenzo EN/PT "discovered" -> "reported missing", maya EN/PT "blamed porter" -> "accused prodigy", tomas PT headline "Mensageiro" -> "Carregador noturno") and 3 U+2011 -> "-". Final text qa/m2gf9-probes/aftermath.final.json, merged into the case files keeping their formatting.
- Dry run first (qa/m2gf9-probes/dry/): server, page, CSS and test/aftermath.mjs written and passing before any code call.
- 261 code (gemma): server block verbatim; renderVerdict block had a wrong OLD (extra brace, 0 occurrences, nothing changed); CSS block used "  }\n}" as OLD with no separator (not applied). endContinue block verbatim.
- 262 rework (gemma): the two missing blocks with exact OLD anchors: page, server and CSS identical to the dry run.
- 263 test/aftermath.mjs FILE verbatim (identical to dry run); package.json block had a quote in OLD (0 occurrences), moved to 265.
- Probe after (run37/after-*): clipping present after Give up, timeout and Close, absent during the countdown and on a correct verdict, EN/PT, follows language with is-static, live line reads the headline, Night Train Victor story, reduced motion animation none. Found: the fixed, centred GAME OVER box covered the clipping at 1280 and 390.
- 264 dock fix (gemma): 2 CSS lines, but the block had no "=====" (harness skipped it); applied the model's NEW lines from the raw output in place of the last line (no new call). Identical to dry run. After screens: clipping fully readable at both sizes, box docked at the bottom (390 above the dock).
- 265 docs (CHANGELOG 0.4.18, package version + test script, README x3, SPEC section + list + totals, BUILD_LOG section, 1 extra check line in test/aftermath.mjs for the docking): 13/13 applied verbatim.
- Mutations (qa/m2gf9-probes/mutation-check.txt): 11 of 12 caught; M4 (server sends a story on a correct verdict) is equivalent: there is no story for the culprit, so the value is null either way.
- npm test 227/227 (was 213; aftermath 14 new). Run 1 had the known keyboard.mjs timeout flake (3 credits checks, kept as npm-test-run1-keyboard-flake.txt); runs 2 and 3 clean, keyboard.mjs alone 3/3 clean.
- Key: 10 calls (256-265), 13,638/14,762 tokens, 867.34 neurons, ~US$0.0095 (867.34 x $0.011/1000 = $0.009541). Rework 5 calls (257, 258, 259, 260, 262) = 616.64 neurons, 71.1% (was 11.5%): story quality from both models was the cost. 0 API failures, 0 FILE overwrites, 1 hand apply of a NEW block (264), 5 hand phrase edits in content.
- Receipts (seal-by 2026-11-17 00:05Z): 256 01M7J375GX67BKBB28CF8DYZDP, 257 01M7J3822V9HA79CBQS0NKVT45, 258 01M7J38P5E4KGJ260XHGDPN579, 259 01M7J3AK3ZYDYAM0QD6957MME4, 260 01M7J3C246C81BAH750SQB6CTH, 261 01M7J3GD1M63V709J562PC2JSB, 262 01M7J3HPJF9EG61KT1CR5ZA4K8, 263 01M7J3JF55EEM4E2XS8GGX30PZ, 264 01M7J3VVHPN8CTW8CCVRA0G1R1, 265 01M7J3X3Q85X9V9FED7G3PJRN7.
- Prompt lessons: for short narrative content give the model a fact sheet per story (who did it, where, what nobody learns) and forbid every other suspect by name; gpt-oss-120b keeps the length but borrows names across cases; gemma keeps facts but ignores word counts. Always anchor CSS appends on the exact last lines of the file.

## M2 game feel sprint 10 (v0.4.19), 2026-11-16 20:57-21:25 BRT
- Housekeeping: git status clean at start (HEAD e477a3f, v0.4.18, m1-via-key 21 ahead, not pushed). No product decision needed: a handcuffed culprit under CASE CLOSED was asked for by Felipi (2026-11-12).
- Seal check first (signed out curl, qa/m2gf10-probes/seal/): at 20:57 BRT all 14 receipts 252-265 were "Recorded, waiting for the daily seal"; at 21:08 BRT all 14 HTTP 200, Genuine receipt, Sealed at 2026-11-17 00:05:25 UTC, one of 14 in the signed root of 2026-11-16. Per receipt exact cost equals the build-log neurons x $0.011/1000 to the microdollar (costs.txt); gf8 $0.003740, gf9 $0.009540. 0 not sealed.
- Reproduced before building (tools/probe-gf10.mjs on HEAD, mock, headless Chrome 1280/390 EN/PT, run38/before-*.png, qa/m2gf10-probes/probe-before.json): a correct verdict shows only the text stamp over the desk plate, no culprit and no handcuffs. Also reproduced: (a) the CASE CLOSED stamp replays its slam on every language switch (node re-created with cf-stamp running); (b) the Solution line keeps the accusation language after a switch; (c) /api/accuse returns `culprit: "carlos"` for a Night Train game (server used the default case `c.culprit`).
- Art (Cup key, `@cf/black-forest-labs/flux-1-schnell`, 4 steps, 1024 px, chroma green, scripts in qa/m2gf10-probes/art/): 6 billed images x $0.001901 = $0.011406 (cap $0.50): Ines seeds 3811603 (kept, front view, cuffs at the waist), 3811604 (back view), 3811607; Carlos seeds 3811603 (back view, no skin tone), 3811612 (holds open cuffs), 3811613 (kept, head bowed, wrists cuffed). 10 Carlos attempts answered 502 `upstream_error` "The image model did not answer. Nothing was charged." (no receipt), while Ines prompts in the same minutes passed; it followed prompt and seed (same seed passed with another wording), so likely an upstream filter reported as a generic 502. Not charged, logged as unbilled.
- Background removal: the plates touch the bottom edge, so bgremove's flood key rejects them (border p95 93.5 and 347.3) and the integrated ToonOut fallback (MIT, pinned SHA) did the matte; forced flood key failed the acceptance check for Ines. Then trim, 128 px adaptive pixel finish, 1x/2x PNG+WebP, manifest items with receipts. Residual green 0.0.
- Dry run first (qa/m2gf10-probes/dry/): server, page, CSS, aftermath sandbox and test/arrest.mjs written and passing before any code call; stamp placement tuned on the dry screens (plate behind the stamp, nowrap, 224 px sprite).
- 266 code (gemma, thinking off): 5 blocks (server culprit + solutions, Solution line, arrest block, CSS append, aftermath sandbox), all applied, byte identical to the dry run.
- 267 test/arrest.mjs FILE + package.json script: identical to the dry run.
- 268 docs (CHANGELOG 0.4.19, package version, README x3, BUILD_LOG section, SPEC section + list + totals): 8/8 applied verbatim.
- Mutations (qa/m2gf10-probes/mutation-check.txt): 14 of 14 caught (M7 sprite after the stamp fails 2 checks, the rest 1).
- npm test 234/234 (was 227; arrest 7 new), 3 full runs clean + 1 after docs, no keyboard flake this time.
- After (run38/after-*.png, probe-after.json): at 1280 and 390, EN and PT, Carlos sprite loaded (violin-carlos-arrest.png), stamp over the upper body, caption under it; after a switch the stamp text changes with animation none (no replay), caption and Solution follow the language; reduced motion animation none; wrong verdict during the countdown has no arrest; Night Train gets culprit "ines" and Ines's sprite.
- Key: 3 code calls (266-268), 7,415/5,868 tokens, 227.45 neurons, ~US$0.0025 (227.45 x $0.011/1000 = $0.002502), plus art $0.011406 = $0.013908 total. Rework 0 calls = 0.0% (was 71.1%). 0 re-parses, 0 FILE overwrites, 0 hand applies. 10 unbilled image 502s.
- Receipts (seal-by 2026-11-18 00:05Z): code 266 01M7KDPNSH5JCNRXPMXXZH4QXS, 267 01M7KDQVZ2GK7ASCC94KE2HX76, 268 01M7KDY1E9YRRAZSGTZ811EVGF; art 01M7KCXMKP5GP6J6AD6WH12KC2 (Ines kept), 01M7KCZ4CYWRSZGCED7P4WE7JS, 01M7KD33YQ7QEHW3QSQP261Y4M, 01M7KD55ZC351G2FNXPWEP2GVY, 01M7KD63P4B4XYGXXG7X2VD68V, 01M7KD6DSPF7KVYPKXSS947AGS (Carlos kept).
- Prompt lessons: a reference diff plus "copy OLD from the - and space lines" gave 0 rework on gemma for 3 calls in a row; for flux, describe the costume colour of the existing portrait (cream jacket, dark red shirt) or the sprite drifts; plan for figures cut by the plate edge (the flood key will refuse them).
