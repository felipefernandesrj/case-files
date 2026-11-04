# Task (sprint 9): remove the empty first line of CHANGELOG.md
CHANGELOG.md line 1 is empty and line 2 is `# Changelog`. Delete line 1 only. Do not change anything else.

Answer as one unified-diff hunk inside a REPLACE block: `-` marks a removed line, a leading space marks an unchanged context line. Output ONLY these 4 lines, nothing else:
<<<REPLACE CHANGELOG.md>>>
@@
-
 # Changelog
and then the line <<<END>>>. The 3rd line is a single minus sign (the removed empty line). The 4th line is a space followed by `# Changelog`. No `=====`, no prose, no fences.
