# Task (sprint 5): suspects must remember the questions they were asked
In POST /api/ask (src/server.js), the per-session per-suspect history only stores the assistant answers, never the player's questions. The model therefore sees several assistant turns in a row with no questions, which lets it change its story between questions (live: Maya contradicted herself about the lock).
Requirement: after a successful answer, append BOTH turns to that suspect's history, in order: { role: 'user', content: question } then { role: 'assistant', content: trimmed }. Failed calls add nothing. The messages sent upstream stay: system prompt, then the history, then the new user question.

Current code (written by you), the only line to change:
        const newHist = [...hist, { role: 'assistant', content: trimmed }];

Output ONLY one literal edit block: <<<REPLACE src/server.js>>> newline, that exact old line, newline, =====, newline, the new line, newline, <<<END>>>. No prose.
