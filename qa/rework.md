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
