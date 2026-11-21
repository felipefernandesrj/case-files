Mutation check on test/pack-m4.mjs: deleting the `case=all` line from the /api/scores route in src/server.js (so /api/scores?case=all falls back to the per-case top 10 of the default case) was NOT caught, because check 8 only asserts that the answer is an array.
Make check 8 prove the pack scoreboard: before the request, start a SECOND server for this assert only: write a temp score file (node:os tmpdir + node:path join, a unique name) with JSON [ { "player": "ana", "score": 100, "questions": 3, "correct": true, "lang": "en", "at": "2026-11-20T10:00:00Z", "caseId": "case-violin-001" }, { "player": "Ana", "score": 80, "questions": 4, "correct": true, "lang": "en", "at": "2026-11-20T11:00:00Z", "caseId": "case-night-train-002" } ] using writeFileSync from 'node:fs' (add the imports at the top of the file), create it with createServer({ caseFile: 'content/case.json', scoreFile: <that file>, mock: true }), listen(0), wait 200 ms (the scoreboard loads the file asynchronously), GET /api/scores?case=all and assert the first row has total 180, solved 2 and cases 2 (a per-case top 10 has no `total`), then close that server and delete the temp file (unlinkSync).
Edit blocks only (old text copied exactly with its indentation, a line =====, the new text; no labels). Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
The exact current lines are (4 spaces):
    const r1 = await fetch(`${base}/api/scores?case=all`);
    assert(Array.isArray(await r1.json()), 's1');
and the first import line is exactly:
import { CASES } from '../src/case.js';
Start your reply directly with <<<REPLACE. No analysis text.
