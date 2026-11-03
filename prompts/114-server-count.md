# Task (sprint 6): a failed question must not count against the player
In POST /api/ask (src/server.js, written by you) the server does `sess.questions += 1;` BEFORE calling the model. When the call fails (no capacity, rate limit, upstream error) the player still loses score points (score depends on the question count). Requirement: count the question only after a successful answer, right before the 200 response. Failed calls change nothing in the session (neither history nor question count).

The two exact lines involved (current code, 8-space indent):
Line A (before the model call):
        sess.questions += 1;
Line B (the success response):
        return sendJSON(res, 200, { answer: trimmed, questions: sess.questions });

Output ONLY two literal edit blocks, nothing else:
1. <<<REPLACE src/server.js>>> newline, line A exactly, newline, =====, newline, the line `        // question is counted only after a successful answer (sprint 6)`, newline, <<<END>>>
2. <<<REPLACE src/server.js>>> newline, line B exactly, newline, =====, newline, `        sess.questions += 1;` newline line B exactly, newline, <<<END>>>
Separator is exactly five = characters on its own line. No prose, no fences.
