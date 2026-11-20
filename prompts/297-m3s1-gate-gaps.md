The first live case from src/generator.js passed every check but was not playable: its aftermath was an ARRAY (the wrong-verdict newspaper reads aftermath[innocentId].en.headline, so it breaks), and one clue came FROM the culprit and implicated the culprit herself (a suspect confessing in a clue). Close both gaps in the gate.
Output ONLY REPLACE blocks in this exact shape (OLD copied exactly, a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Block 1, src/generator.js. OLD is exactly this one line:
  if (!Array.isArray(c.hints) || c.hints.length === 0) reasons.push('missing_hints');
NEW keeps that line and adds after it:
  // M3 sprint 1: the first live case passed fairPlay with an array aftermath and a self-implicating clue
  const ids = Array.isArray(c.suspects) ? c.suspects.map((s) => s && s.id) : [];
  const am = c.aftermath;
  const story = (v) => v && typeof v.headline === 'string' && v.headline.trim() && typeof v.body === 'string' && v.body.trim();
  if (!am || typeof am !== 'object' || Array.isArray(am) || ids.filter((id) => id !== c.culprit).some((id) => !am[id] || !story(am[id].en) || !story(am[id].pt))) reasons.push('aftermath_bad');
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.implicates != null && cl.from === cl.implicates)) reasons.push('clue_self_implicates');

Block 2, src/generator.js. OLD is exactly this one line:
- aftermath: for each innocent id, en/pt headline and body.
NEW:
- aftermath: an OBJECT keyed by each innocent suspect id (not an array), each value { "en": { "headline", "body" }, "pt": { "headline", "body" } }: the newspaper story when the player wrongly accuses that suspect.
- every clue is a line a suspect says when asked: "from" is the speaker, "ask" is a question to that suspect, "text" is their answer in first person. A suspect never implicates themselves.

Block 3, test/generator.mjs. OLD is exactly this one line:
  must(validateCase({ ...good, title: { en: 'x' } }).reasons.includes('missing_title'), 'validateCase missing title');
NEW keeps that line and adds after it:
  const innocents = good.suspects.map((s) => s.id).filter((id) => id !== good.culprit);
  must(validateCase({ ...good, aftermath: innocents.map((id) => good.aftermath[id]) }, { suspects: 4 }).reasons.includes('aftermath_bad'), 'array aftermath');
  const noOne = { ...good.aftermath }; delete noOne[innocents[0]];
  must(validateCase({ ...good, aftermath: noOne }, { suspects: 4 }).reasons.includes('aftermath_bad'), 'innocent without aftermath');
  const selfClue = { ...good, clues: [...good.clues, { ...good.clues[0], id: 'c99', from: good.culprit, implicates: good.culprit }] };
  must(validateCase(selfClue, { suspects: 4 }).reasons.includes('clue_self_implicates'), 'self implicating clue');
  must(!validateCase(good, { suspects: 4 }).reasons.includes('aftermath_bad'), 'good aftermath');
  const firstLive = JSON.parse(fs.readFileSync('qa/m3s1-probes/gen-live-1.case.json', 'utf8'));
  const r1 = validateCase(firstLive, { suspects: 4 }).reasons;
  must(r1.includes('aftermath_bad') && r1.includes('clue_self_implicates'), 'first live case now rejected: ' + r1.join(','));
