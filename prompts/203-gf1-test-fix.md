Patch test/progress.mjs only. Output exactly four REPLACE blocks, then stop. Format, with exactly three < characters at the start, a separator line of exactly five equals signs, OLD copied exactly:

<<<REPLACE test/progress.mjs>>>
OLD
=====
NEW
<<<END>>>

No commentary, no fences, no <<<FILE>>>.

Errors from running your test: "FAIL renderProgress behaves: Unexpected end of input", "FAIL renderProgress returns without throwing when #progress-list is missing: Unexpected end of input", "FAIL showStep marks the step visited: Unexpected token ')'". Cause: the lazy regex /function renderProgress\(\) \{[\s\S]*?\}/ stops at the first closing brace, and the function declaration is passed to new Function without being called.

Block 1. OLD (exact):
  const renderMatch = html.match(/function renderProgress\(\) \{[\s\S]*?\}/);
  if (!renderMatch) throw new Error('renderProgress function not found');
  const renderFnSource = renderMatch[0];
NEW:
  const renderFnSource = fnSource('renderProgress') + '\nreturn renderProgress();';

Block 2. OLD (exact):
  const renderMatch = html.match(/function renderProgress\(\) \{[\s\S]*?\}/);
  const runner = new Function('visitedSteps', 'STEP_ORDER', 'document', renderMatch[0]);
NEW:
  const runner = new Function('visitedSteps', 'STEP_ORDER', 'document', fnSource('renderProgress') + '\nreturn renderProgress();');

Block 3. OLD (exact):
  const visitedSteps = new Set();
  const runner = new Function('visitedSteps', 'name', showStepMatch[0].replace('function showStep(name) {', '').replace('}', ''));
  runner(visitedSteps, 'locations');
  if (!visitedSteps.has('locations')) throw new Error('Step not added to Set');
NEW: a static check only: const src = fnSource('showStep'); throw if src does not include 'visitedSteps.add(name)' or does not include 'renderProgress'.

Block 4. OLD (exact):
// 5. renderProgress returns without throwing when #progress-list is missing
NEW: first define, at column 0, function fnSource(name): find the index of `function ${name}(` in the variable html, throw if missing, then from the first '{' after it count '{' and '}' until depth returns to 0, and return the substring from the function keyword through that closing brace. Then keep the OLD comment line. (Function declarations are hoisted, so earlier checks can use it.)
