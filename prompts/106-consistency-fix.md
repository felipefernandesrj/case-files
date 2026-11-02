# Fix (sprint 5): 2 test bugs in test/consistency.mjs (written by you); src is correct
```
FAIL Prompt Integrity (Content, Leakage, Maya, Names): Invented person detected in prompt: Never
FAIL Failed upstream call adds nothing: Second call should not have the first failed question in history
```
1. The cast section is followed directly by the line "Never invent or name any other person ..." (no blank line), so namesIn() reads rule words. Only collect lines that start with "- " after "The only people in this case are:".
2. In 'Failed upstream call adds nothing', the fetchImpl of serverWithHistory never increments callCount (it stays 0), so the first ask also succeeds. Make that fetchImpl use its own counter that increments on every call and fail only the first call.

Exact current lines:
<<<FILE test/consistency.mjs (excerpt)>>>
            if (foundPeople) peopleSection += line + " ";
      fetchImpl: (url, opts) => {
        history.push(JSON.parse(opts.body).messages);
        if (callCount === 1) return Promise.resolve({ ok: false, status: 502, json: async () => ({}), text: async () => '' });
<<<END>>>

Output ONLY literal edit blocks for test/consistency.mjs: <<<REPLACE test/consistency.mjs>>> newline, exact old text (copied from the excerpt, whole lines), newline, =====, newline, new text, newline, <<<END>>>. Two blocks. No prose.
