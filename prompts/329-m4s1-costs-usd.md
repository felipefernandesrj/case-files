public/costs.html shows the currency twice in each section, e.g. "US$ US$ 0,037506 · 38 chamadas · 38 recibos" and "Partidas: US$ US$ 0,003288 (20)": formatMoney() already returns 'US$ ' + the number, and the templates summaryLine and kindLine also start with "US$ " before {usd}. Remove the "US$ " from the four templates (EN and PT) and keep formatMoney as it is. Fix with edit blocks (old line copied exactly with its indentation, a line =====, the new line; no labels). Shape:
<<<REPLACE public/example.html>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
The exact current lines (16 spaces) are:
                summaryLine: "US$ {usd} · {calls} calls · {receipts} receipts",
                kindLine: "{kind}: US$ {usd} ({calls})",
                summaryLine: "US$ {usd} · {calls} chamadas · {receipts} recibos",
                kindLine: "{kind}: US$ {usd} ({calls})",
(the kindLine line is the same in EN and PT, so one block for it replaces both).
Start your reply directly with <<<REPLACE. No analysis text.
