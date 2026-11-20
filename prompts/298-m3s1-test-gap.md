Mutation check found a test gap: in test/generator.mjs check 7, if generateCase stops throwing on 402/429/401 the check still passes (the asserts only run inside catch), and it never checks that only ONE request was made. Rewrite the whole check 7 block. Output ONLY one REPLACE block in this exact shape:
<<<REPLACE test/generator.mjs>>>
OLD
=====
NEW
<<<END>>>
OLD is the full current block below, copied exactly. NEW: a helper inside the check `const thrown = async (f) => { try { await generateCase('x', { key: 'K', fetchImpl: f }); } catch (e) { return e; } return null; };` then for each of 402 (body 'capacity:empty'), 429 (body 'capacity:empty') and 401 (body '{}'): e = await thrown(f); must(e, '<status> did not throw'); the code (402 'no_capacity', 429 'no_capacity', 401 'bad_key'); f.calls.length === 1; e.attempts.length === 1; and for 402 also e.status === 402. Also a 429 with body 'slow down' gives code 'rate_limited'.
Current block:
await check('7. 402 stops at once', async () => {
  const f402 = fake([{ status: 402, body: 'capacity:empty' }]);
  try {
    await generateCase('x', { key: 'K', fetchImpl: f402 });
  } catch (e) {
    must(e.code === 'no_capacity' && e.status === 402, '402 error');
    must(e.attempts.length === 1, '402 attempts');
  }
  const f429 = fake([{ status: 429, body: 'capacity:empty' }]);
  try {
    await generateCase('x', { key: 'K', fetchImpl: f429 });
  } catch (e) {
    must(e.code === 'no_capacity', '429 capacity');
  }
  const f401 = fake([{ status: 401 }]);
  try {
    await generateCase('x', { key: 'K', fetchImpl: f401 });
  } catch (e) {
    must(e.code === 'bad_key', '401 error');
  }
});
