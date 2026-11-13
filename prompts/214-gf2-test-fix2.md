Patch test/scene.mjs only. Output exactly one REPLACE block, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside the block. NEVER emit <<<FILE>>>. No commentary, no fences.

<<<REPLACE test/scene.mjs>>>
old text
=====
new text
<<<END>>>

Output of running your test: "FAIL crossfade and same room: old layer still has image". That assertion is wrong: for a crossfade the old layer must keep its image while it fades out; only its is-on class goes away. The requirement was instead: the first layer (layers[0], which showed room a) has no is-on, and after a second sync on the same room the on layer is unchanged.

Old text (exact, two lines):
  const offLayer = layers.find(l => !l.classList.contains('is-on'));
  if (offLayer.style.backgroundImage.includes('x-a.png')) throw new Error('old layer still has image');
New text: four lines, 2 spaces of indent:
  if (layers[0].classList.contains('is-on')) throw new Error('first layer still on');
  const onBefore = layers.find(l => l.classList.contains('is-on'));
then, after the existing whenArt call-count check further down, you cannot edit it, so instead put these two lines here too, they are fine before it because a sync is needed first: no. Simpler: replace the two old lines with exactly these three lines:
  if (layers[0].classList.contains('is-on')) throw new Error('first layer still on');
  api.sync(); // same room b, nothing may change
  if (layers.find(l => l.classList.contains('is-on')) !== onLayer || !onLayer.style.backgroundImage.includes('x-b.png')) throw new Error('same room changed the on layer');
