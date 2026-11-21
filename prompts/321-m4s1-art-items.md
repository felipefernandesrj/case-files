Bug in src/costs.js writeCostLog: after `node src/costs.js` the log has 0 entries whose purpose starts with 'art:', although data/art-receipts.json is { "note": "...", "items": [ 100 items ] }. The parsed object is not an array, so this line always returns []:
  const art = existsSync(artFile) ? (() => { const parsed = JSON.parse(readFileSync(artFile, 'utf8')); return Array.isArray(parsed) ? parsed.items : []; })() : [];
Fix it with ONE edit block: old line copied exactly (2 spaces of indentation), a line =====, the new line. No labels. Shape example:
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
