#!/bin/bash
# loop.sh startN count "files" "testcmd"
n=$1; c=$2; f=$3; t=$4
for ((i=n;i<n+c;i++)); do
  tools/fix-loop.sh $i-fix "$f" "$t" >/dev/null 2>&1
  node -e "const e=require('./qa/build-log.json').at(-1);console.log(e.label,JSON.stringify(e.files).slice(0,150))"
  eval "$t" > /tmp/lt.txt 2>&1; grep -E "^FAIL|passed|Error" /tmp/lt.txt | cut -c1-160
  grep -q " 0 failed" /tmp/lt.txt && { echo GREEN; break; }
done
