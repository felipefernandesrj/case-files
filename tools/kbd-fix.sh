#!/bin/bash
# narrow fix loop for test/keyboard.mjs (and optionally public/index.html): label hint
label=$1; hint=$2; allow=${3:-test/keyboard.mjs}
timeout 90 node test/keyboard.mjs > /tmp/terr.txt 2>&1
{ echo "# Context: web page + its CDP keyboard/screen-reader test, both written by you. Server API is correct and out of scope."
  for f in test/keyboard.mjs public/index.html; do echo "<<<FILE $f>>>"; cat $f; echo "<<<END>>>"; done
  echo "# Test output"; head -60 /tmp/terr.txt; echo "(exit code $?)"; echo; echo "$hint"
  echo "Output ONLY these files, complete: $allow. Format <<<FILE path>>> ... <<<END>>>. If the page violates the stated a11y requirement fix the page; if the test is wrong fix the test. Start directly with <<<FILE."; } > prompts/$label.md
ALLOW=$allow node tools/build-via-key.mjs prompts/$label.md $label ${MODEL:-@cf/zai-org/glm-5.3-flash} | cut -c1-40
node -e "const e=require('./qa/build-log.json').at(-1);console.log(JSON.stringify(e.files),e.skipped)"
timeout 90 node test/keyboard.mjs 2>&1 | grep -E "^FAIL|^PASS|passed|Error" | cut -c1-200
