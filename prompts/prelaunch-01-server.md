# Task (pre-launch QA fix 1): server hardening found by the stress bots
Edit src/server.js, src/proxy.js . Use ONLY literal edits for existing files:
<<<REPLACE path>>>
exact old text
=====
new text
<<<END>>>


Bugs, reproduced by tools/stress-bots.mjs against a fake upstream (200-1200 ms latency):
1. Question budget race: /api/ask checks `sess.questions >= budget` but `sess.questions` only grows after the model answers, so 8 parallel asks near the end of a game all pass. 40 of 200 burst bots got 10-15 answers on a budget of 8 or 10.
   Fix: count asks in flight. `sess.pending` (start 0). Budget check becomes `sess.questions + (sess.pending || 0) >= budget` (same 409 out_of_questions reply, `left: Math.max(0, budget - sess.questions)`). Increment `sess.pending` right after `sess.calls += 1`, decrement it in a `finally` around the model call (success and failure).
2. Asking after the verdict still calls the model: /api/ask never checks `sess.accused`. Fix: right after `const sess = sessions.get(sessionId);` in /api/ask, if `sess.accused` reply 409 `{ error: 'already_accused', code: 'already_accused', message: friendly('already_accused', lang) }` with no model call.
3. Sessions are never removed (RSS 90 MB -> 155 MB after about 5,000 games). Add options `sessionTtlMs = 2 * 60 * 60 * 1000` and `maxSessions = 5000` to createServer. Each session gets `seen: Date.now()`, refreshed on every /api/ask and /api/accuse. Add `function sweepSessions(now = Date.now())` inside createServer: delete sessions with `now - seen > sessionTtlMs`, then while `sessions.size >= maxSessions` delete the oldest (Map keeps insertion order, delete the first key). Call it at the start of POST /api/session. An expired session already gets the friendly unknown_session reply.
4. The Cup key allows 60 requests per minute for the whole game (live bots got `429 rate_limit_exceeded` with `retry-after: 6`). In src/proxy.js add option `retryMaxMs = 8000` and `sleep = (ms) => new Promise((r) => setTimeout(r, ms))` to createProxy. When the reply is 429 and the body is not capacity:empty and Retry-After (seconds) * 1000 <= retryMaxMs, sleep that long and send the same request once more (only one retry). A 402 or capacity:empty is never retried.

Current code (copy OLD text exactly from here):
CURRENT src/server.js EXCERPTS (reference only, never repeat them):
```
  key,
  baseUrl,
  fetchImpl,
  mock,
}) {
...
  // Session storage
  const sessions = new Map(); // sessionId -> {history:Map(suspectId=>msg[]), questions:number, accused:boolean}
...
        sessions.set(sessionId, {
          history: new Map(),
          questions: 0,
          calls: 0,
          accused: false,
          found: new Set(),
          file: wanted || defaultKey,
        });
...
        const sess = sessions.get(sessionId);
        const play = caseOfSession(sess);
        const suspect = play.suspects.find((s) => s.id === suspectId);
...
        const budget = questionBudgetFor(play);
        if (sess.questions >= budget) {
          return sendJSON(res, 409, { error: 'out_of_questions', code: 'out_of_questions', message: friendly('out_of_questions', lang), questions: sess.questions, budget, left: 0 });
        }
...
        sess.calls += 1;
...
        let answer;
        try {
          if (modeMock) {
            answer = mockAnswer(play, suspectId, question, lang);
          } else {
            answer = await proxy.chat(messages);
          }
        } catch (e) {
...
        const sess = sessions.get(sessionId);
        if (sess.accused) {
          return sendJSON(res, 409, { error: 'bad_request', code: 'already_accused', message: friendly('already_accused', lang) });
<<<END>>>
Note: `const sess = sessions.get(sessionId);` occurs twice (ask and accuse); every OLD text must be unique, so include the next line in each edit. In createServer the options list ends with `  fetchImpl,\n  mock,\n}) {` (unique).
```
CURRENT src/proxy.js EXCERPT (reference only):
```
export function createProxy({
  key,
  baseUrl,
  fetchImpl = fetch,
  model = '@cf/meta/llama-4-scout-17b-16e-instruct',
}) {
  const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';

  async function chat(messages) {
    const payload = {
      model,
      messages,
      max_tokens: 300,
    };

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-FullCup-Workload': 'case-files:play',
      },
      body: JSON.stringify(payload),
    });
<<<END>>>
```
Hint for 4: wrap the fetch in `const send = () => fetchImpl(endpoint, {...})`, `let response = await send();` then `if (response.status === 429) { const ra = Number(response.headers?.get?.('retry-after')); let body = ''; try { body = await response.clone().text(); } catch {} if (!body.toLowerCase().includes('capacity:empty') && Number.isFinite(ra) && ra * 1000 <= retryMaxMs) { await sleep(ra * 1000); response = await send(); } }`. Keep the rest of chat() unchanged.

Output ONLY the <<<REPLACE ...>>> blocks for src/server.js and src/proxy.js (no test file, no package.json). Start your answer with <<<REPLACE. Do not repeat the excerpts.
