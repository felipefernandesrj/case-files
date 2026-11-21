Two errors in src/costs.js. Answer with exactly two edit blocks. Example of ONE block (the first part is the old text copied exactly, with its indentation, the line ===== separates it from the new text; no labels):
<<<REPLACE src/example.js>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

Error 1. `node src/costs.js` crashes:
TypeError: Cannot read properties of null (reading 'localeCompare')
Ten real log entries have "at": null. Sort with String(x.at || '') so entries without a time come first. The current line in src/costs.js (4 spaces of indentation) is exactly:
    b.entries.sort((a, b) => a.at.localeCompare(b.at));

Error 2. writeCostLog loads every case as the default case because `cases[key]` is undefined while `cases` is being filled. Load the file of that key from CASES. The current line in src/costs.js (4 spaces) is exactly:
    cases[key] = loadCase(cases[key]);
Start your reply directly with <<<REPLACE. No analysis text.
