# M1 delivery: The Vanishing Violin, polished

Delivered 2026-11-09 (v0.4.0). Budget in the roadmap: $25.

## What the roadmap promised, and where it is
| Promise | Shipped | Checked by |
|---|---|---|
| The current case, public | The Vanishing Violin: 3 suspects (Maya, Carlos, Lorenzo) played by an open model through the FullCup proxy, one accusation, verdict and solution. Runs in the browser (`node src/server.js`) and in the terminal (`node src/cli.js`). Mock mode works without a key. | test/e2e.mjs (42) |
| English and Portuguese | Full EN and PT-BR UI and case text, PT wording pass, PT glossary so suspects answer in natural Portuguese, language toggle. | test/e2e.mjs, test/keyboard.mjs (lang-pt, lang-en, case-pt, credits-pt) |
| A scoreboard | Session scoreboard (player names as plain text), personal best per language with a confirmed reset, new best announced. | test/scoreboard.mjs (20) |
| A friendly message when capacity runs out | Clear EN and PT messages for 402, 429 capacity empty and 401. Failed questions never count against the score and never enter a suspect's memory. | test/capacity.mjs (6), test/proxy.mjs (12) |

Also shipped during M1: consistent suspects that never invent people (test/consistency.mjs, 4), keyboard and screen reader play (test/keyboard.mjs, 13, headless Chrome), accuse confirmation, Ask busy state, Start over / Nova partida, Escape clears the question, Ask and Accuse lock after the verdict, Ask hints, fair-play clue check, credits screen, player guide (docs/HOW_TO_PLAY.md).

## Acceptance run, 2026-11-09 21:3x BRT
- `npm test`: 97/97 (e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, keyboard 13). The first cold run had 3 keyboard timeouts (the known cold-Chrome flake); the immediate rerun passed 13/13.
- Live smoke through the Cup key (tools/smoke-m1.mjs, llama-4-scout): EN Maya 200 (41 words) then correct accusation, score 100; PT Carlos 200 (34 words, Portuguese) then wrong accusation, score 0, no best saved. 2 calls, 921 / 104 tokens, 30.6 neurons. Receipts 01M71DXPH99V0EA0CR170X3MYW, 01M71DXTQMZN91NFP0DD1Q0VBM (seal by 2026-11-11 00:05 UTC). Output in qa/live-smoke-m1-delivery.json.

## Cost (from local logs: qa/key-usage-log.json, qa/build-log.json, qa/rework.md)
- 17 sprints, 2026-10-31 to 2026-11-09, plus this acceptance run.
- 318 logged requests through the Cup key (build, live play and probes), 270 with HTTP 200, 172 with a FullCup receipt id.
- About 529,836 prompt and 358,666 completion tokens, 29,670 neurons, about US$ 0.33 at US$ 0.011 per 1,000 neurons. Rows without a receipt id (mostly the 2026-11-01 rebuild) are counted once each.
- Cup page on 2026-11-09 21:09 BRT: US$ 476.75 raised, 28 backers, US$ 0.43 used.
- Sealed receipts are public at https://qa.fullcup.ai/receipts/{id}. Example: sprint 16 receipts sealed 2026-11-09 00:05:24 UTC (9 of 9 Genuine); sprint 17 receipts show Genuine with exact cost (hint $0.000057, test $0.000122, docs $0.000241, rework $0.000042, live EN $0.000168, live PT $0.000169).

## Known limits
- Credits screen still uses example names (data/credits.json `example: true`).
- Live play needs the Cup key on the server; there is no hosted play link yet.

## Next: M2, The Night Train ($30)
A second case with 4 suspects and a moving timeline, on a shared case engine.
