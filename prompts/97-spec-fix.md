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

- `GET /api/credits?lang=[pt|en]`
  - Returns credits information.
  - Shape: `{ title: string, backers: string[], example: boolean }`.
  - If the file (configured via `creditsFile` option, defaults to `data/credits.json`) is missing or invalid, returns: `{ title: "Thanks to the backers" | "Obrigado aos apoiadores", backers: [], example: false }`.

### Key & Mode Resolution
1. **Key**: Provided via `createServer` options, or environment variable `FULLCUP_KEY`, or a `.fullcup-key` file in the working directory.
2. **Mock Mode**: Enabled if `mock: true` is passed to `createServer`, if `process.env.MOCK === '1'`, or if no key is found.

### Scoreboard
- Persisted to `data/scores.json` (default).
- Records player name (max 24 chars), score, questions asked, correctness, language, and case ID.

## Upstream (`src/proxy.js`)

## Web page: closing screen

When the verdict is shown and the scoreboard loads, a closing screen (`#credits`) is rendered:
- **Content**: An `<h2>` for the title, a `<ul>` for backer names, and a small note if `example` is true.
- **Language**: Re-renders title/note on language switch without moving focus.
- **Focus**: After rendering, keyboard focus moves to `#credits` (the verdict is announced first via `role=status`).

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

Total checks: 67 (e2e: 42, proxy: 12, keyboard: 13).
<<<END>>>

# Review errors in your last edit
1. The heading "## Upstream (`src/proxy.js`)" now appears twice: once empty right before "## Web page: closing screen", and again after it. Remove the empty first one so the closing-screen section sits before the single Upstream section.
2. The closing-screen section does not say that data/credits.json holds example names ("Backer 1".."Backer 3", example: true) to be replaced with real backer names before release. Add one bullet.
Output ONLY literal edit blocks (exact old text, a line =====, new text, then <<<END>>>). No prose. Start directly with <<<REPLACE.

# Format error in your previous answer
Your blocks were not applied: the first line must be exactly "<<<REPLACE docs/SPEC.md>>>" (with the path and >>>), and the separator line must be exactly five equals signs "=====" (you wrote "==="). Same content, correct format.
