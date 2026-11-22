# M4 delivery: The Pack, published

Delivered 2026-11-21 (v1.0.0). Scope from the README: one web app with every case, a case picker, a shared scoreboard and a public cost log for each case.

## Scope vs shipped

| Scope item | Shipped | Where |
|---|---|---|
| One web app with every case | Yes. Four cases in one server and one page: The Vanishing Violin, The Night Train, The Lapa Midnight Heist (generated), The Silent Batucada (generated). EN and PT. | `node src/server.js`, `src/case.js` (CASES) |
| A case picker | Yes. Files opens the picker with 4 case cards, art, hook, and a "Generated case" tag with cost and drafts on the two generated cases. | `public/index.html` (cabinet) |
| e2e for every case | Yes. test/pack-m4.mjs check 10 plays every case of the pack through the server (session, ask, wrong accusation, right accusation). A mutation (wrong culprit in The Silent Batucada) makes it fail. | `test/pack-m4.mjs` |
| A shared scoreboard | Yes. Pack scoreboard on the picker (total score and cases solved per player across the pack, anonymous plays skipped) plus the per-case scoreboard after each verdict. | `GET /api/scores?case=all`, `src/scoreboard.js` |
| A public cost log for each case | Yes. `/costs` (EN and PT) with one section per case and a shared build and tools line, every call with model, tokens, cost and a link to its signed receipt on qa.fullcup.ai. | `GET /costs`, `GET /api/costs(?case=)`, `node src/costs.js` -> `data/cost-log.json` |
| Credits (promised to backers) | Yes. Closing screen of every case lists the 12 public backers plus "and 26 more backers who chose not to appear", with a link to that case's cost log. | `data/credits.json`, `GET /api/credits` |

## Checks

- 317 automated checks, all passing (`npm test`, 29 suites; qa/m4-probes/npm-test-final.txt).
- Live smoke through the Cup key on The Silent Batucada (`tools/smoke-m4.mjs`, qa/live-smoke-m4-delivery.json): EN asked Ricardo and solved it (score 100, 1 question), PT asked Beatriz and accused Lucas on purpose (lost, culprit Marta shown). Model llama-4-scout, answers consistent with the timetable. Receipts 01M8094TRFPFJY66PCN6VAEFP0, 01M80958449EXNA5ZGWPT2F388.
- Screenshots: docs/m4/ (1280 and 390, EN and PT, mock server, no key calls): picker with 4 cases, pack scoreboard, Samba rooms, Samba case closed, credits, cost log. No horizontal overflow at 390 (qa/m4-probes/shots-delivery-report.json).

## Cost per case (from /costs at release)

| Case | Cost | Calls | Receipts |
|---|---|---|---|
| The Vanishing Violin | US$0.051778 | 99 | 91 |
| The Night Train | US$0.037506 | 38 | 38 |
| The Lapa Midnight Heist | US$0.003868 | 16 | 16 |
| The Silent Batucada | US$0.002282 | 4 | 4 |
| Shared build and tools | US$0.600001 | 561 | 402 |
| Total | US$0.695435 | 718 | 551 |

Cost is neurons x US$0.011 per 1,000. The shared line holds the engine, the generator, the art and every build call.

## Key usage for M4

- Sprint 1 (v0.6.0): 23 calls (one HTTP 502 workers_ai_unavailable, no receipt), 888.55 neurons, about US$0.0098, rework 34.6%.
- Delivery (v1.0.0): 6 build calls (credits list bullets, scene label at 390, cost rule for the delivery smoke, e2e check for every case plus 2 fixes), 70.92 neurons, rework 34.7% (the e2e helper shadowed fetch, then my fix prompt missed 3 lines); 2 live smoke calls, 25.69 neurons. About US$0.0011 together.
- M4 total: 30 logged calls, 985.16 neurons, about US$0.0108; build rework 34.6%. All build calls on gemma-4-26b-a4b-it with thinking off. No AI art in M4.

## Fixed at delivery (reproduced first)

- Credits list at 1280: bullets stood about 96 px left of the centered names (qa/m4-probes/polish-before.json). Now no bullets, names centered (polish-after.json).
- Scene label at 390: "SCENE: BACK OFFICE" covered the Locations tab label in EN on Night Train, Lapa and Samba (qa/m4-probes/scene-390.json). Now it sits above the panel (scene-390-after.json, 0 of 8 overlaps).
- The delivery smoke was booked on the shared line; a cost rule now books it on The Silent Batucada.
- e2e gap: only 3 of 4 cases were played through the server in tests (The Silent Batucada never). Check 10 now plays all four.
- Not reproduced: the cost link contrast is 8.55:1 on the dark panel, nothing to fix.

## Known limitations

- The two generated cases share one rainy-night plate instead of their own art.
- The Cup page shows more spent on the key than the cost log (about US$0.12 of early calls were never logged locally).
- Tables on /costs scroll sideways inside their box at 390 (by design).
- The pack scoreboard needs a player name; anonymous plays count only on the per-case board.
