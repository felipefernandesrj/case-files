# Fix (sprint 5): test/consistency.mjs (written by you) passes 4/4 but never exits (hung > 4 min)
Cause: in 'Failed upstream call adds nothing' the first server from setupServer(...) is never closed and is not used. Also the summary line must match the other test files: `${passed} passed, ${failed} failed` (no 'Summary:' prefix, no leading newline), and the process must always exit (code 0 when all pass).

Exact current lines:
<<<FILE test/consistency.mjs (excerpt)>>>

  console.log(`\nSummary: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
<<<END>>>

Output ONLY literal edit blocks for test/consistency.mjs. Block 1: old text = exactly the line `      serverWithHistory.close();`, new text = that line plus a line `      server.close();`. Block 2: old text = the two lines starting at `  console.log(\`\nSummary:` (copied exactly from the excerpt), new text = the fixed summary line and `  process.exit(failed > 0 ? 1 : 0);`. Format: <<<REPLACE test/consistency.mjs>>> newline, old, newline, =====, newline, new, newline, <<<END>>>. No prose.
