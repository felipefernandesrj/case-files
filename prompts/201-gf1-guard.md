Patch public/index.html only. Output exactly one REPLACE block, then stop. Format, with exactly three < characters at the start and a separator line of exactly five equals signs:

<<<REPLACE public/index.html>>>
OLD
=====
NEW
<<<END>>>

No commentary, no fences, no <<<FILE>>>.

Error from our test harness, which evaluates the start-over function on its own: "restartGame start over: visitedSteps is not defined". Make the reset safe when visitedSteps or renderProgress do not exist.

OLD (exact):
  visitedSteps.clear();
  visitedSteps.add('briefing');
  renderProgress();
NEW: the same reset, but only run the visitedSteps lines when typeof visitedSteps !== 'undefined', and only call renderProgress when typeof renderProgress === 'function'.
