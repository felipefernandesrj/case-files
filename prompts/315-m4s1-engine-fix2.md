Two more errors in src/costs.js. Fix them with REPLACE blocks only (OLD copied exactly from the current code shown, then a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Error 1. `node src/costs.js` crashes:
TypeError: Cannot read properties of null (reading 'localeCompare')
    at src/costs.js:114  b.entries.sort((a, b) => a.at.localeCompare(b.at));
Ten real log entries have "at": null (their time was not recorded). Sort with String(x.at || '') so entries without a time come first, and keep at: null in the output.

Error 2. writeCostLog loads every case as the default case: `cases` is the empty object being filled, so `cases[key]` is undefined and loadCase(undefined) falls back to the Violin. Load the file of that key from CASES. Current code:
    cases[key] = loadCase(cases[key]);
Start your reply directly with <<<REPLACE. No analysis text.
