import fs from 'node:fs';
import { loadCase, publicCase, systemPrompt, fairPlay, timelineCheck } from '../src/case.js';

let passed = 0, failed = 0;

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

const test = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
};

const nt = loadCase('content/cases/night-train.json');
const violin = loadCase();
const clone = (o) => JSON.parse(JSON.stringify(o));
const filled = (v) => typeof v === 'string' && v.trim() !== '';

await test('night train passes fair play with 4 suspects', async () => {
  const result = fairPlay(nt, { suspects: 4 });
  assert(result.ok === true, result.reasons.join(', '));
});

await test('default fair play still expects 3 suspects', async () => {
  const resultNt = fairPlay(nt);
  assert(resultNt.reasons.includes('wrong_suspect_count'), 'should flag wrong suspect count');
  const resultViolin = fairPlay(violin);
  assert(resultViolin.ok === true, 'violin should pass default fair play');
});

await test('4 suspects with EN and PT text and private facts', async () => {
  assert(nt.suspects.length === 4, 'must have 4 suspects');
  const ids = nt.suspects.map(s => s.id);
  assert(new Set(ids).size === 4, 'ids must be unique');
  for (const s of nt.suspects) {
    assert(filled(s.name), 'name filled');
    assert(filled(s.role.en) && filled(s.role.pt), 'role filled');
    assert(filled(s.persona.en) && filled(s.persona.pt), 'persona filled');
    assert(filled(s.alibi.en) && filled(s.alibi.pt), 'alibi filled');
    assert(s.facts.startsWith(`You are ${s.name}`), 'facts format wrong');
  }
  assert(ids.includes(nt.culprit), 'culprit must be a valid id');
  assert(nt.title.en === 'The Night Train', 'title en mismatch');
  assert(nt.title.pt === 'O Trem Noturno', 'title pt mismatch');
  assert(filled(nt.intro.en) && filled(nt.intro.pt), 'intro filled');
  assert(filled(nt.solution.en) && filled(nt.solution.pt), 'solution filled');
});

await test('public text never names the culprit', async () => {
  for (const lang of ['en', 'pt']) {
    const pub = JSON.stringify(publicCase(nt, lang)).toLowerCase();
    assert(!pub.includes('culprit') && !pub.includes('culpad'), 'public case names culprit');
    for (const s of nt.suspects) {
      assert(!pub.includes(s.facts.toLowerCase()), 'public case includes private facts');
    }
  }
});

await test('timeline passes and crosses midnight', async () => {
  const result = timelineCheck(nt);
  assert(result.ok === true, result.reasons.join(', '));
  assert(nt.timeline.length === 5, 'timeline length mismatch');
  assert(nt.timeline[4].time < nt.timeline[0].time, 'timeline does not cross midnight');
  let crimeCount = 0;
  for (const entry of nt.timeline) {
    if (entry.crime === true) {
      crimeCount++;
      assert(entry.who.includes(nt.culprit), 'crime stop does not include culprit');
    }
  }
  assert(crimeCount === 1, 'must have exactly one crime stop');
});

await test('timeline check catches broken timelines', async () => {
  const ntClone = clone(nt);
  const tmp = ntClone.timeline[0];
  ntClone.timeline[0] = ntClone.timeline[1];
  ntClone.timeline[1] = tmp;
  assert(timelineCheck(ntClone).reasons.includes('timeline_out_of_order'), 'failed to catch out of order');

  const ntClone2 = clone(nt);
  ntClone2.timeline[2].who = ['nobody'];
  assert(timelineCheck(ntClone2).reasons.includes('timeline_unknown_suspect'), 'failed to catch unknown suspect');

  const ntClone3 = clone(nt);
  ntClone3.timeline[0].crime = true;
  assert(timelineCheck(ntClone3).reasons.includes('timeline_crime_count'), 'failed to catch crime count');

  const ntClone4 = clone(nt);
  ntClone4.timeline[1].stop.pt = '';
  assert(timelineCheck(ntClone4).reasons.includes('timeline_missing_text'), 'failed to catch missing text');

  const ntClone5 = clone(nt);
  const crimeEntry = ntClone5.timeline.find(e => e.crime);
  crimeEntry.who = nt.suspects.map(s => s.id).filter(id => id !== nt.culprit);
  assert(timelineCheck(ntClone5).reasons.includes('timeline_culprit_absent'), 'failed to catch absent culprit');

  assert(JSON.stringify(timelineCheck(violin).reasons) === JSON.stringify(['timeline_missing']), 'violin reasons mismatch');
});

await test('PT prompt lists all 4 suspects and keeps other facts private', async () => {
  for (const s of nt.suspects) {
    const p = systemPrompt(nt, s.id, 'pt');
    for (const other of nt.suspects) {
      assert(p.includes(other.name), `prompt missing suspect name: ${other.name}`);
    }
    assert(p.includes(s.facts), 'prompt missing current suspect facts');
    for (const other of nt.suspects) {
      if (other.id !== s.id) {
        assert(!p.includes(other.facts), 'prompt leaks other suspect facts');
      }
    }
    assert(p.includes('Use these exact PT'), 'missing instruction');
    assert(p.includes('cabine-leito'), 'missing cabine-leito');
    assert(p.endsWith('Respond in Portuguese.'), 'wrong suffix');
  }
});

await test('night train is not the default case (only reachable by id)', async () => {
  const server = fs.readFileSync('src/server.js', 'utf8');
  const cli = fs.readFileSync('src/cli.js', 'utf8');
  assert(server.includes('content/case.json'), 'server missing default case');
  assert(cli.includes('content/case.json'), 'cli missing default case');
  assert(!server.includes('night-train'), 'server wired to night-train');
  assert(!cli.includes('night-train'), 'cli wired to night-train');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
