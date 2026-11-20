Live run 3 of src/generator.js produced a case that passed the gate, but clue c1 has "clears" set to the CULPRIT (the clue frees the thief), so the case contradicts itself. Close this gap.
Output ONLY REPLACE blocks in this exact shape (OLD copied exactly, a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Block 1, src/generator.js. OLD is exactly this line:
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.implicates != null && cl.from === cl.implicates)) reasons.push('clue_self_implicates');
NEW keeps it and adds after it:
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.clears != null && cl.clears === c.culprit)) reasons.push('culprit_cleared');

Block 2, src/generator.js. OLD is exactly this line:
  aftermath_bad: 'aftermath must be an object keyed by every innocent suspect id, each with en and pt objects holding headline and body',
NEW keeps it and adds after it:
  culprit_cleared: 'no clue may have "clears" set to the culprit id; clues only clear innocent suspects',

Block 3, test/generator.mjs. OLD is exactly this line:
  must(r1.includes('aftermath_bad') && r1.includes('clue_self_implicates'), 'first live case now rejected: ' + r1.join(','));
NEW keeps it and adds after it:
  const third = JSON.parse(fs.readFileSync('qa/m3s1-probes/gen-live-3.case.json', 'utf8'));
  must(validateCase(third, { suspects: 4 }).reasons.includes('culprit_cleared'), 'third live case (clue clears the culprit) now rejected');
  must(!validateCase(good, { suspects: 4 }).reasons.includes('culprit_cleared'), 'night train does not clear its culprit');
