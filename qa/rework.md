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
