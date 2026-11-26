# Case Files: a pack of AI detective games

[![Case Files: AI detective games pack on FullCup](https://qa.fullcup.ai/projects/case-files-ai-detective-games-pack/badge.svg)](https://qa.fullcup.ai/cups/case-files-ai-detective-games-pack?ref=badge)

## Overview

Hi, I'm Caio Ventura. I make small browser mystery games where an AI plays every suspect. You ask questions, they lie, and you name the culprit.

This repo starts from **The Vanishing Violin**, a working case: three suspects played by a language model, an interrogation room and a verdict. Every question is one model call through the FullCup proxy, so the game runs on capacity from backers. It uses only open models on Cloudflare Workers AI.

**The plan:** turn the prototype into a pack of four cases. I don't build ahead of the funding. Each milestone starts when its budget is funded, and I post progress, the cost of each case and play receipts as I go.

## Roadmap (funding goal: $120)

| # | Milestone | Budget | Deliverable |
|---|---|---|---|
| M1 | The Vanishing Violin, polished | $25 | The current case, public, in English and Portuguese, with a scoreboard and a friendly message when capacity runs out. **Delivered 2026-11-09** ([delivery notes](docs/M1_DELIVERY.md)) |
| M2 | Case 2: The Night Train | $30 | A second case with 4 suspects and a moving timeline, on a shared case engine. **Delivered 2026-11-19** ([delivery notes](docs/M2_DELIVERY.md)) |
| M3 | Case 3: The Generated Case | $35 | A generator that writes and validates new mysteries from a seed. **Delivered 2026-11-20** ([delivery notes](docs/M3_DELIVERY.md)) |
| M4 | The Pack, published | $30 | One web app with every case, a case picker, a shared scoreboard and a public cost log for each case. **Delivered 2026-11-21** ([delivery notes](docs/M4_DELIVERY.md)) |

## What backers get
- Early play links for each case, as soon as its milestone is delivered.
- Credit on the closing screen of each case.
- Monthly backers (Case Club): a vote on the next case's setting, plus developer notes.
- Everyone gets the receipts: every build and play call is signed and visible.

## Usage
```
node src/server.js                                  # mock mode, no key needed
FULLCUP_KEY=<your key> node src/server.js       # or put it in .fullcup-key (git-ignored)
npm test                                            # run tests
node src/costs.js                                   # rebuild the public cost log (data/cost-log.json)
node src/cli.js --lang pt                           # play in the terminal
```
Then open http://localhost:3000. The key stays on the server, and the browser never sees it.

**M1 Delivered (2026-11-09, v0.4.0).**

**M2 Delivered (2026-11-19, v0.4.25).** The Night Train is the second case: 4 suspects (Helena, Victor, Tomás, Inês), a timetable that runs from 21:10 past midnight to 00:40 with the crime in the tunnel blackout, EN and PT text, on the same case engine as the Violin (shared fair play and timeline checks, case picker, `?case=night-train`, `CASE_ID=night-train`, `node src/cli.js --case night-train`). Around it M2 shipped a gothic-noir case picker and a one-viewport layout, pixel art made through the Cup key, a Case progress tracker, room scenes, timed hint toasts, suspicion bars, talking portraits, a CASE CLOSED stamp with the culprit in handcuffs, a CONTINUE? countdown with GAME OVER and a next-morning newspaper, a visible question budget (8 for the Violin, 10 for the Night Train) with a locked Ask box when it runs out, errors shown under the question box, and a terminal game fully in Portuguese. Each game has a cap of 20 model calls and the worst case is tested to stay under US$0.10. 283 automated checks. Details: [docs/M2_DELIVERY.md](docs/M2_DELIVERY.md).

**M3 delivered: The Generated Case (2026-11-20).** `node src/generator.js --seed "<text>"` writes a case through the Cup key and keeps it only if it passes the shape, fair play and timeline checks; generated cases show in the picker (EN/PT) with their cost and drafts.

**Pre-launch QA (2026-11-26, v1.0.1).** Stress test up to ~4400 sessions, 7 vision bot reviewers and 132 LLM bot games through the Cup key; fixes for the question budget race, cost leaks, verdict layout, scoring and generated-case hints. 334 automated checks. Details: [docs/prelaunch/TRIAGE.md](docs/prelaunch/TRIAGE.md).

**M4 Delivered: The Pack, published (2026-11-21, v1.0.0).** One web app with all four cases (The Vanishing Violin, The Night Train, The Lapa Midnight Heist, The Silent Batucada), a case picker, a shared pack scoreboard, a public cost log at /costs with a section per case and a receipt link for every call, and real credits on every closing screen. Cost per case: Violin US$0.051778, Night Train US$0.037506, Lapa US$0.003868, Samba US$0.002282; the shared build and tools line and the live total are on /costs. 317 automated checks, with an end to end play of every case. Details: [docs/M4_DELIVERY.md](docs/M4_DELIVERY.md).

**Game complete.** All four milestones are delivered: two handmade cases, a generator that writes and checks new ones from a seed, two generated cases in the pack, a scoreboard for the whole pack, a public cost log and credits for the backers who paid for it. Everything was built and played through the Cup key on open models, with a signed receipt for every call. Thank you to every backer.

M1 scope as shipped: bilingual (EN / PT-BR) with full PT wording pass, consistent suspects that never invent people, per-suspect history, answers under 60 words, keyboard and screen reader support, CDP tests, scoreboard (names shown as plain text), personal best per language (shown in your language, new best announced) with a confirmed reset, accuse confirmation before the one allowed accusation, ask busy state (aria-busy, locked #q and Accuse while waiting), Start over / Nova partida (fresh session without reload), Escape clears the question box while focused, Ask and Accuse lock after the verdict until Start over, Ask explains a missing suspect or empty question instead of returning silently (the hint clears when you pick a suspect), fair-play check, CLI, clear capacity messages (failed questions never count), and credits screen. 97 automated checks. Live play requires `FULLCUP_KEY` or `.fullcup-key`.

**New player?** Read [How to play / Como jogar](docs/HOW_TO_PLAY.md).
See `docs/` for the PRD, the spec and the backbone notes.
