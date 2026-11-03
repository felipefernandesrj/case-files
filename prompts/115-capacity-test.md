# Task (sprint 6): new offline test file test/capacity.mjs
Write a new Node 20 ESM test file test/capacity.mjs (no dependencies, no network, no real key). Same style as the project's other tests: a small `test(name, fn)` runner that prints `PASS name` or `FAIL name: message`, then `N passed, M failed`, and `process.exit(failed ? 1 : 0)`. Run tests one after another (await each). Always close every server in a finally block.

Project API you can use (written by you earlier):
- `import { createServer } from '../src/server.js'` -> returns a node http.Server (not listening). Options: { caseFile: 'content/case.json', scoreFile: null, key: 'test-secret-key', baseUrl: 'http://upstream.test/v1', fetchImpl, mock: false }. Start with `server.listen(0)` and wait for 'listening'; port = server.address().port.
- `import { loadCase } from '../src/case.js'`; `loadCase('content/case.json')` returns the case object: `.suspects` (array of {id, name}), `.culprit` (suspect id).
- `import { friendly } from '../src/messages.js'`; `friendly(code, lang)` with codes no_capacity, rate_limited, bad_key, upstream, bad_request and lang 'en' | 'pt'.
- HTTP API of the game server: POST /api/session -> {sessionId}. POST /api/ask body {sessionId, suspectId, question, lang} -> 200 {answer, questions} or error {error, message} with status 402 (no capacity), 429 (rate limit), 503 (bad key), 502 (upstream). POST /api/accuse body {sessionId, suspectId, player, lang} -> 200 {correct, score, questions, ...}.
- fetchImpl is called as fetchImpl(url, {method, headers, body}) where body is a JSON string with a `messages` array. Make it return an object: success `{ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'I was in the stove room.' } }] }), text: async () => '' }`; failure `{ ok: false, status, json: async () => ({ error: { message: errMessage } }), text: async () => '' }`. Use one fake whose behaviour is controlled by a mutable variable (e.g. `let mode = 'fail402'`) and which records each parsed request body in an array.

Tests (exactly these 6):
1. "no_capacity text EN": friendly('no_capacity','en') contains "out of play capacity", "Backers" or "backers", and "FullCup".
2. "no_capacity text PT": friendly('no_capacity','pt') contains "sem capacidade de jogo", "apoiadores" and "FullCup", and does NOT contain "Copo".
3. "all messages are clean sentences": for every code and both langs, the text is non-empty, shorter than 200 characters, ends with ".", contains no "—" (em-dash), and does not contain the words "upstream" or "402".
4. "402 shows the friendly text and does not count the question": for lang 'en' and then 'pt': new session, mode 'fail402', ask -> status 402, body.message === friendly('no_capacity', lang), response text does not contain 'test-secret-key'; then mode 'ok', ask again -> 200 and body.questions === 1.
5. "upstream error does not count and leaves no history": mode 'fail500', ask suspect A with question 'FAILED-Q' -> status 502 and message === friendly('upstream','en'); then mode 'ok', ask the same suspect 'Second question' -> 200, questions === 1, and the last recorded upstream request's messages contain no message whose content is 'FAILED-Q'.
6. "score is not reduced by failed questions": new session, mode 'fail402', ask 5 times (all 402); then accuse the culprit (from loadCase) -> 200, correct === true, questions === 0, score === 100.

Output ONLY the file as <<<FILE test/capacity.mjs>>> newline, content, newline, <<<END>>>. No prose, no markdown fences.
