One edit to src/costs.js did not apply: its old text ended with a closing brace that is not in the file. Here is the WHOLE current function; copy the old text exactly from it. Example of ONE block (old text, a line =====, new text; no labels):
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

Current function:
export function writeCostLog({ usageFile = 'qa/key-usage-log.json', buildFile = 'qa/build-log.json', outFile = 'data/cost-log.json' } = {}) {
  const usage = existsSync(usageFile) ? JSON.parse(readFileSync(usageFile, 'utf8')) : [];
  const build = existsSync(buildFile) ? JSON.parse(readFileSync(buildFile, 'utf8')) : [];
  
  const cases = {};
  for (const key of Object.keys(CASES)) {
    cases[key] = loadCase(CASES[key]);
  }

  const log = buildCostLog({ usage, build, cases });
  writeFileSync(outFile, JSON.stringify(log, null, 1) + '\n');
  return log;
}

Wanted: a new option artFile = 'data/art-receipts.json'; read it like the others (missing file -> []; use the parsed object's .items when it is an array, else []) and pass it as `art` to buildCostLog. Everything else unchanged.
Start your reply directly with <<<REPLACE. No analysis text.
