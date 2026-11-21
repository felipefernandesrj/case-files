`node test/pack-m4.mjs` prints:
1. FAIL: r1: null
4. FAIL: p_calls: 2
5. FAIL: missing violin
6. FAIL: top0
The code under test follows the spec; these are mistakes in the test. Fix the TEST only, with edit blocks (old text copied exactly with its indentation from the current file, a line =====, the new text; no labels). Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>

Check 1: receiptOf takes the whole log entry, the header object is its `headers` field: receiptOf({ headers: { 'x-fullcup-receipt': 'abc' } }) === 'abc' and receiptOf({}) === null. Current lines (4 spaces):
    const r1 = receiptOf({ 'x-fullcup-receipt': 'abc' });
    const r2 = receiptOf({});

Check 4: the pack bucket has 2 entries (the qa:list-models dev entry with usd 0 and build b2 with usd 0), so p.totals.calls is 2 and p.totals.usd is 0; the 5 calls and US$ 0.0349 are log.total.calls and log.total.usd. Current check 4 code:
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
    assert(p.totals.calls === 5, `p_calls: ${p.totals.calls}`);
    assert(p.totals.usd === round6(0.011 + 0.022 + 0.0019 + 0 + 0), `p_usd: ${p.totals.usd}`);

Check 5: log.cases is an ARRAY of buckets in CASES order (each has .id), and log.pack is the pack bucket. Build the map as Object.fromEntries(log.cases.map(b => [b.id, b])) plus pack, and also assert log.cases.map(b => b.id) equals Object.keys(CASES) in order. For "every generated case has a generate entry" use the bucket's own `generated` flag (CASES values are file paths, not case objects). Current lines (4 spaces):
    const logKeys = Object.keys(log.cases || {});
    const buckets = { ...log.cases, pack: log.pack };
and
      if (k !== 'pack' && !CASES[k]) continue; // skip gen- keys for the 'generated' check if not in CASES but in log
      if (CASES[k] && CASES[k].generated) {

Check 6: ana has best 100 on violin and 80 on night-train, so total 180 (not 140), solved 2, cases 2; compare the name case-insensitively (top[0].player.toLowerCase() === 'ana'). Current line (4 spaces):
    assert(top[0].player === 'ana' && top[0].total === 140 && top[0].solved === 2, 'top0');
Start your reply directly with <<<REPLACE. No analysis text.
