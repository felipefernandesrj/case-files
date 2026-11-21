Two lines in the docs hold totals that change with every build call (the shared build line of the cost log grows each time the pack is built), so they go stale at once. Replace them so they keep only the per-case numbers, which do not move, and point to /costs for the live total. Edit blocks only (old line copied exactly, a line =====, the new line; no labels). Shape:
<<<REPLACE README.md>>>
old line
=====
new line
<<<END>>>
1. CHANGELOG.md, old (exact):
- Total logged: 697 calls, 530 receipts, US$0.688976.
new: "- Cost per case at release: Violin US$0.051778, Night Train US$0.037506, Lapa US$0.003868, Samba US$0.002000. The shared build and tools line grows with every build; the live total is on /costs and the Cup page."
2. README.md, old (exact):
**M4 in progress (sprint 1, v0.6.0).** This sprint added a public cost log page at /costs built via node src/costs.js, a shared pack scoreboard, four cases in the picker, and real credits. Total costs: Violin US$0.051778, Night Train US$0.037506, Lapa US$0.003868, Samba US$0.002000, build tools US$0.593824. M4 is not declared yet.
new: the same paragraph, but the sentence "Total costs: ..." becomes "Cost per case: Violin US$0.051778, Night Train US$0.037506, Lapa US$0.003868, Samba US$0.002000; the shared build and tools line and the live total are on /costs." and the 316 automated checks are mentioned before "M4 is not declared yet."
Start your reply directly with <<<REPLACE. No analysis text.
