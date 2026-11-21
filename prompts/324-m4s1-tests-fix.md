Your test changes fail. Errors from running them:

1. `node test/pack-m4.mjs`:
    const r6 = await fetch(`${base}/api/costs?case=bad_file_test'); // We need a second server for this
SyntaxError: missing ) after argument list
(the template literal is never closed; that request is not needed at all, the second server below it already tests no_cost_log).

2. `node test/keyboard.mjs`:
FAIL credits-a11y: Cannot access 'creditsData' before initialization
FAIL credits-pt: Cannot access 'creditsData' before initialization
test/keyboard.mjs already defines `creditsData` at the top of the file (it reads data/credits.json). Your new lines `const creditsData = await evaluate(`window.creditsData`);` declare a second creditsData inside each step, which shadows the outer one (and window.creditsData does not exist). Remove both of those lines so the steps use the outer creditsData.

Fix with edit blocks only (old text copied exactly with its indentation, a line =====, the new text; no labels). Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
The exact old lines are:
in test/pack-m4.mjs (4 spaces):
    const r6 = await fetch(`${base}/api/costs?case=bad_file_test'); // We need a second server for this
in test/keyboard.mjs (2 spaces, appears twice, so send two blocks whose old text includes the line before it):
  const noteVisible = await evaluate(`!document.getElementById('credits-note').hidden`);
  const creditsData = await evaluate(`window.creditsData`);
and
  await waitFor(async () => (await evaluate(`document.getElementById('credits-title').textContent`)) === creditsData.title.pt);
  const creditsData = await evaluate(`window.creditsData`);
Start your reply directly with <<<REPLACE. No analysis text.
