# SPEC
## Server (`src/server.js`, Node stdlib only)
- `GET /` static UI from `public/`.
- `GET /api/case` public case (no culprit).
- `POST /api/ask {suspectId, question, history[]}` → `{answer}`; errors `{error, code}` with code `no_capacity` (402/429 capacity:empty), `rate_limited`, `upstream_error`.
- `POST /api/accuse {suspectId}` → `{correct, culprit, solution}`.
- `GET /api/status` → `{mode: "mock"|"live", model}`.
## Upstream
`POST {FULLCUP_BASE_URL}/chat/completions`, `Authorization: Bearer <key>`, `X-FullCup-Workload: caso-em-3-atos:interrogate`. Model: `FULLCUP_MODEL` or first `@cf/` id from `GET /v1/models` (chat-capable heuristic: contains `instruct` or `llama`).
## Key
`FULLCUP_API_KEY` env, else `.fullcup-key` file (gitignored). None → mock mode (`MOCK=1` forces it).
