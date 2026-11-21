# M3 delivery: The Generated Case

Delivered 2026-11-20 (v0.5.2). Scope from the README: a generator that writes and validates new mysteries from a seed.

- Generator: `node src/generator.js --seed "<text>"` (sprint 1, v0.5.0), through the Cup key, gated by shape, fair play and timeline checks, up to 3 drafts with plain-word fixes.
- Playable: generated cases in `content/generated/` appear in the picker (EN and PT) with cost and draft count, own rooms, shared plate (sprint 2, v0.5.1), cost cap US$0.005 per generation.
- Checks: 307 automated checks. Live smoke `tools/smoke-m3.mjs` on the generated Lapa case through the Cup key: EN solved (100), PT lost on purpose.
- Acceptance criteria: (1) 20 of 20 seeds produce a valid case: `tools/gen-batch-m3.mjs` through the Cup key, 20 of 20 kept (13 on draft 1, 6 on draft 2, 1 on draft 3), US$0.0255 total, cases in qa/m3-batch/, re-checked by `tools/verify-batch-m3.mjs`; (2) the validator rejects unsolvable cases: 20 of 20 mutants (every clue implicating the culprit removed) rejected, plus the unit checks in test/generator.mjs; (3) one generated case playable: the Lapa case, picker EN/PT, live smoke.
- Receipts: 01M7XP21GYXZ16VYM8394BB9KP, 01M7XP25KEDP1FEWPYCR4XR5ZG.
- Screenshots: docs/m3/ (1280 and 390, EN and PT, mock server, no key calls).
- Known limits: generated cases share one rainy-night plate; scoreboard and cost log page are M4.
