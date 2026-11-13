Patch test/scene.mjs only. Output exactly two REPLACE blocks, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no fences.

<<<REPLACE test/scene.mjs>>>
old text
=====
new text
<<<END>>>

Output: "FAIL crossfade and same room: first layer still on". My previous instruction was wrong: sceneFront starts at 0 and the first apply flips it to 1, so room a lands on layers[1], not layers[0]. Capture the layer that shows room a after the first sync and check that one instead.

Block 1. Old text (exact):
  api.sync(); // room a
New text: that same line, then on the next line (2 spaces of indent):
  const aLayer = layers.find(l => l.classList.contains('is-on'));

Block 2. Old text (exact):
  if (layers[0].classList.contains('is-on')) throw new Error('first layer still on');
New text:
  if (!aLayer || aLayer === onLayer || aLayer.classList.contains('is-on')) throw new Error('room a layer still on');
