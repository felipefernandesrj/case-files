# Case Files launch (v1.1.0, 2026-11-26)

Play: https://case-files.fullcup.ai (free, no account). Mirror: https://case-files.felipefernandesrj.workers.dev

## How it runs
- Cloudflare Worker `case-files` in the FullCup account, custom domain case-files.fullcup.ai (the fullcup.ai site and its Workers are untouched).
- Static files: Workers assets built from public/ by `node worker/build.mjs`, which also bakes the four cases, suspect prompts, credits and the cost log into worker/gen/pack.json (the Worker reads no files).
- Each game is a Durable Object named by its session id. The question budget counts pending questions before any await, as in src/server.js. Games expire after 3 hours.
- One Hub Durable Object: daily caps, the shared scoreboard (top 100) and the live usage log.
- Model calls: llama-4-scout through the Cup proxy (qa-api.fullcup.ai) with the CUP_KEY secret, workload case-files:play, one retry on a short 429.

## Caps (worker/wrangler.jsonc vars)
| cap | value | player sees |
|---|---|---|
| spend per network per UTC day (IPv4 address or IPv6 /64, salted hash) | US$0.01 (about 5 to 10 games) | player_cap message |
| new games per network per day | 40 | too_many_games on the first question |
| spend for everyone per UTC day | US$1 | daily_cap message |
| model calls per minute, whole game | 50 (key allows 60) | rate_limited, Retry-After |
| Cup capacity empty | (Cup) | no_capacity, question not counted |

GET /api/today shows today's spend and caps. GET /api/usage lists the calls with receipts (no player data).

## Deploy
```
cd worker && node build.mjs && npx wrangler deploy        # with the FullCup Cloudflare profile
npx wrangler secret put CUP_KEY                            # from .fullcup-key, never printed
node tools/sync-live-usage.mjs && node src/costs.js        # book live calls in the cost log, then rebuild and deploy so /costs shows them
```
The `capcheck` env (workers.dev only, tiny caps, test network header) was used once to verify every cap live, then deleted.
