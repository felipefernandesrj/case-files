import fs from 'node:fs';
import { loadCase } from '../src/case.js';
import { slugSeed, extractJson, validateCase, finishCase, generateCase, genMessages, GEN_MODEL } from '../src/generator.js';

const results = [];
const must = (ok, msg) => { if (!ok) throw new Error(msg); };
async function check(name, fn) { try { await fn(); results.push(`PASS ${name}`); } catch (e) { results.push(`FAIL ${name}: ${e.message}`); } }

function fake(replies) { 
  const calls = []; 
  const f = async (url, opts) => { 
    calls.push({ url, opts, body: JSON.parse(opts.body) }); 
    const r = replies[Math.min(calls.length - 1, replies.length - 1)]; 
    return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { 
      status: r.status || 200, 
      headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + calls.length } 
    }); 
  }; 
  f.calls = calls; 
  return f; 
}

const reply = (text) => ({ body: { choices: [{ message: { content: text } }], usage: { prompt_tokens: 10, completion_tokens: 20 } } });

const good = loadCase('content/cases/night-train.json');
const bad = { ...good, clues: good.clues.map(c => ({ ...c, clears: null })) };

await check('1. slugSeed', async () => {
  must(slugSeed('A Lighthouse, in a Storm!') === 'a-lighthouse-in-a-storm', 'slugSeed 1');
  must(slugSeed('Café São João') === 'cafe-sao-joao', 'slugSeed 2');
  must(slugSeed('***') === 'case', 'slugSeed 3');
  const long = slugSeed('a'.repeat(100));
  must(long.length <= 40, 'slugSeed length');
  must(!long.endsWith('-'), 'slugSeed trailing dash');
});

await check('2. extractJson', async () => {
  must(JSON.stringify(extractJson('```json\n{"a":1}\n```')) === '{"a":1}', 'extractJson fenced');
  must(extractJson('Here it is: {"a":{"b":2}} done').a.b === 2, 'extractJson inline');
  must(extractJson('no json') === null, 'extractJson null');
  must(extractJson('{broken') === null, 'extractJson broken');
});

await check('3. validateCase', async () => {
  must(validateCase(good, { suspects: 4 }).ok, 'validateCase good');
  must(validateCase(bad, { suspects: 4 }).reasons.includes('suspect_not_cleared'), 'validateCase bad clues');
  must(validateCase(good, { suspects: 3 }).reasons.includes('wrong_suspect_count'), 'validateCase wrong count');
  const resNull = validateCase(null);
  must(resNull.reasons[0] === 'not_object', 'validateCase null');
  must(validateCase({ ...good, title: { en: 'x' } }).reasons.includes('missing_title'), 'validateCase missing title');
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
  const third = JSON.parse(fs.readFileSync('qa/m3s1-probes/gen-live-3.case.json', 'utf8'));
  must(validateCase(third, { suspects: 4 }).reasons.includes('culprit_cleared'), 'third live case (clue clears the culprit) now rejected');
  must(!validateCase(good, { suspects: 4 }).reasons.includes('culprit_cleared'), 'night train does not clear its culprit');
});

await check('4. first try ok', async () => {
  const res = await generateCase('night train', {
    key: 'SECRET-KEY',
    fetchImpl: fake([reply(JSON.stringify(good))])
  });
  must(res.ok, 'gen ok');
  must(res.attempts.length === 1, 'gen attempts');
  must(res.attempts[0].receipt === 'R1', 'gen receipt');
  must(res.case.id === 'case-gen-night-train', 'gen id');
  must(res.case.questionBudget === 10, 'gen budget');
  must(res.case.generated.seed === 'night train', 'gen seed');
  must(res.case.generated.model === GEN_MODEL, 'gen model');
});

await check('5. retries with reasons', async () => {
  let capturedCalls = [];
  const fetchWithCapture = async (url, opts) => {
    capturedCalls.push({ url, opts, body: JSON.parse(opts.body) });
    const r = replies[Math.min(capturedCalls.length - 1, replies.length - 1)];
    return new Response(typeof r.body === 'string' ? r.body : JSON.stringify(r.body), { status: r.status || 200, headers: { 'content-type': 'application/json', 'x-fullcup-receipt-id': 'R' + capturedCalls.length } });
  };
  const replies = [
    reply('sorry'),
    reply(JSON.stringify(bad)),
    reply('```json\n' + JSON.stringify(good) + '\n```')
  ];
  const res = await generateCase('night train', {
    key: 'SECRET-KEY',
    fetchImpl: fetchWithCapture
  });
  must(res.ok, 'retries ok');
  must(res.attempts.length === 3, 'retries length');
  must(res.attempts[0].reasons.includes('not_json'), 'attempt 0 reason');
  must(res.attempts[1].reasons.some(r => r === 'suspect_not_cleared'), 'attempt 1 reason');
  must(capturedCalls[1].body.messages[1].content.includes('not_json'), 'user msg 2');
  must(capturedCalls[2].body.messages[1].content.includes('suspect_not_cleared'), 'user msg 3');
  must(!capturedCalls[0].body.messages[1].content.includes('previous draft'), 'user msg 1');
});

await check('6. gives up', async () => {
  const res = await generateCase('night train', {
    key: 'SECRET-KEY',
    fetchImpl: fake([reply(JSON.stringify(bad)), reply(JSON.stringify(bad)), reply(JSON.stringify(bad))])
  });
  must(!res.ok, 'gives up ok false');
  must(res.case === null, 'case null');
  must(res.attempts.length === 3, '3 attempts');
  must(res.reasons.includes('suspect_not_cleared'), 'final reasons');
});

await check('7. 402/429/401 stop at once', async () => {
  const thrown = async (f) => {
    try {
      await generateCase('x', { key: 'K', fetchImpl: f });
    } catch (e) {
      return e;
    }
    return null;
  };

  const scenarios = [
    { status: 402, body: 'capacity:empty', code: 'no_capacity', expectedStatus: 402 },
    { status: 429, body: 'capacity:empty', code: 'no_capacity' },
    { status: 429, body: 'slow down', code: 'rate_limited' },
    { status: 401, body: '{}', code: 'bad_key' }
  ];

  for (const s of scenarios) {
    const f = fake([{ status: s.status, body: s.body }]);
    const e = await thrown(f);
    must(e, `${s.status} did not throw`);
    must(e.code === s.code, `${s.status} code mismatch: ${e.code} !== ${s.code}`);
    must(f.calls.length === 1, `${s.status} should only make 1 request`);
    must(e.attempts.length === 1, `${s.status} should only have 1 attempt`);
    if (s.expectedStatus) {
      must(e.status === s.expectedStatus, `${s.status} status mismatch`);
    }
  }
});

await check('8. request shape', async () => {
  let lastOpts;
  const fShape = async (url, opts) => {
    lastOpts = { ...opts, url };
    return new Response(JSON.stringify(reply('{}')), { status: 200 });
  };
  await generateCase('x', { key: 'SECRET-KEY', fetchImpl: fShape });
  must(lastOpts.url.endsWith('/v1/chat/completions'), 'url');
  must(!lastOpts.url.includes('//chat'), 'no double slash');
  must(lastOpts.headers.Authorization === 'Bearer SECRET-KEY', 'auth');
  must(lastOpts.headers['X-FullCup-Workload'] === 'case-files:generate', 'workload');
  const body = JSON.parse(lastOpts.body);
  must(body.model === GEN_MODEL, 'body model');
  must(body.chat_template_kwargs.enable_thinking === false, 'thinking false');
  must(body.messages[0].role === 'system', 'sys role');
  must(genMessages('x', { suspects: 5 })[1].content.includes('Suspects: 5'), 'suspects in user msg');
  const retry = genMessages('x', { reasons: ['clue_self_implicates', 'made_up_code'] })[1].content;
  must(retry.includes('- clue_self_implicates: a clue whose "implicates" is X must come "from" a different suspect'), 'hint for clue_self_implicates');
  must(retry.includes('- made_up_code: fix this check'), 'fallback hint');
  must(!genMessages('x')[1].content.includes('- '), 'no hints on the first try');
});

await check('9. key never leaks', async () => {
  const secret = 'SECRET-KEY';
  const res4 = await generateCase('night train', { key: secret, fetchImpl: fake([reply(JSON.stringify(good))]) });
  must(!JSON.stringify(res4).includes(secret), 'leak 4');
  const res6 = await generateCase('night train', { key: secret, fetchImpl: fake([reply(JSON.stringify(bad)), reply(JSON.stringify(bad)), reply(JSON.stringify(bad))]) });
  must(!JSON.stringify(res6).includes(secret), 'leak 6');
  try {
    await generateCase('x', { key: secret, fetchImpl: fake([{ status: 402, body: 'capacity:empty' }]) });
  } catch (e) {
    must(!JSON.stringify(e).includes(secret), 'leak 402');
  }
});

await check('10. CLI without --seed', async () => {
  const { spawnSync } = await import('node:child_process');
  const res = spawnSync(process.execPath, ['src/generator.js'], { encoding: 'utf8' });
  must(res.status === 2, 'exit 2');
  must(res.stderr.includes('Usage: node src/generator.js'), 'stderr usage');
});

for (const l of results) console.log(l);
const failed = results.filter((l) => l.startsWith('FAIL')).length;
console.log(`generator: ${results.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
