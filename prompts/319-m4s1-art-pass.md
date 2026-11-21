Two of your edits to src/costs.js did not apply because their old text did not match the file. Here is the CURRENT text of those two places; copy the old text exactly from here. Example of ONE block (old text, a line =====, new text; no labels):
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

Place 1 (current text):
  for (const e of build) {
    const receipt = receiptOf(e);
    if (receipt && seenReceipts.has(receipt)) continue;
    
    packBucket.entries.push({
      at: e.at || ulidTime(receipt),
      kind: 'build',
      purpose: 'build:' + e.label,
      model: e.model,
      status: e.status,
      usd: entryUsd(e),
      receipt
    });
  }

  const allBuckets = [...buckets, packBucket];
Wanted: in the build pass, also add each non-null receipt to seenReceipts; then, before `  const allBuckets = [...buckets, packBucket];`, the art pass: for each item of `art`, skip it when its receipt is already in seenReceipts; bucket = buckets.find(b => b.id === artCase(item.asset)) || packBucket; push { at: ulidTime(item.receipt), kind: 'art', purpose: 'art:' + item.asset + ':' + item.attempt, model: item.model || null, status: 200, usd: round6(Number(item.usd) || 0), receipt: item.receipt || null }.

Place 2 (current text):
export function writeCostLog({ usageFile = 'qa/key-usage-log.json', buildFile = 'qa/build-log.json', outFile = 'data/cost-log.json' } = {}) {
  const usage = existsSync(usageFile) ? JSON.parse(readFileSync(usageFile, 'utf8')) : [];
  const build = existsSync(buildFile) ? JSON.parse(readFileSync(buildFile, 'utf8')) : [];
  
  const cases = {};
  for (const key of Object.keys(CASES)) {
    cases[key] = loadCase(CASES[key]);
  }

  const log = buildCostLog({ usage, build, cases });
  writeFileSync(outFile, JSON.stringify(log, null, 1) + '\n');
Wanted: a new option artFile = 'data/art-receipts.json'; read it like the others (missing file -> []; use the parsed object's .items when it is an array, else []) and pass it as `art` to buildCostLog.
Start your reply directly with <<<REPLACE. No analysis text.
