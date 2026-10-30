# Case Files: a pack of AI detective games

## Overview

Hi, I'm Caio Ventura. I make small browser mystery games where an AI plays every suspect. You ask questions, they lie, and you name the culprit.

This repo starts from **Caso em 3 Atos**, a working prototype: three suspects played by a language model, an interrogation room and a verdict. Every question is one model call through the FullCup proxy, so the game runs on capacity from backers. It uses only open models on Cloudflare Workers AI.

**The plan:** turn the prototype into a pack of four cases. I don't build ahead of the funding. Each milestone starts when its budget is funded, and I post progress, the cost of each case and play receipts as I go.

## Roadmap (funding goal: $120)

| # | Milestone | Budget | Deliverable |
|---|---|---|---|
| M1 | Caso em 3 Atos, polished | $25 | The existing case, public, in English and Portuguese, with a scoreboard and a friendly message when capacity runs out. |
| M2 | Case 2: The Night Train | $30 | A second case with 4 suspects and a moving timeline, on a shared case engine. |
| M3 | Case 3: The Generated Case | $35 | A generator that writes and validates new mysteries from a seed. |
| M4 | The Pack, published | $30 | One web app with every case, a case picker, a shared scoreboard and a public cost log for each case. |

## What backers get
- Early play links for each case, as soon as its milestone is delivered.
- Credit on the closing screen of each case.
- Monthly backers (Case Club): a vote on the next case's setting, plus developer notes.
- Everyone gets the receipts: every build and play call is signed and visible.

## Usage
```
node src/server.js                                  # mock mode, no key needed
FULLCUP_API_KEY=<your key> node src/server.js       # or put it in .fullcup-key (git-ignored)
npm test                                            # e2e in mock mode
```
Then open http://localhost:3000. The key stays on the server, and the browser never sees it.

See `docs/` for the PRD, the spec and the backbone notes.
