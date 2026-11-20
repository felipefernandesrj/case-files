Live run 2 of src/generator.js was rejected 3 times: the model kept writing a clue where the culprit implicates herself, because the retry message only lists bare codes like "clue_self_implicates". Make each code explain itself.
Output ONLY REPLACE blocks in this exact shape (OLD copied exactly, a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Block 1, src/generator.js. OLD is exactly this line:
  const userContent = `Seed: ${seed}\nSuspects: ${suspects}${reasons.length ? `\nThe previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.` : ''}`;
NEW:
  const why = reasons.map((r) => `- ${r}: ${REASON_HINTS[r] || 'fix this check'}`).join('\n');
  const userContent = `Seed: ${seed}\nSuspects: ${suspects}${reasons.length ? `\nThe previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.\n${why}` : ''}`;

Block 2, src/generator.js. OLD is exactly this line:
export function genMessages(seed, { suspects = 4, reasons = [] } = {}) {
NEW:
/** One plain-English fix per check code, sent back to the model on a retry (M3 sprint 1). */
export const REASON_HINTS = Object.freeze({
  not_json: 'answer with one JSON object only, nothing before or after it',
  wrong_suspect_count: 'use exactly the number of suspects asked for',
  culprit_not_suspect: 'culprit must be the id of one of the suspects',
  not_enough_implicates: 'at least two clues must have implicates set to the culprit id',
  suspect_not_cleared: 'every innocent suspect id must appear as "clears" in at least one clue',
  clue_self_implicates: 'a clue whose "implicates" is X must come "from" a different suspect than X; the culprit never accuses herself, other suspects point at her',
  aftermath_bad: 'aftermath must be an object keyed by every innocent suspect id, each with en and pt objects holding headline and body',
  timeline_crime_count: 'exactly one timeline stop has "crime": true',
  timeline_culprit_absent: 'the crime stop "who" list must include the culprit',
  timeline_out_of_order: 'timeline times must go forward (crossing midnight once is fine)',
  timeline_unknown_suspect: 'every "who" entry must be a suspect id',
  timeline_missing_text: 'every stop needs stop.en, stop.pt, event.en and event.pt',
  missing_hints: 'add 2 or 3 hints with id, after and text en/pt',
  suspect_bad: 'every suspect needs a lowercase id, name, role en/pt and facts',
});

export function genMessages(seed, { suspects = 4, reasons = [] } = {}) {

Block 3, test/generator.mjs. OLD is exactly this line:
  must(genMessages('x', { suspects: 5 })[1].content.includes('Suspects: 5'), 'suspects in user msg');
NEW keeps it and adds after it:
  const retry = genMessages('x', { reasons: ['clue_self_implicates', 'made_up_code'] })[1].content;
  must(retry.includes('- clue_self_implicates: a clue whose "implicates" is X must come "from" a different suspect'), 'hint for clue_self_implicates');
  must(retry.includes('- made_up_code: fix this check'), 'fallback hint');
  must(!genMessages('x')[1].content.includes('- '), 'no hints on the first try');
