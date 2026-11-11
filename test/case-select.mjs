import fs from 'node:fs';
import { once } from 'node:events';
import { spawnSync } from 'node:child_process';
import { createServer } from '../src/server.js';
import { loadCase, CASES, caseFileFor, unknownCaseLine } from '../src/case.js';

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const nt = loadCase('content/cases/night-train.json');
const violin = loadCase();

async function start(opts) {
  const server = createServer({ scoreFile: null, mock: true, ...opts });
  server.listen(0);
  await once(server, 'listening');
  const base = `http://localhost:${server.address().port}`;
  return { server, base };
}

const getJ = (base, p) => fetch(base + p).then(async (r) => ({ status: r.status, body: await r.json() }));
const postJ = (base, p, b) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }).then(async (r) => ({ status: r.status, body: await r.json() }));

await test('case registry maps known ids to files', async () => {
  assert(JSON.stringify(Object.keys(CASES)) === JSON.stringify(['violin', 'night-train']), 'registry mismatch');
  assert(caseFileFor('violin') === 'content/case.json', 'violin path wrong');
  assert(caseFileFor('night-train') === 'content/cases/night-train.json', 'night-train path wrong');
  assert(Object.isFrozen(CASES), 'CASES not frozen');
});

await test('unknown or path-like ids are rejected', async () => {
  for (const id of ['nope', '../package', 'toString', '', undefined, 'Night-Train']) {
    let threw = false;
    try {
      caseFileFor(id);
    } catch (e) {
      threw = true;
      assert(e.code === 'unknown_case', `wrong code for ${String(id)}`);
    }
    assert(threw, `did not throw for ${String(id)}`);
  }
});

await test('without the flag the server still serves the violin', async () => {
  let res;
  const { server, base } = await start({ caseFile: 'content/case.json' });
  try {
    res = await getJ(base, '/api/status');
    assert(res.status === 200, 'status not 200');
    assert(res.body.caseId === violin.id, 'wrong caseId');
    assert(res.body.mode === 'mock', 'mode not mock');

    const c = await getJ(base, '/api/case?lang=en');
    assert(c.body.suspects.length === 3, 'suspect count wrong');
  } finally {
    server.close();
  }
});

await test('caseId night-train serves the night train without secrets', async () => {
  let res;
  const { server, base } = await start({ caseFile: 'content/case.json', caseId: 'night-train' });
  try {
    const s = await getJ(base, '/api/status');
    assert(s.body.caseId === nt.id, 'wrong caseId');

    for (const lang of ['en', 'pt']) {
      const c = await getJ(base, `/api/case?lang=${lang}`);
      assert(c.body.title === nt.title[lang], 'title mismatch');
      assert(c.body.suspects.length === 4, 'suspect count mismatch');
      const txt = JSON.stringify(c.body).toLowerCase();
      assert(!txt.includes('culprit') && !txt.includes('culpad'), 'secrets leaked');
      for (const sus of nt.suspects) {
        assert(!txt.includes(sus.facts.toLowerCase()), 'facts leaked');
      }
    }
  } finally {
    server.close();
  }
});

await test('night train plays end to end in mock mode', async () => {
  let res;
  const { server, base } = await start({ caseFile: 'content/case.json', caseId: 'night-train' });
  try {
    const sess = await postJ(base, '/api/session', {});
    assert(sess.status === 200 && sess.body.sessionId, 'session failed');
    const sid = sess.body.sessionId;

    const ask1 = await postJ(base, '/api/ask', { sessionId: sid, suspectId: 'helena', question: 'Onde você estava no apagão?', lang: 'pt' });
    assert(ask1.status === 200, 'ask failed');
    assert(typeof ask1.body.answer === 'string' && ask1.body.answer.length > 0, 'no answer');
    assert(ask1.body.questions === 1, 'question count wrong');

    const ask2 = await postJ(base, '/api/ask', { sessionId: sid, suspectId: 'maya', question: 'Hi', lang: 'en' });
    assert(ask2.status === 400, 'should reject violin suspect');

    const acc = await postJ(base, '/api/accuse', { sessionId: sid, suspectId: nt.culprit, player: 'case-select', lang: 'pt' });
    assert(acc.status === 200, 'accuse failed');
    assert(acc.body.correct === true, 'wrong result');
    assert(acc.body.culpritName === 'Inês Duarte', 'name mismatch');
    assert(acc.body.solution === nt.solution.pt, 'solution mismatch');
    assert(acc.body.score > 0, 'no score');
  } finally {
    server.close();
  }
});

await test('unknown caseId fails at startup', async () => {
  let threw = false;
  try {
    createServer({ caseFile: 'content/case.json', caseId: 'nope', scoreFile: null, mock: true });
  } catch (e) {
    threw = true;
    assert(e.code === 'unknown_case', 'wrong error code');
  }
  assert(threw, 'should have thrown');
});

await test('CLI --case loads the night train and the page has no case picker', async () => {
  const r = spawnSync(process.execPath, ['src/cli.js', '--case', 'night-train', '--lang', 'pt'], { input: 'quit\n', encoding: 'utf8', timeout: 10000 });
  assert(r.status === 0, 'cli failed');
  assert(r.stdout.includes(nt.title.pt) && r.stdout.includes('Inês Duarte'), 'stdout missing data');
  const page = fs.readFileSync('public/index.html', 'utf8');
  assert(!page.includes('night-train') && !page.includes('caseId') && !page.includes('CASE_ID'), 'picker leaked to HTML');
});

await test('unknown CASE_ID gives one friendly line and exit code 2', async () => {
  const r = spawnSync(process.execPath, ['src/server.js'], { env: { ...process.env, CASE_ID: 'nope', PORT: '0' }, encoding: 'utf8', timeout: 10000 });
  assert(r.status === 2, 'server should exit 2');
  assert(r.stderr.trim() === unknownCaseLine('nope'), 'stderr is not the friendly line');
  assert(r.stderr.trim().split('\n').length === 1, 'more than one line');
  assert(r.stderr.includes('violin') && r.stderr.includes('night-train'), 'valid ids missing');
  assert(!r.stderr.includes('    at ') && !r.stderr.includes('Error:'), 'stack trace printed');
  assert(!r.stdout.includes('listening'), 'server started');
});

await test('CLI --case with an unknown id gives one friendly line and exit code 2', async () => {
  const r = spawnSync(process.execPath, ['src/cli.js', '--case', 'Night-Train'], { input: 'quit\n', encoding: 'utf8', timeout: 10000 });
  assert(r.status === 2, 'cli should exit 2');
  assert(r.stderr.trim() === unknownCaseLine('Night-Train'), 'stderr is not the friendly line');
  assert(!r.stderr.includes('    at '), 'stack trace printed');
  assert(r.stdout.trim() === '', 'cli printed a case');
});


await test('GET /api/cases lists both files without secrets', async () => {
  const { server, base } = await start({ caseFile: 'content/case.json' });
  try {
    const en = await getJ(base, '/api/cases?lang=en');
    assert(en.status === 200, 'status not 200');
    const ids = en.body.cases.map((c) => c.id);
    assert(ids.includes('violin') && ids.includes('night-train'), 'ids missing');
    assert(en.body.cases.length === 2, 'count');
    const txt = JSON.stringify(en.body).toLowerCase();
    assert(!txt.includes('culprit') && !txt.includes('facts'), 'secrets leaked');
    const pt = await getJ(base, '/api/cases?lang=pt');
    assert(pt.body.cases.some((c) => c.title === nt.title.pt), 'pt title missing');
  } finally {
    server.close();
  }
});

await test('a session can open the night train without a process flag', async () => {
  const { server, base } = await start({ caseFile: 'content/case.json' });
  try {
    const def = await getJ(base, '/api/status');
    assert(def.body.caseId === violin.id, 'default status should stay the violin');
    const pub = await getJ(base, '/api/case?lang=en&case=night-train');
    assert(pub.body.title === nt.title.en, 'query case title');
    assert(pub.body.suspects.length === 4, 'query case suspects');
    assert(!JSON.stringify(pub.body).toLowerCase().includes('culprit'), 'secrets leaked');
    const sess = await postJ(base, '/api/session', { case: 'night-train' });
    assert(sess.status === 200 && sess.body.sessionId, 'session failed');
    const sid = sess.body.sessionId;
    const ask1 = await postJ(base, '/api/ask', { sessionId: sid, suspectId: 'helena', question: 'Where were you?', lang: 'en' });
    assert(ask1.status === 200, 'ask failed');
    const ask2 = await postJ(base, '/api/ask', { sessionId: sid, suspectId: 'maya', question: 'Hi', lang: 'en' });
    assert(ask2.status === 400, 'should reject violin suspect');
  } finally {
    server.close();
  }
});


console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
