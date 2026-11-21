import { CASES } from '../src/case.js';

import { writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { 
  NEURON_USD, round6, entryUsd, receiptOf, classify, ulidTime, 
  artCase, buildCostLog, costsFor 
} from '../src/costs.js';
import { createScoreboard } from '../src/scoreboard.js';
import { createServer } from '../src/server.js';
import { readFile } from 'fs/promises';

const assert = (cond, msg) => { if (!cond) throw new Error(msg); };

async function run() {
  let passed = 0;
  let failed = 0;

  const report = (idx, ok, msg) => {
    if (ok) {
      console.log(`${idx}. PASS`);
      passed++;
    } else {
      console.log(`${idx}. FAIL: ${msg}`);
      failed++;
    }
  };

  // 1
  try {
    const u1 = entryUsd({ usage: { neurons: 100 } });
    assert(u1 === 0.0011, `u1: ${u1}`);
    const u2 = entryUsd({ cost: 0.002 });
    assert(u2 === 0.002, `u2: ${u2}`);
    const u3 = entryUsd({});
    assert(u3 === 0, `u3: ${u3}`);
    const r1 = receiptOf({ headers: { 'x-fullcup-receipt': 'abc' } });
    assert(r1 === 'abc', `r1: ${r1}`);
    const r2 = receiptOf({});
    assert(r2 === null, `r2: ${r2}`);
    report(1, true);
  } catch (e) { report(1, false, e.message); }

  // 2
  try {
    assert(classify('interrogate:maya').case === 'violin', 'c1');
    assert(classify('m2-acceptance:en:helena').case === 'night-train', 'c2');
    assert(classify('m2gf10-art:violin-carlos:seed1').case === 'violin', 'c3');
    assert(classify('author-case').case === 'violin', 'c4');
    assert(classify('sprint12-smoke:en:maya').case === 'violin' && classify('sprint12-smoke:en:maya').kind === 'play', 'c5');
    const gen = classify('m3-acceptance:en:suspect-1');
    assert(gen.case.startsWith('gen-') && gen.kind === 'play', 'c6');
    assert(classify('sprint5-build:12').case === 'pack' && classify('sprint5-build:12').kind === 'build', 'c7');
    assert(classify('qa:list-models').case === 'pack' && classify('qa:list-models').kind === 'dev', 'c8');
    report(2, true);
  } catch (e) { report(2, false, e.message); }

  // 3
  try {
    const t = ulidTime('01M7XPG6KKAVMAG99SBA38R1TQ');
    assert(t && t.startsWith('2026-11-'), `t: ${t}`);
    assert(ulidTime('x') === null, 't2');
    assert(ulidTime('01M7XPG6KUAVMAG99SBA38R1TQ'.slice(0, 9) + '!') === null, 't3');
    assert(artCase('characters/violin-carlos') === 'violin', 'a1');
    assert(artCase('loc/night-train-tunnel') === 'night-train', 'a2');
    assert(artCase('i-score') === 'pack', 'a3');
    report(3, true);
  } catch (e) { report(3, false, e.message); }

  // 4
  try {
    const cases = { 
      violin: { title: { en: 'V', pt: 'V' } }, 
      'gen-x': { title: { en: 'G', pt: 'G' }, generated: { cost: { receipts: ['R2'] } } } 
    };
    const usage = [
      { at: '2026-11-02T10:00:00Z', purpose: 'interrogate:maya', model: 'm', status: 200, usage: { neurons: 1000 }, headers: { 'x-fullcup-receipt-id': 'R1' } },
      { at: '2026-11-01T10:00:00Z', purpose: 'm3s2-generate:live1:draft1', model: 'g', status: 200, usage: { neurons: 2000 }, headers: { 'x-fullcup-receipt-id': 'R2' } },
      { at: null, purpose: 'qa:list-models', status: 200, headers: {} },
      { purpose: 'note only' }
    ];
    const build = [
      { label: 'b1', at: '2026-11-03T00:00:00Z', model: 'm', status: 200, usage: { neurons: 500 }, headers: { 'x-fullcup-receipt-id': 'R1' } },
      { label: 'b2', at: '2026-11-03T00:00:00Z', model: 'm', status: 502, usage: null, headers: {} }
    ];
    const art = [
      { asset: 'characters/violin-maya', attempt: 'orig', receipt: '01M7XPG6KKAVMAG99SBA38R1TQ', usd: 0.0019, model: 'f' }
    ];
    const now = '2026-11-21T00:00:00Z';
    const log = buildCostLog({ usage, build, art, cases, now });

    const v = costsFor(log, 'violin');
    assert(v.entries.length === 2, `v_len: ${v.entries.length}`);
    assert(v.totals.usd === round6(0.011 + 0.0019), `v_usd: ${v.totals.usd}`);
    assert(v.totals.receipts === 2, `v_rec: ${v.totals.receipts}`);

    const gx = costsFor(log, 'gen-x');
    assert(gx.entries.length === 1 && gx.entries[0].kind === 'generate' && gx.entries[0].usd === 0.022, `gx: ${JSON.stringify(gx.entries)}`);

    const p = costsFor(log, 'pack');
    assert(p.entries.length === 2, `p_len: ${p.entries.length}`);
    assert(p.totals.calls === 2, `p_calls: ${p.totals.calls}`);
    assert(p.totals.usd === 0, `p_usd: ${p.totals.usd}`);

    assert(log.total.calls === 5, `log_calls: ${log.total.calls}`);
    assert(log.total.usd === round6(0.011 + 0.022 + 0.0019), `log_usd: ${log.total.usd}`);
    assert(log.generatedAt === now, `now: ${log.generatedAt}`);
    assert(costsFor(log, 'gen-x').id === 'gen-x', 'c_id');
    assert(costsFor(log, 'pack') === log.pack, 'p_ref');
    assert(costsFor(log, 'nope') === null, 'n_ref');
    report(4, true);
  } catch (e) { report(4, false, e.message); }

  // 5
  try {
    const log = JSON.parse(await readFile('data/cost-log.json', 'utf8'));
    const keys = Object.keys(CASES);
    const expectedKeys = [...keys, 'pack'];
    assert(JSON.stringify(log.cases.map(b => b.id)) === JSON.stringify(keys), 'order');
    const buckets = { ...Object.fromEntries(log.cases.map(b => [b.id, b])), pack: log.pack };
    
    for (const k of expectedKeys) {
      assert(buckets[k], `missing ${k}`);
    }

    let sumUsd = 0;
    for (const k of expectedKeys) {
      const b = buckets[k];
      assert(typeof b.totals.usd === 'number' && b.totals.usd >= 0, `usd_neg:${k}`);
      sumUsd += b.totals.usd;
      if (k === 'violin' || k === 'night-train') {
        const hasPlay = b.entries.some(e => e.kind === 'play');
        const hasArt = b.entries.some(e => e.kind === 'art');
        assert(hasPlay && hasArt, `missing play/art in ${k}`);
      }
      if (k !== 'pack' && !CASES[k]) continue; // skip gen- keys for the 'generated' check if not in CASES but in log
      if (CASES[k]?.generated) {
        assert(b.entries.some(e => e.kind === 'generate'), `missing gen in ${k}`);
      }
    }
    assert(Math.abs(log.total.usd - round6(sumUsd)) < 1e-6, `sum mismatch: ${log.total.usd} vs ${sumUsd}`);
    assert(log.total.receipts >= 0, 'rec ok');
    // Check receipt string length/null
    const allEntries = Object.values(buckets).flatMap(b => b.entries);
    for (const e of allEntries) {
      if (e.receipt) {
        assert(e.receipt.length === 26, `rec len: ${e.receipt}`);
      }
    }
    assert(log.receiptUrl === 'https://qa.fullcup.ai/receipts/', 'url');
    report(5, true);
  } catch (e) { report(5, false, e.message); }

  // 6
  try {
    const sb = createScoreboard(null);
    await sb.add({ player: 'ana', score: 100, caseId: 'violin' });
    await sb.add({ player: ' Ana ', score: 80, caseId: 'night-train' });
    await sb.add({ player: 'ana', score: 40, caseId: 'violin' });
    await sb.add({ player: 'bia', score: 100, caseId: 'violin' });
    await sb.add({ player: 'bia', score: 0, caseId: 'night-train' });
    await sb.add({ player: 'anon', score: 100, caseId: 'violin' });
    await sb.add({ player: '', score: 100, caseId: 'violin' });

    const top = sb.packTop(10);
    assert(top.length === 2, `len: ${top.length}`);
    assert(top[0].player.toLowerCase() === 'ana' && top[0].total === 180 && top[0].solved === 2, 'top0');
    assert(top[1].player === 'bia' && top[1].total === 100 && top[1].solved === 1, 'top1');
    report(6, true);
  } catch (e) { report(6, false, e.message); }

  // 7
  let server;
  try {
    server = createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true, costFile: 'data/cost-log.json', creditsFile: 'data/credits.json' });
    server.listen(0);
    await new Promise(r => setTimeout(r, 100));
    const port = server.address().port;
    const base = `http://127.0.0.1:${port}`;

    const r1 = await fetch(`${base}/costs`);
    assert(r1.status === 200 && r1.headers.get('content-type').includes('text/html'), 'c1');
    const t1 = await r1.text();
    assert(t1.includes('Cost log'), 'c1 body');

    const r2 = await fetch(`${base}/api/costs`);
    assert(r2.status === 200, 'c2');
    const j2 = await r2.json();
    assert(Object.keys(j2.cases).length === Object.keys(CASES).length, 'c2 len');

    const r3 = await fetch(`${base}/api/costs?case=night-train`);
    assert(r3.status === 200 && (await r3.json()).id === 'night-train', 'c3');

    const r4 = await fetch(`${base}/api/costs?case=pack`);
    assert(r4.status === 200 && (await r4.json()).id === 'pack', 'c4');

    const r5 = await fetch(`${base}/api/costs?case=nope`);
    assert(r5.status === 404 && (await r5.json()).error === 'unknown_case', 'c5');


    // To test 404 no_cost_log, we must use a server instance with a non-existent costFile.
    // We'll spawn it temporarily.
    const s2 = createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true, costFile: 'data/no-such-cost-log.json' });
    s2.listen(0);
    await new Promise(r => setTimeout(r, 50));
    const r6_2 = await fetch(`http://127.0.0.1:${s2.address().port}/api/costs`);
    assert(r6_2.status === 404 && (await r6_2.json()).error === 'no_cost_log', 'c6');
    s2.close();

    report(7, true);
  } catch (e) { report(7, false, e.message); } finally { if (server) server.close(); }

  // 8
  server = null;
  try {
    server = createServer({ caseFile: 'content/case.json', scoreFile: null, mock: true, costFile: 'data/cost-log.json', creditsFile: 'data/credits.json' });
    server.listen(0);
    await new Promise(r => setTimeout(r, 100));
    const base = `http://127.0.0.1:${server.address().port}`;

    const r1 = await fetch(`${base}/api/scores?case=all`);
    const data1 = await r1.json();
    assert(Array.isArray(data1), 's1');

    const tmpScoreFile = join(tmpdir(), `score-${Date.now()}.json`);
    const mockData = [
      { "player": "ana", "score": 100, "questions": 3, "correct": true, "lang": "en", "at": "2026-11-20T10:00:00Z", "caseId": "case-violin-001" },
      { "player": "Ana", "score": 80, "questions": 4, "correct": true, "lang": "en", "at": "2026-11-20T11:00:00Z", "caseId": "case-night-train-002" }
    ];
    writeFileSync(tmpScoreFile, JSON.stringify(mockData));

    const ps = createServer({ caseFile: 'content/case.json', scoreFile: tmpScoreFile, mock: true });
    await new Promise(r => ps.listen(0, r));
    await new Promise(r => setTimeout(r, 200));
    const rAll = await fetch(`http://127.0.0.1:${ps.address().port}/api/scores?case=all`);
    const all = await rAll.json();
    assert(Array.isArray(all) && all[0].total === 180 && all[0].solved === 2 && all[0].cases === 2);
    ps.close();
    unlinkSync(tmpScoreFile);

    const r2 = await fetch(`${base}/api/credits?lang=pt`);
    const c2 = await r2.json();
    assert(c2.example === false, 's2');
    assert(c2.backers.length >= 10, 's2 backers');
    for (const b of c2.backers) assert(!/^Backer \d+$/.test(b), 's2 backer name');
    assert(c2.others === 26, 's2 others');
    report(8, true);
  } catch (e) { report(8, false, e.message); } finally { if (server) server.close(); }

  // 9
  try {
    const k = Object.keys(CASES);
    assert(k.length >= 4, 'k1');
    assert(k[0] === 'violin' && k[1] === 'night-train', 'k2');
    assert(k.some(x => x.startsWith('gen-')), 'k3');

    const idx = await readFile('public/index.html', 'utf8');
    assert(idx.includes('id="pack-scores"', 'k4') && idx.includes('id="cost-link"', 'k5') && 
          idx.includes('id="credits-others"', 'k6') && idx.includes('id="credits-cost"', 'k7') && 
          idx.includes('Placar do pacote', 'k8'), 'idx');

    const cos = await readFile('public/costs.html', 'utf8');
    assert(cos.includes('Registro de custos'), 'cos1');
    assert(!cos.includes('https://fullcup.ai'), 'cos2');
    report(9, true);
  } catch (e) { report(9, false, e.message); }

  console.log(`\npack-m4: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

run().catch(e => { console.error(e); process.exit(1); });
