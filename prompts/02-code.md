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


# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Task
Build the M1 game as a Node 20+ app, ES modules, ZERO npm dependencies (only node: built-ins). The case data lives in content/case.json (already exists; shape: {id,title{en,pt},intro{en,pt},culprit,suspects[{id,name,role{en,pt},persona{en,pt},facts}],solution{en,pt}}).
Files to produce:
- package.json ("type":"module", scripts start = node src/server.js, test = node test/e2e.mjs)
- src/server.js: HTTP server on PORT (default 3000). Serves public/index.html at /. API:
  GET /api/case?lang=en|pt -> public case info (title, intro, suspects id/name/role/persona). Never send facts, culprit or solution before accusing.
  POST /api/ask {suspectId, question, lang, history:[{q,a}]} -> {answer} ; role-play via the proxy with the suspect's facts in the system prompt, answer in the chosen language, in character, max ~80 words. Unknown suspect -> 400. Empty question -> 400.
  On no capacity (402 or capacity:empty) -> HTTP 402 {error:"capacity", message:<friendly text in lang>}. Other proxy errors -> 502 {error:"upstream", message:<friendly text>}.
  POST /api/accuse {suspectId, lang} -> {correct:boolean, culprit, solution}.
  Mock mode (no key, or env MOCK=1): deterministic in-character canned answer, no network.
  The key must never be sent to the browser or logged.
- public/index.html: single page, inline CSS+JS, EN/PT toggle (all UI strings translated), intro, 3 suspect cards, interrogation chat per suspect, accuse buttons, verdict screen with solution, friendly capacity message. Accessible: labels, keyboard usable, aria-live for answers.
- test/e2e.mjs: starts the server as a child process with MOCK=1 on a random free port, then checks via fetch: / returns HTML; /api/case en and pt with 3 suspects and no facts/culprit leak; /api/ask works for each suspect in both languages; 400 on bad input; accusing wrong suspect -> correct:false; accusing culprit -> correct:true. Also asserts the page HTML contains the language toggle. Prints PASS/FAIL per check, exits 1 on any failure, always kills the server.
