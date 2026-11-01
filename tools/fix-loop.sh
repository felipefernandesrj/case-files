#!/bin/bash
# fix-loop.sh label "files" testcmd  -> runs test, if fails builds fix prompt with model's own files + output, calls model
label=$1; files=$2; cmd=$3
eval "$cmd" > /tmp/t.txt 2>&1; rc=$?
grep -E "^FAIL|passed|Error|error" /tmp/t.txt | head -40 > /tmp/tshort.txt
[ $rc -eq 0 ] && { echo "GREEN"; tail -3 /tmp/t.txt; exit 0; }
{ head -60 /tmp/t.txt; } > /tmp/terr.txt
tools/fix-prompt.sh prompts/$label.md "$files" /tmp/terr.txt
echo "Spec reminder: tests must follow the spec; if the test is wrong fix the test, if the code is wrong fix the code. Start your reply directly with <<<FILE. No analysis text." >> prompts/$label.md
ALLOW=$(echo $files | tr ' ' ',') node tools/build-via-key.mjs prompts/$label.md $label
eval "$cmd" 2>&1 | grep -E "^FAIL|passed" | head -30; tail -5 /tmp/t.txt >/dev/null
