# Sprint 4 feature spec: closing screen with backer credits
- New data file data/credits.json: {"example": true, "note": "Example data. Replace with real backer names before release.", "title": {"en": "Thanks to the backers", "pt": "Obrigado aos apoiadores"}, "backers": ["Backer 1", "Backer 2", "Backer 3"]}.
- src/server.js: new route GET /api/credits -> 200 JSON {title (string in lang, from ?lang, default en), backers:[string], example:boolean}. createServer gets a new option creditsFile (default 'data/credits.json', resolved from the project root like caseFile). If the file is missing or invalid JSON, return 200 {title (EN "Thanks to the backers" / PT "Obrigado aos apoiadores"), backers:[], example:false}; never crash. Everything else in server.js unchanged.
- public/index.html: after a verdict is shown (after the scoreboard loads), fetch GET /api/credits?lang=<lang> and show a closing screen: <section id="credits" aria-labelledby="credits-title" tabindex="-1"> containing <h2 id="credits-title"> with the title, a <ul id="credits-list"> with one <li> per backer, and, when example is true, a small note (EN "Example names", PT "Nomes de exemplo"). Keyboard focus moves to #credits after it renders (the verdict is still announced first because it is role=status aria-live=assertive). Switching language after the verdict re-renders the credits title/note in the new language. Hidden before the verdict.
- Sprint 4 also: PT-BR wording pass on case text and UI (no English left in PT UI; verdict, scoreboard and credits re-render on language switch without moving focus; the case text reloads in the chosen language). Tests now: e2e 42 + proxy 12 + keyboard 13 = 67 checks.

# Current file (written by you)
<<<FILE docs/SPEC.md>>>
# SPEC

## Server (`src/server.js`)

### Routes

#### Static
- `GET /`: Serves `public/index.html`.

#### API
- `GET /api/status`
  - Returns `{ mode: 'mock' | 'live', caseId: string }`.

- `GET /api/case?lang=[pt|en]`
  - Returns the public version of the case (no secrets).
  - Shape: `{ id, title, intro, suspects: [{ id, name, role, persona }] }`.

- `POST /api/session`
  - Starts a new game session.
  - Returns `{ sessionId: string }`.

- `POST /api/ask`
  - Body: `{ sessionId, suspectId, question, lang?: 'pt' | 'en' }`.
  - Returns: `{ answer: string, questions: number }`.
  - Errors:
    - `400`: `unknown session`, `unknown suspect`, `empty question`, `question too long`.
    - `402`: `no_capacity` (upstream capacity exhausted).
    - `429`: `rate_limited` (upstream rate limit).
    - `502`: `upstream` (upstream error).
    - `503`: `bad_key` (invalid API key).

- `POST /api/accuse`
  - Body: `{ sessionId, suspectId, player?: string, lang?: 'pt' | 'en' }`.
  - Returns: `{ correct: boolean, culprit: string, culpritName: string, solution: string, score: number, questions: number }`.
  - Errors:
    - `400`: `unknown session`, `unknown suspect`.
    - `409`: `already accused`.

- `GET /api/scores`
  - Returns the top 10 scores for the current case.

### Key & Mode Resolution
1. **Key**: Provided via `createServer` options, or environment variable `FULLCUP_KEY`, or a `.fullcup-key` file in the working directory.
2. **Mock Mode**: Enabled if `mock: true` is passed to `createServer`, if `process.env.MOCK === '1'`, or if no key is found.

### Scoreboard
- Persisted to `data/scores.json` (default).
- Records player name (max 24 chars), score, questions asked, correctness, language, and case ID.

## Upstream (`src/proxy.js`)

The proxy communicates with the FullCup API:
- **Endpoint**: `{baseUrl}/chat/completions`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <key>`
  - `Content-Type: application/json`
  - `X-FullCup-Workload: case-files:play`
- **Payload**: `{ model, messages, max_tokens: 300 }`
- **Default Model**: `@cf/meta/llama-4-scout-17b-16e-instruct`

### Error Mapping
- `401` / `403` $\rightarrow$ `bad_key`
- `402` $\rightarrow$ `no_capacity`
- `429` (if body contains `capacity:empty`) $\rightarrow$ `no_capacity`
- `429` (otherwise) $\rightarrow$ `rate_limited`
- All other non-200 $\rightarrow$ `upstream`

## Testing

Run the full test suite via npm:
`npm test`

This executes:
1. `node test/e2e.mjs` (End-to-end flows)
2. `node test/proxy.mjs` (Upstream communication)
3. `node test/keyboard.mjs` (Manual/Keyboard interaction)
<<<END>>>

# Task: update docs/SPEC.md only, briefly
Add GET /api/credits (shape, ?lang, fallback when file missing/invalid, creditsFile option resolved from the project root) to the API routes, a short "Web page: closing screen" section (#credits, heading, list, example note, focus order: verdict announced, focus ends on #credits; language switch re-renders without moving focus), and mention data/credits.json is example data. Update the Testing section with the check counts. Keep everything else.
Output ONLY literal edit blocks (exact old text, a line =====, new text, then <<<END>>>):
<<<REPLACE docs/SPEC.md>>>
old
=====
new
<<<END>>>
No prose. Start directly with <<<REPLACE.
