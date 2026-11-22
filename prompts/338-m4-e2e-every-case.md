Conserve as many tokens as possible and be fast (merge commands in few calls).
M4 acceptance says "e2e for every case", but only the Violin, the Night Train and the first generated case are played through the server in tests; The Silent Batucada never is. Add check 10 to test/pack-m4.mjs that plays EVERY key of CASES through a mock server.

Facts: test/pack-m4.mjs already imports CASES from '../src/case.js', createServer from '../src/server.js', has assert(cond, msg) and report(idx, ok, msg). src/case.js exports loadCase(file) (returns the case JSON with .culprit and .suspects[{id}]). Server API (mock): POST /api/session body { case: key } -> { sessionId, budget }; POST /api/ask body { sessionId, suspectId, question, lang } -> 200; POST /api/accuse body { sessionId, suspectId, lang } -> { correct, culprit, score }.

Check 10, for each key k of Object.keys(CASES): c = loadCase(CASES[k]); open a session with { case: k } (status 200, budget > 0); ask the first suspect "Where were you?" in 'en' (status 200); accuse an innocent (correct === false); open a second session and accuse c.culprit (correct === true, culprit === c.culprit, score > 0). Use a server createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true }), await new Promise(r => srv.listen(0, r)), close it in finally. Message 'e2e ' + k on failure.

Two edit blocks (old text copied exactly, a line =====, new text; no labels):

1. test/pack-m4.mjs, old text (first line of the file):
import { CASES } from '../src/case.js';
new text:
import { CASES, loadCase } from '../src/case.js';

2. test/pack-m4.mjs, old text (2 lines, 2 spaces indent):
  } catch (e) { report(9, false, e.message); }

new text: the same 2 lines, then check 10 as a block in the same style as check 9 (  // 10, try { ... report(10, true); } catch (e) { report(10, false, e.message); }), then an empty line.

Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
