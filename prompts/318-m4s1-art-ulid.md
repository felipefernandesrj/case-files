Product: Case Files (Node.js 20 ESM, built-ins only). src/costs.js builds the public cost log of every model call made through the FullCup key. Receipt ids are ULIDs: the first 10 characters are the creation time in milliseconds, Crockford base32 (alphabet 0123456789ABCDEFGHJKMNPQRSTVWXYZ).
The pixel art of the game was made through the key too; data/art-receipts.json is { note, items: [ { asset: 'characters/violin-carlos' | 'loc/night-train-tunnel' | 'i-score' ..., attempt: 'orig' | 'r1' ..., receipt, usd, model } ] }.

Make these changes to src/costs.js with edit blocks. Example of ONE block (old text copied exactly with its indentation, a line =====, the new text; no labels):
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

1. Add `export function ulidTime(id)`: if id is not a string of at least 10 characters return null; decode the first 10 characters (uppercase) with the alphabet above into a number of milliseconds; any character outside the alphabet returns null; return new Date(ms).toISOString(). Put it right after the receiptOf function, which is exactly:
export function receiptOf(e) {
  return e.headers?.['x-fullcup-receipt-id'] || e.headers?.['x-fullcup-receipt'] || null;
}

2. Add `export function artCase(asset)`: returns 'violin' when String(asset) matches /(^|\/)violin(-|$)/, 'night-train' when it matches /(^|\/)night-train(-|$)/, otherwise 'pack'.

3. buildCostLog gets a new option `art = []`. The current first line is exactly:
export function buildCostLog({ usage = [], build = [], cases = {}, now = new Date().toISOString() }) {
   - In the usage pass and the build pass, the entry time becomes `at: e.at || ulidTime(receipt)` (ten old entries have at: null but have a receipt). Both passes currently contain exactly the line (6 spaces):
      at: e.at,
   - After the build pass and before the line `  const allBuckets = [...buckets, packBucket];`, add the art pass: for each art item, skip it when its receipt is already seen (add seen receipts of the build pass to seenReceipts too); bucket = the case bucket with id artCase(item.asset), or packBucket when there is none; push { at: ulidTime(item.receipt), kind: 'art', purpose: 'art:' + item.asset + ':' + item.attempt, model: item.model || null, status: 200, usd: round6(Number(item.usd) || 0), receipt: item.receipt || null }.
   The current code of the two passes is:
      kind = cls.kind;
    }

    const bucket = buckets.find(b => b.id === targetCaseKey) || packBucket;
    bucket.entries.push({
      at: e.at,
      kind,
      purpose: e.purpose,
      model: e.model || null,
      status: e.status,
      usd: entryUsd(e),
      receipt
    });
    if (receipt) seenReceipts.add(receipt);
  }

  for (const e of build) {
    const receipt = receiptOf(e);
    if (receipt && seenReceipts.has(receipt)) continue;
    
    packBucket.entries.push({
      at: e.at,
      kind: 'build',
      purpose: 'build:' + e.label,
      model: e.model,
      status: e.status,
      usd: entryUsd(e),
      receipt
    });
  }

  const allBuckets = [...buckets, packBucket];

4. writeCostLog gets a new option artFile = 'data/art-receipts.json'; read it like the others (missing file -> no items; use .items of the parsed object, or [] when that is not an array) and pass art to buildCostLog. The current lines are exactly:
export function writeCostLog({ usageFile = 'qa/key-usage-log.json', buildFile = 'qa/build-log.json', outFile = 'data/cost-log.json' } = {}) {
and
  const log = buildCostLog({ usage, build, cases });
Start your reply directly with <<<REPLACE. No analysis text.
