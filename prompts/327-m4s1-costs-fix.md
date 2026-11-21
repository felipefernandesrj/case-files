public/costs.html (your file) shows "The cost log is not available right now." although GET /api/costs answers 200 with the log. Errors found when it runs in Chrome:

1. render() throws `TypeError: Cannot read properties of undefined (reading 'play')` at `data.total.byKind.play`, and the catch in fetchData turns that into the "not available" message. `data.total` is only { usd, calls, receipts }; it has no byKind. For the "All" row, compute Play and Made by adding up the buckets (every case bucket and the pack bucket).
2. The pack bucket (data.pack) is never shown: the summary rows and the sections must be every case bucket in order, then data.pack. The current line is:
            const sortedBuckets = [...data.cases].sort((a, b) => a.id === 'pack' ? 1 : (b.id === 'pack' ? -1 : 0));
3. The model column must drop the vendor segment too: '@cf/google/gemma-4-26b-a4b-it' -> 'gemma-4-26b-a4b-it' (now it shows 'google/gemma-4-26b-a4b-it'). Current line:
                        tdModel.textContent = entry.model.replace(/^@cf\//, '');

Fix with edit blocks only (old text copied exactly with its indentation from the lines quoted here or below, a line =====, the new text; no labels). Shape:
<<<REPLACE public/example.html>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Exact current lines of the "All" row (12 spaces):
            tPlayTd.textContent = formatMoney(data.total.byKind.play?.usd || 0, lang);
and (12 spaces):
            for (const [k, v] of Object.entries(data.total.byKind)) {
Start your reply directly with <<<REPLACE. No analysis text.
