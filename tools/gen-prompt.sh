#!/bin/bash
# gen-prompt.sh out.md "files written by the model to include" "task text"
out=$1; files=$2; task=$3
{ cat prompts/_api.md; echo; cat prompts/_spec2.md; echo; [ -n "$files" ] && { echo "# Files already written by you"; for f in $files; do echo "<<<FILE $f>>>"; cat $f; echo "<<<END>>>"; done; }
  echo; echo "# Task"; echo "$task"; echo "Output only the requested files, complete. Never output content/case.json."; } > $out
