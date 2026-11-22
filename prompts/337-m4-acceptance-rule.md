Conserve as many tokens as possible and be fast (merge commands in few calls).
The M4 delivery smoke played The Silent Batucada through the key with purposes "m4-acceptance:en:..." and "m4-acceptance:pt:...", but src/costs.js has no rule for them, so they land in the pack bucket. Add one rule after the m3-acceptance rule: purposes starting with m4-acceptance go to case 'gen-a-samba-school-rehearsal-in-madureira-th', kind 'play'.

One edit block (old text copied exactly, a line =====, new text; no labels), src/costs.js, old text (one line, 2 spaces):
  { re: /^(m3-acceptance|m3s2-shots)(:|$)/, case: 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', kind: 'play' }
new text: that line with a comma at the end, then a new line in the same style for m4-acceptance.

Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
