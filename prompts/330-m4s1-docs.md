Docs and version for Case Files M4 sprint 1. Edit blocks only (old text copied exactly, a line =====, the new text; no labels). Shape:
<<<REPLACE README.md>>>
old line
=====
new lines
<<<END>>>
Plain English, short sentences, no em dashes, no marketing words.

What shipped in M4 sprint 1 (version 0.6.0):
- A public cost log: page /costs (EN/PT) and GET /api/costs (?case=<id>), built by `node src/costs.js` into data/cost-log.json from the key usage log, the build log and the receipts of the game art (data/art-receipts.json, exact cost read from each public receipt page). One section per case (The Vanishing Violin, The Night Train, the generated cases) and one for the shared build work, every call with its model, status, cost and a link to its signed receipt on qa.fullcup.ai. Cost = neurons x US$0.011 per 1,000.
- Logged so far: 697 calls, 530 receipts, US$0.688976 in total: Violin US$0.051778, Night Train US$0.037506, Lapa generated case US$0.003868, Samba generated case US$0.002000, shared build and tools US$0.593824. The Cup page shows the authoritative total used on the key.
- A shared pack scoreboard on the case picker: best score per case added up per player (GET /api/scores?case=all); unnamed "anon" plays are left out.
- A fourth case in the picker: "The Silent Batucada" (a samba school rehearsal in Madureira), written by the generator in the M3 batch (2 drafts, US$0.002).
- Credits with the real public backers of the Cup (12 names, plus a line for the 26 who chose not to appear) and a link from the closing screen to the cost log of that case.
- The per-case scoreboard table got its missing "#" column header.
- New test/pack-m4.mjs with 9 checks; test/keyboard.mjs now checks the real credits. 316 automated checks.

1. package.json, old (exact): `  "version": "0.5.2",` new: `  "version": "0.6.0",`
2. package.json, the test script ends with exactly `&& node test/keyboard.mjs"` ; replace that text with `&& node test/keyboard.mjs && node test/pack-m4.mjs"` (old text must be exactly `node test/keyboard.mjs"` and the new text `node test/keyboard.mjs && node test/pack-m4.mjs"`).
3. CHANGELOG.md, old (exact): `# Changelog` new: `# Changelog`, a blank line, then `## 0.6.0 (M4 sprint 1: cost log, pack scoreboard, real credits)` and 6 to 8 bullet lines with the facts above (do not invent numbers).
4. README.md, old (exact, one line): the line that starts with `**M3 delivered: The Generated Case (2026-11-20).**` (copy the whole line exactly as given here):
**M3 delivered: The Generated Case (2026-11-20).** `node src/generator.js --seed "<text>"` writes a case through the Cup key and keeps it only if it passes the shape, fair play and timeline checks; generated cases show in the picker (EN/PT) with their cost and drafts. Next: M4, the pack with a shared scoreboard and a public cost log.
New: the same line but ending "...with their cost and drafts." (drop the "Next: ..." sentence), then a blank line, then one paragraph starting `**M4 in progress (sprint 1, v0.6.0).**` that says what shipped (cost log page /costs and `node src/costs.js`, pack scoreboard, four cases in the picker, real credits) with the totals per case, and ends with "M4 is not declared yet."
5. README.md, old (exact): `npm test                                            # run tests`
new: that line, then `node src/costs.js                                   # rebuild the public cost log (data/cost-log.json)`
Start your reply directly with <<<REPLACE. No analysis text.
