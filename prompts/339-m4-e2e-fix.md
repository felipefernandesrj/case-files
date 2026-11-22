Conserve as many tokens as possible and be fast (merge commands in few calls).
Check 10 in test/pack-m4.mjs fails with "Maximum call stack size exceeded": the helper is named fetch and calls itself. Also it ignores HTTP status and never closes the server when an assert throws. Replace the helper and the session lines; keep the rest.

Three edit blocks (old text copied exactly, a line =====, new text; no labels):

1. old (one line, 6 spaces):
      const fetch = (p, m, b) => fetch(`${url}${p}`, { method: m, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(r => r.json());
new: a helper named call (same arguments) that uses globalThis.fetch and returns { status: r.status, ...(await r.json()) }, written as an async arrow function.

2. old (one line, 6 spaces):
      const s1 = await fetch('/session', 'POST', { case: k });
new: wrap the rest of the loop body in try { ... } finally { srv.close(); } is too big for one block, so instead put on this line: const s1 = await call('/session', 'POST', { case: k }).catch((e) => { srv.close(); throw e; }); and on the next line assert(s1.status === 200, 'e2e ' + k + ' session');

3. old (one line, 6 spaces):
      await fetch('/ask', 'POST', { sessionId: s1.sessionId, suspectId: suspects[0].id, question: 'Where were you?', lang: 'en' });
new: const q1 = await call('/ask', 'POST', { sessionId: s1.sessionId, suspectId: suspects[0].id, question: 'Where were you?', lang: 'en' }); then on the next line assert(q1.status === 200, 'e2e ' + k + ' ask');

Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
