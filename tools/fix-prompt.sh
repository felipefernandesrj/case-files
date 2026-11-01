#!/bin/bash
# Builds a fix prompt: API contract + the model's own current files + test output. Usage: fix-prompt.sh out.md "files..." errfile
out=$1; files=$2; err=$3
{ cat prompts/_api.md; echo; echo "# Current project files (written by you)"; for f in $files; do echo "<<<FILE $f>>>"; cat $f; echo "<<<END>>>"; done
  echo; echo "# Test output"; cat $err; echo; echo "# Task"; echo "Fix the bug(s). Output ONLY the files you change, full content, OR for small changes literal edits in this format: <<<REPLACE path>>> newline, exact old text, newline, =====, newline, new text, newline, <<<END>>> (old text is replaced at every occurrence). Never output content/case.json (it is real data, do not touch)."; } > $out
