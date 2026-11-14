Patch public/css/game.css only. Output exactly one REPLACE block, then stop. The block is: a marker line `<<<REPLACE public/css/game.css>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. The new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: on a 390px phone the scene caption (absolute, top 8px) now overlaps the top 6px of the Evidence board heading plate, because the heading rule removed the default top margin. Keep the default heading margin.

Old text (exact, three lines):
  width: fit-content;
  margin-top: 0;
  padding: 4px 12px;
New text:
BEGIN
  width: fit-content;
  padding: 4px 12px;
FINISH
