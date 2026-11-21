Your last edit to the "All" row of public/costs.html is broken: it uses tPlayCallsTd and tPlayReceiptsTd, which do not exist (ReferenceError), declares const playUsd twice in the same scope (SyntaxError), and filters buckets by c.kind / c.usd, which buckets do not have (a bucket has totals.usd, totals.calls, totals.receipts and totals.byKind[kind].usd).

Replace the WHOLE current "All" row block below with one correct block. Shape (old text copied exactly, a line =====, new text; no labels):
<<<REPLACE public/example.html>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

Wanted: const all = [...data.cases, data.pack]; play = sum of (b.totals.byKind.play?.usd || 0); made = sum over every bucket of every byKind entry except play; the row has 6 cells: "All"/"Tudo" (t.rowAll), formatMoney(play), formatMoney(made), formatMoney(data.total.usd), data.total.calls, data.total.receipts; class 'num' on the 5 number cells; tr class 'summary-row'; then tbody.appendChild(totalTr).

Current block (copy it exactly as the old text):
            // Total Row
            const totalTr = document.createElement('tr');
            totalTr.className = 'summary-row';
            const tCaseTd = document.createElement('td');
            tCaseTd.textContent = t.rowAll;
            totalTr.appendChild(tCaseTd);

            const tPlayTd = document.createElement('td');
            tPlayTd.className = 'num';
            const playUsd = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.usd, 0);
            const playCalls = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.calls, 0);
            const playReceipts = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.receipts, 0);
            tPlayTd.textContent = formatMoney(playUsd, lang);
            tPlayCallsTd.textContent = playCalls.toLocaleString(lang);
            tPlayReceiptsTd.textContent = playReceipts.toLocaleString(lang);
            totalTr.appendChild(tPlayTd);

            const tMadeTd = document.createElement('td');
            tMadeTd.className = 'num';
            let totalOtherSum = 0;
            const playUsd = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.usd, 0);
            const playCalls = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.calls, 0);
            const playReceipts = [...data.cases, data.pack].filter(c => c.kind === 'play').reduce((sum, c) => sum + c.receipts, 0);
            const madeUsd = [...data.cases, data.pack].filter(c => c.kind === 'made').reduce((sum, c) => sum + c.usd, 0);
            const madeCalls = [...data.cases, data.pack].filter(c => c.kind === 'made').reduce((sum, c) => sum + c.calls, 0);
            const madeReceipts = [...data.cases, data.pack].filter(c => c.kind === 'made').reduce((sum, c) => sum + c.receipts, 0);

            const byKind = [
                { kind: 'play', usd: playUsd, calls: playCalls, receipts: playReceipts },
                { kind: 'made', usd: madeUsd, calls: madeCalls, receipts: madeReceipts }
            ];
            for (const item of byKind) {
                if (k !== 'play') totalOtherSum += v.usd;
            }
            tMadeTd.textContent = formatMoney(totalOtherSum, lang);
            totalTr.appendChild(tMadeTd);

            const tTotalTd = document.createElement('td');
            tTotalTd.className = 'num';
            tTotalTd.textContent = formatMoney(data.total.usd, lang);
            totalTr.appendChild(tTotalTd);

            const tCallsTd = document.createElement('td');
            tCallsTd.className = 'num';
            tCallsTd.textContent = data.total.calls;
            totalTr.appendChild(tCallsTd);

            const tRecTd = document.createElement('td');
            tRecTd.className = 'num';
            tRecTd.textContent = data.total.receipts;
            totalTr.appendChild(tRecTd);

            tbody.appendChild(totalTr);
Start your reply directly with <<<REPLACE. No analysis text.
