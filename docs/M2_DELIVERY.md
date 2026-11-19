# M2 delivery: Case 2, The Night Train

Delivered 2026-11-19 (v0.4.25). Budget in the roadmap: $30.

## What the roadmap promised, and where it is
| Promise | Shipped | Checked by |
|---|---|---|
| A second case | The Night Train (content/cases/night-train.json): the Duchess's sapphire necklace vanishes from the locked luggage car safe of the overnight train Southern Star. Full EN and PT-BR text, glossary, solution. Playable in the browser (case picker, `?case=night-train`, `CASE_ID=night-train`) and in the terminal (`node src/cli.js --case night-train`). | test/night-train.mjs, test/case-select.mjs |
| 4 suspects | Helena Costa (conductor), Victor Hale (jeweller), Tomás Reyes (night porter), Inês Duarte (dining car chef), each with a role, persona, alibi and private facts, played by an open model through the FullCup proxy. Five clues, each from one suspect, that implicate the culprit or clear an innocent. | fairPlay(c, { suspects: 4 }), test/night-train.mjs, test/suspicion.mjs |
| A moving timeline | A five stop timetable from 21:10 at Alder Crossing past midnight to 00:40 at Port Elling, with one crime stop (the Black Ridge Tunnel blackout at 23:35). Shown as the Timetable view in Places, EN and PT. | timelineCheck(c): order across midnight, known suspects, one crime stop with the culprit |
| A shared case engine | Both cases load through the same engine (src/case.js: CASES, loadCase, fairPlay, timelineCheck, unknownCaseLine); the server, the web page and the terminal game take a case id; an unknown id stops with one clear line. | test/case-select.mjs, test/e2e.mjs |

Also shipped during M2 (game feel sprints 1 to 16): gothic-noir case picker and one-viewport layout, pixel art made through the Cup key (portraits, rooms, covers, icons, arrest sprites), Case progress tracker, room scenes that crossfade, timed hint toasts, suspicion bars, "Confirm before accusing" switch, talking portraits, CASE CLOSED stamp with the culprit in handcuffs, CONTINUE? countdown, GAME OVER with a next-morning newspaper, errors shown under the question box, a visible question budget (8 for the Violin, 10 for the Night Train) with a locked Ask box, and a terminal game fully in Portuguese.

## Screenshots (played live through the Cup key, 2026-11-19)
- docs/m2/1280-pt-1-picker.png: the case picker (PT).
- docs/m2/1280-en-3-timetable.png: the Night Train timetable across midnight.
- docs/m2/1280-en-4-talk.png and docs/m2/390-pt-4-talk.png: a live answer with the talking portrait, 7 of 10 questions left, suspicion bars pointing at Inês.
- docs/m2/1280-pt-6-case-closed.png and docs/m2/390-en-6-case-closed.png: CASE CLOSED with the culprit in handcuffs.
- docs/m2/1280-en-8-game-over.png: a wrong accusation, GAME OVER and the next-morning newspaper.

## Acceptance run, 2026-11-19 BRT
- `npm test`: 283/283 (26 test files).
- Live smoke through the Cup key (tools/smoke-m2.mjs, llama-4-scout): EN Helena 200 (49 words, budget 10, 9 left) then a correct accusation of Inês, score 100; PT Victor 200 (34 words, Portuguese, in character) then a wrong accusation of Helena, score 0. Output in qa/live-smoke-m2-delivery.json.
- Screenshots: 12 live calls through the Cup key (tools/shots-m2.mjs), all 200.

## Cost (from local logs: qa/key-usage-log.json, qa/build-log.json, qa/rework.md)
- Text calls through the Cup key from 2026-11-10 to 2026-11-19 (build, live play, probes): 192 logged requests, 184 with HTTP 200, 159 distinct receipt ids, about 239,406 prompt and 206,328 completion tokens, 8,601 neurons, about US$ 0.095 at US$ 0.011 per 1,000 neurons. Pixel art receipts are logged separately in qa/rework.md.
- Sealed receipts are public at https://qa.fullcup.ai/receipts/{id}.

## Known limits
- Credits screen still uses example names (data/credits.json `example: true`).
- The scoreboard shows "anon" when no name is given.
- Live play needs the Cup key on the server; there is no hosted play link yet (planned for M4).

## Next: M3, The Generated Case ($35)
A generator that writes and validates new mysteries from a seed, using the same fairPlay and timelineCheck gates.
