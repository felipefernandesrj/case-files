Patch two files. Output exactly seven REPLACE blocks, then stop. Each block is: a marker line `<<<REPLACE path>>>` with the path given for the block, then the old text copied exactly (character for character, with NO < characters added in front of it and no space added before any >), then a line of exactly five equals signs, then the new text, then a line `<<<END>>>`. Only the marker lines start with <<<. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences. Every new text is given in full between the lines BEGIN and FINISH: copy it exactly and do not output the words BEGIN or FINISH.

Context: polish of the suspicion bars of a detective game: proper singular and plural for the lead count (1 lead, 2 leads; 1 pista, 2 pistas) instead of lead(s), and the row flash is used once (cleared after the render that shows it, so a language switch does not flash the row again). The test file follows.

Block 1 (path public/index.html). Old text (exact):
leads: '{n} pista(s)', prime:
New text:
BEGIN
lead1: '1 pista', leads: '{n} pistas', prime:
FINISH

Block 2 (path public/index.html). Old text (exact):
leads: '{n} lead(s)', prime:
New text:
BEGIN
lead1: '1 lead', leads: '{n} leads', prime:
FINISH

Block 3 (path public/index.html). Old text (exact):
  return L.leads.replace('{n}', st.hits) + (st.hits >= 2 ? ' · ' + L.prime : '');
New text:
BEGIN
  return (st.hits === 1 ? L.lead1 : L.leads.replace('{n}', st.hits)) + (st.hits >= 2 ? ' · ' + L.prime : '');
FINISH

Block 4 (path public/index.html). Old text (exact):
      list.appendChild(li);
    });
  });
}
New text:
BEGIN
      list.appendChild(li);
    });
  });
  Object.values(suspicion).forEach(st => { st.flash = false; });
}
FINISH

Block 5 (path test/suspicion.mjs). Old text (exact):
  must(c.note(li) === '1 lead(s)', 'note ' + c.note(li));
New text:
BEGIN
  must(c.note(li) === '1 lead', 'note ' + c.note(li));
  c.api.renderSuspicion();
  must(!c.row(0, 'carlos').className.includes('flash'), 'flash is used once');
FINISH

Block 6 (path test/suspicion.mjs). Old text (exact):
  must(c.note(li) === '2 lead(s) · prime suspect', 'note ' + c.note(li));
  must(c.meter(li).getAttribute('aria-valuetext') === '2 lead(s) · prime suspect', 'valuetext');
New text:
BEGIN
  must(c.note(li) === '2 leads · prime suspect', 'note ' + c.note(li));
  must(c.meter(li).getAttribute('aria-valuetext') === '2 leads · prime suspect', 'valuetext');
FINISH

Block 7 (path test/suspicion.mjs). Old text (exact):
  must(c.note(c.row(0, 'lorenzo')) === 'Inocentado', 'cleared');
New text:
BEGIN
  must(c.note(c.row(0, 'lorenzo')) === 'Inocentado', 'cleared');
  c.api.applyClue({ id: 'c2', implicates: 'carlos', clears: null });
  must(c.note(c.row(0, 'carlos')) === '1 pista', 'one pt');
FINISH
