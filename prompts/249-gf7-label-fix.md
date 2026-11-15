Patch public/index.html. Output exactly one REPLACE block, then stop. Each block is: a marker line `<<<REPLACE path>>>` with the path given for the block, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: the last patch left one stray > character after a closing label tag (the line ends with </label>> instead of </label>). Remove only that extra > character. The old text below ends with two > characters; the new text ends with one.

Block 1 (path public/index.html). Old text (exact, 1 line):
Confirm before accusing</span></label>>
New text:
BEGIN
Confirm before accusing</span></label>
FINISH
