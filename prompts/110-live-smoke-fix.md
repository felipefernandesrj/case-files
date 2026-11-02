# Fix (sprint 5): receipts in test/live-consistency.mjs still come from the local app response
The local app response has no x-fullcup headers, so the Receipts line is empty. Take them from the last upstream entry recorded by your logging wrapper: `const h = usageEntries[usageEntries.length - 1]?.headers || {};` then use h['x-fullcup-receipt-id'] and h['x-fullcup-seal-by'].

Exact current text (appears twice, the edit replaces every occurrence):
<<<FILE test/live-consistency.mjs (excerpt)>>>
        const rid = res.headers.get('x-fullcup-receipt-id');
        if (rid) {
          receipts.push({ id: rid, seal: res.headers.get('x-fullcup-seal-by') });
        }
<<<END>>>

Output ONLY one literal edit block: <<<REPLACE test/live-consistency.mjs>>> newline, the exact 4 old lines, newline, =====, newline, new lines, newline, <<<END>>>. No prose.
