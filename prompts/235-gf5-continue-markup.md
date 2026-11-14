Patch public/index.html only. Output exactly one REPLACE block, then stop. The block is: a marker line `<<<REPLACE public/index.html>>>`, then the old text copied exactly (character for character, with NO < characters added in front of it), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside the block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. The new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH. Every closing tag is written with no space before the > character: `</div>` and `</p>`, never `</div >`.

Context: a gothic-noir detective game. Add the markup of a CONTINUE countdown box just before the page script.

Old text (exact, one line):
<script type="module">
New text:
BEGIN
<div id="continue" class="continue" role="group" aria-labelledby="continue-title" hidden>
  <p id="continue-title" class="continue-title">CONTINUE?</p>
  <p id="continue-num" class="continue-num" aria-hidden="true">9</p>
  <p id="continue-note" class="continue-note"></p>
  <div class="continue-actions">
    <button id="continue-yes" type="button">Try again</button>
    <button id="continue-no" type="button">Give up</button>
    <button id="continue-close" type="button" hidden>Close</button>
  </div>
</div>
<p id="continue-live" class="continue-live" aria-live="polite"></p>
<script type="module">
FINISH
