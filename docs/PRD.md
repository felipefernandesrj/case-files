# PRD — Caso em 3 Atos
## Goal
Fund $120 of compute in 4 milestones to grow Caso em 3 Atos into a pack of AI detective games running on Workers AI: M1 polish Caso em 3 Atos ($25), M2 The Night Train on a shared engine ($30), M3 a validated case generator ($35), M4 the published pack with picker, scoreboard and public cost log ($30).
## Problem
Test creator project for FullCup: a small, fun app whose every action is a metered model call, exercising consumption, 402 and empty-key paths.
## Users
Players in a browser; the creator who funds it via a Cup.
## Requirements
- Interrogate 3 suspects in free text; each answers in character, consistent with hidden facts.
- Accuse one suspect; reveal verdict and solution.
- Key never reaches the browser. Works without key (mock mode).
- When the Cup has no capacity (402, or 429 `capacity:empty`), the player sees a clear message, not an error dump.
## Out of scope (M1)
Images, generated cases, scoreboard.
