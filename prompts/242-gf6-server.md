Patch src/server.js only. Output exactly two REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE src/server.js>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: a Node.js HTTP server for a detective game. New: POST /api/ask also returns `clue` (the clue the question found, with the suspect it implicates and the suspect it clears, or null). Each clue counts once per session, kept in a new session field `found` (a Set of clue ids).

Block 1. Old text (exact, 1 line):
          accused: false,
New text:
BEGIN
          accused: false,
          found: new Set(),
FINISH

Block 2. Old text (exact, 2 lines):
        sess.questions += 1;
        return sendJSON(res, 200, { answer: trimmed, questions: sess.questions });
New text:
BEGIN
        sess.questions += 1;
        // suspicion bars (M2 game feel sprint 6): a question that hits a keyword of one of this suspect's clues finds that clue once per session
        const lowerQ = question.toLowerCase();
        const found = sess.found || (sess.found = new Set());
        const hit = (play.clues || []).find((cl) => cl.from === suspectId && !found.has(cl.id) && (cl.keywords || []).some((k) => lowerQ.includes(String(k).toLowerCase())));
        let clue = null;
        if (hit) {
          found.add(hit.id);
          clue = { id: hit.id, implicates: hit.implicates ?? null, clears: hit.clears ?? null };
        }
        return sendJSON(res, 200, { answer: trimmed, questions: sess.questions, clue });
FINISH
