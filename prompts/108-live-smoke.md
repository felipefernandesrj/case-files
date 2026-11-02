# Task (sprint 5): live consistency smoke through the Cup key (not part of npm test)
Write test/live-consistency.mjs. Node 20+, ES modules, ZERO npm deps. It plays real questions through the FullCup proxy (llama-4-scout) using the project's own server, and checks two things: Maya's story about the lock stays the same across questions, and suspects never name people who are not in the case.

Project facts:
- src/server.js exports createServer({caseFile, scoreFile, key, baseUrl, fetchImpl, mock}) -> http.Server (not listening). Pass caseFile 'content/case.json', scoreFile null, mock false and NO key/baseUrl (the server reads the key itself from env FULLCUP_KEY or the file .fullcup-key, and uses the default base URL). Pass fetchImpl = a logging wrapper around globalThis.fetch.
- src/case.js exports loadCase() -> case with suspects [{id,name,...}] (ids lorenzo, maya, carlos; names "Lorenzo Moretti", "Maya Santos", "Carlos Mendes").
- Routes: POST /api/session -> {sessionId}; POST /api/ask {sessionId, suspectId, question, lang} -> {answer, questions} or an error status with {error, message}.
- Upstream answers are OpenAI-shaped JSON with usage {prompt_tokens, completion_tokens, total_tokens, neurons} and response headers x-fullcup-receipt-id, x-fullcup-seal-by, x-ratelimit-limit, x-ratelimit-remaining, x-ratelimit-reset.

Logging wrapper (security: NEVER print or store the key or the Authorization header):
- calls globalThis.fetch(url, opts), measures ms, reads usage with `await res.clone().json()` inside try/catch, keeps only headers whose name matches /^(x-fullcup|x-ratelimit|retry-after)/i, takes model from JSON.parse(opts.body).model, and returns the original response untouched.
- collects entries {at (ISO start time), purpose: 'sprint5-consistency:<lang>:<suspectId>', method:'POST', endpoint:'/chat/completions', model, status, ms, usage or null, cost:null, headers, error: null or the error body text when status is not 2xx}.
- at the end, append all entries to the JSON array in qa/key-usage-log.json (read it, push, write with 1-space indent).

Script flow: if there is no FULLCUP_KEY env and no .fullcup-key file, print "no key, skipped" and exit 0. Start the server with listen(0). For each lang in ['en','pt'] create one session and ask, in order:
- maya, 3 questions (EN: "Did you notice anything about the lock of the violin case?", "Tell me again, was the lock normal?", "So you are saying the lock was fine?"; PT: "Você notou algo na fechadura do estojo do violino?", "Repita, a fechadura estava normal?", "Então você diz que a fechadura estava em ordem?").
  Check: every one of the 3 answers matches EN /scratch|tamper|forced|damag/i or PT /arranh|risc|forçad|violad|danific/i, and none matches EN /nothing (unusual|odd|strange|wrong)/i or PT /nada de (estranho|anormal|incomum)/i.
- carlos, 2 questions (EN: "Who else was in the academy tonight? Name everyone you saw.", "Who works with you on the cleaning staff? Give me their names."; PT: "Quem mais estava na academia esta noite? Diga o nome de todos que você viu.", "Quem trabalha com você na limpeza? Diga os nomes.").
  Check: helper unknownNames(answer) returns capitalised words (/\b[A-ZÀ-Ý][a-zà-ÿ]+\b/g) that are NOT the first word of a sentence and NOT in an allow list (every part of the three suspect names, plus Stradivarius, Aurora, Academy, Academia, Maestro, I, PM, AM). Fail if unknownNames is not empty, or if the answer matches /\bJoe\b/.
- Any non-200 ask is a failure (record status and message, keep going).
Write a transcript to qa/live-consistency-sprint5.txt: for each ask "[lang] suspectId Q: question" newline "A: answer" newline "check: PASS|FAIL reason", then a totals line (calls, prompt and completion tokens, neurons) and the list of receipt ids with their seal-by. Print `PASS name` / `FAIL name: reason` for each check and finally `N passed, M failed`; exit 1 on any failure. Close the server at the end.

Output ONLY the file as <<<FILE test/live-consistency.mjs>>> ... <<<END>>>. No prose, no markdown fences.
