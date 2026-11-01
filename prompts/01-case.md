# Product docs
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

# Case Files: a pack of AI detective games

[![Case Files: AI detective games pack on FullCup](https://qa.fullcup.ai/projects/case-files-ai-detective-games-pack/badge.svg)](https://qa.fullcup.ai/cups/case-files-ai-detective-games-pack?ref=badge)

## Overview

Hi, I'm Caio Ventura. I make small browser mystery games where an AI plays every suspect. You ask questions, they lie, and you name the culprit.

This repo starts from **Caso em 3 Atos**, a working prototype: three suspects played by a language model, an interrogation room and a verdict. Every question is one model call through the FullCup proxy, so the game runs on capacity from backers. It uses only open models on Cloudflare Workers AI.

**The plan:** turn the prototype into a pack of four cases. I don't build ahead of the funding. Each milestone starts when its budget is funded, and I post progress, the cost of each case and play receipts as I go.


# Task
Write ONE new original mystery case for this game (M1). Do not use a lighthouse or a ledger. New setting, 3 new suspects, exactly one culprit.
Output a single file content/case.json, strict JSON with this shape:
{"id":string,"title":{"en","pt"},"intro":{"en","pt"},"culprit":suspectId,
 "suspects":[{"id","name","role":{"en","pt"},"persona":{"en","pt"},"facts":"English private instructions for the role-play model: what they know, secrets, how they lie; culprit never confesses outright"}],
 "solution":{"en","pt"}}
PT must be natural Brazilian Portuguese. Clues must be discoverable by questioning; the innocents' facts must contain evidence pointing to the culprit.
