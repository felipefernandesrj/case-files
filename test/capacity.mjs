import { createServer } from '../src/server.js';
import { loadCase } from '../src/case.js';
import { friendly } from '../src/messages.js';
import http from 'node:http';

async function run() {
  let passed = 0;
  let failed = 0;

  async function testFn(name, fn) {
    try {
      await fn();
      console.log(`PASS ${name}`);
      passed++;
    } catch (err) {
      console.error(`FAIL ${name}: ${err.message}`);
      failed++;
    }
  }

  // Mock Fetch Implementation Setup
  let mode = 'ok';
  const requests = [];

  const fetchImpl = async (url, options) => {
    const body = options.body ? JSON.parse(options.body) : null;
    if (body) requests.push(body);

    if (mode === 'fail402') {
      return { ok: false, status: 402, json: async () => ({ error: friendly('no_capacity', 'en') }), text: async () => '' };
    }
    if (mode === 'fail502') {
      return { ok: false, status: 502, json: async () => ({ error: friendly('upstream', 'en') }), text: async () => '' };
    }
    if (mode === 'fail500') {
      return { ok: false, status: 500, json: async () => ({ error: 'Internal Server Error' }), text: async () => '' };
    }
    if (mode === 'fail429') {
      return { ok: false, status: 429, json: async () => ({ error: friendly('rate_limited', 'en') }), text: async () => '' };
    }
    if (mode === 'fail503') {
      return { ok: false, status: 503, json: async () => ({ error: friendly('bad_key', 'en') }), text: async () => '' };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        choices: [{ message: { content: 'I was in the stove room.' } }],
        questions: 1
      }),
      text: async () => ''
    };
  };

  // Helper to perform HTTP requests against the local server
  const request = (method, path, body, port) => new Promise((resolve, reject) => {
    const req = http.request({
      method,
      path,
      port,
      hostname: 'localhost',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', async () => {
        let json;
        try { json = data ? JSON.parse(data) : {}; } catch (e) { json = {}; }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

  const caseData = await loadCase('content/case.json');

  await testFn("no_capacity text EN", async () => {
    const txt = friendly('no_capacity', 'en');
    const lower = txt.toLowerCase();
    if (!lower.includes('out of play capacity')) throw new Error('missing capacity text');
    if (!lower.includes('backers')) throw new Error('missing backers');
    if (!txt.includes('FullCup')) throw new Error('missing FullCup');
  });

  await testFn("no_capacity text PT", async () => {
    const txt = friendly('no_capacity', 'pt');
    const lower = txt.toLowerCase();
    if (!lower.includes('sem capacidade de jogo')) throw new Error('missing capacity text');
    if (!lower.includes('apoiadores')) throw new Error('missing apoiadores');
    if (!txt.includes('FullCup')) throw new Error('missing FullCup');
    if (txt.includes('Copo')) throw new Error('should not contain Copo');
  });

  await testFn("all messages are clean sentences", async () => {
    const codes = ['no_capacity', 'rate_limited', 'bad_key', 'upstream', 'bad_request'];
    const langs = ['en', 'pt'];
    for (const code of codes) {
      for (const lang of langs) {
        const txt = friendly(code, lang);
        if (!txt || txt.length === 0) throw new Error(`empty text for ${code}/${lang}`);
        if (txt.length >= 200) throw new Error(`too long: ${code}/${lang}`);
        if (!txt.endsWith('.')) throw new Error(`missing dot: ${code}/${lang}`);
        if (txt.includes('—')) throw new Error(`contains em-dash: ${code}/${lang}`);
        if (txt.toLowerCase().includes('upstream')) throw new Error(`contains upstream: ${code}/${lang}`);
        if (txt.includes('402')) throw new Error(`contains 402: ${code}/${lang}`);
      }
    }
  });

  await testFn("402 shows the friendly text and does not count the question", async () => {
    const server = createServer({ caseFile: 'content/case.json', key: 'test-secret-key', baseUrl: 'http://upstream.test/v1', fetchImpl, scoreFile: null, mock: false });
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    try {
      for (const lang of ['en', 'pt']) {
        const { body } = await request('POST', '/api/session', {}, port);
        const sessionId = body.sessionId;
        
        mode = 'fail402';
        const res1 = await request('POST', '/api/ask', { sessionId, suspectId: caseData.suspects[0].id, question: '?', lang }, port);
        if (res1.status !== 402) throw new Error(`expected 402, got ${res1.status}`);
        if (res1.body.error !== 'no_capacity' || res1.body.message !== friendly('no_capacity', lang)) throw new Error('wrong error message');
        if (res1.raw.includes('test-secret-key')) throw new Error('leaked key');

        mode = 'ok';
        const res2 = await request('POST', '/api/ask', { sessionId, suspectId: caseData.suspects[0].id, question: '?', lang }, port);
        if (res2.status !== 200) throw new Error(`expected 200, got ${res2.status}`);
        if (res2.body.questions !== 1) throw new Error('question count error');
      }
    } finally {
      server.close();
    }
  });

  await testFn("upstream error does not count and leaves no history", async () => {
    const server = createServer({ caseFile: 'content/case.json', key: 'test-secret-key', baseUrl: 'http://upstream.test/v1', fetchImpl, scoreFile: null, mock: false });
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    try {
      const { body } = await request('POST', '/api/session', {}, port);
      const sessionId = body.sessionId;
      
      mode = 'fail500';
      const res1 = await request('POST', '/api/ask', { sessionId, suspectId: caseData.suspects[0].id, question: 'FAILED-Q', lang: 'en' }, port);
      if (res1.status !== 502) throw new Error(`expected 502, got ${res1.status}`);
      if (res1.body.message !== friendly('upstream', 'en')) throw new Error('wrong message');

      mode = 'ok';
      const res2 = await request('POST', '/api/ask', { sessionId, suspectId: caseData.suspects[0].id, question: 'Second question', lang: 'en' }, port);
      if (res2.status !== 200) throw new Error(`expected 200, got ${res2.status}`);
      if (res2.body.questions !== 1) throw new Error('expected 1 question');

      const lastReq = requests[requests.length - 1];
      const hasFailedQ = lastReq.messages.some(m => m.content === 'FAILED-Q');
      if (hasFailedQ) throw new Error('History contains failed question');
    } finally {
      server.close();
    }
  });

  await testFn("score is not reduced by failed questions", async () => {
    const server = createServer({ caseFile: 'content/case.json', key: 'test-secret-key', baseUrl: 'http://upstream.test/v1', fetchImpl, scoreFile: null, mock: false });
    await new Promise(r => server.listen(0, r));
    const port = server.address().port;

    try {
      const { body } = await request('POST', '/api/session', {}, port);
      const sessionId = body.sessionId;
      mode = 'fail402';
      for (let i = 0; i < 5; i++) {
        await request('POST', '/api/ask', { sessionId, suspectId: caseData.suspects[0].id, question: '?', lang: 'en' }, port);
      }

      mode = 'ok';
      const res = await request('POST', '/api/accuse', { 
        sessionId, 
        suspectId: caseData.culprit, 
        player: 'Player1', 
        lang: 'en' 
      }, port);

      if (res.status !== 200) throw new Error(`expected 200, got ${res.status}`);
      if (res.body.correct !== true) throw new Error('accusal should be correct');
      if (res.body.questions !== 0) throw new Error('questions should be 0');
      if (res.body.score !== 100) throw new Error(`score should be 100, got ${res.body.score}`);
    } finally {
      server.close();
    }
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

run();
