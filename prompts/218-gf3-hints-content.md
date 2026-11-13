Patch three files. Output exactly three REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Context: a detective game. Each case JSON gets a new top-level "hints" array of timed hint events that the web page will show as on-screen toasts. Each hint is an object with "id" (string), "after" (seconds of play before it appears, integer) and "text" (object with "en" and "pt" strings). Use 2-space JSON indentation like the files.

Block 1 (content/case.json). Old text (exact, two lines):
  ],
  "glossary": [
New text: the line `  ],` then a line `  "hints": [` then three hint objects (each on one line, indented 4 spaces, comma after the first two), then `  ],` then `  "glossary": [`. The three hints, in this order:
- id "h1", after 45, en "A silhouette pushing a cart passed the instrument room window.", pt "Uma silhueta empurrando um carrinho passou pela janela da sala de instrumentos."
- id "h2", after 100, en "In the hallway, a hollow wooden knock comes from a cleaning cart.", pt "No corredor, uma batida oca de madeira vem de um carrinho de limpeza."
- id "h3", after 160, en "Under the lamp, a fresh scratch shines on the violin case lock.", pt "Sob a lâmpada, um arranhão novo brilha na fechadura da caixa do violino."

Block 2 (content/cases/night-train.json). Old text (exact, two lines):
  ],
  "glossary": [
New text: same structure as block 1, with these three hints:
- id "h1", after 45, en "A silhouette in a white apron passed the luggage car window.", pt "Uma silhueta de avental branco passou pela janela do vagão de bagagem."
- id "h2", after 100, en "A key ring jingles on a hook in the dining car.", pt "Um molho de chaves balança num gancho do vagão-restaurante."
- id "h3", after 160, en "A trail of white dust leads from the kitchen toward the luggage car.", pt "Um rastro de pó branco vai da cozinha até o vagão de bagagem."

Block 3 (src/case.js). Old text (exact, two lines):
    rooms,
    timeline,
New text: the same two lines, then one more line at the same indent:
    hints: Array.isArray(c.hints) ? c.hints.map(h => ({ id: h.id, after: h.after, text: h.text?.[l] ?? '' })) : [],
