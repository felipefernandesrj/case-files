Patch docs/BUILD_LOG.md only. Output exactly one REPLACE block, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE docs/BUILD_LOG.md>>>
old text
=====
new text
<<<END>>>

Old text (exact):
- Calls 218-225 through the Cup key
New text:
- Calls 218-227 through the Cup key
