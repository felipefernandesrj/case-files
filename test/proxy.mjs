import { createProxy } from '../src/proxy.js';

const results = { passed: 0, failed: 0 };

async function run(name, testFn) {
  const capturedErrors = [];
  const originalError = console.error;
  
  // Intercept console.error to check for key leakage and avoid polluting test output
  console.error = (...args) => {
    capturedErrors.push(args.map(a => String(a)).join(' '));
  };

  try {
    await testFn(capturedErrors);
    console.log(`PASS ${name}`);
    results.passed++;
  } catch (err) {
    console.log(`FAIL ${name}: ${err.message}`);
    results.failed++;
  } finally {
    console.error = originalError;
  }
}

async function main() {
  await run('Endpoint normalization (no trailing slash)', async () => {
    let capturedUrl;
    const fetchImpl = async (url) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) };
    };
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test/v1', fetchImpl });
    await proxy.chat([]);
    if (capturedUrl !== 'https://x.test/v1/chat/completions') {
      throw new Error(`Expected https://x.test/v1/chat/completions, got ${capturedUrl}`);
    }
  });

  await run('Endpoint normalization (with trailing slash)', async () => {
    let capturedUrl;
    const fetchImpl = async (url) => {
      capturedUrl = url;
      return { ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) };
    };
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test/v1/', fetchImpl });
    await proxy.chat([]);
    if (capturedUrl !== 'https://x.test/v1/chat/completions') {
      throw new Error(`Expected https://x.test/v1/chat/completions, got ${capturedUrl}`);
    }
  });

  await run('Authorization header is Bearer <key>', async () => {
    let capturedHeader;
    const fetchImpl = async (url, opts) => {
      capturedHeader = opts.headers.Authorization;
      return { ok: true, json: async () => ({ choices: [{ message: { content: '' } }] }) };
    };
    const proxy = createProxy({ key: 'secret-key', baseUrl: 'https://x.test', fetchImpl });
    await proxy.chat([]);
    if (capturedHeader !== 'Bearer secret-key') {
      throw new Error(`Expected Bearer secret-key, got ${capturedHeader}`);
    }
  });

  await run('Returns content on 200', async () => {
    const fetchImpl = async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hello world' } }] })
    });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    const res = await proxy.chat([]);
    if (res !== 'hello world') {
      throw new Error(`Expected 'hello world', got '${res}'`);
    }
  });

  await run('Error code bad_key for 401/403', async () => {
    const fetchImpl = async () => ({ ok: false, status: 401, text: async () => '' });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      if (e.code !== 'bad_key') throw new Error(`Expected code bad_key, got ${e.code}`);
      return;
    }
    throw new Error('Should have thrown');
  });

  await run('Error code no_capacity for 402', async () => {
    const fetchImpl = async () => ({ ok: false, status: 402, text: async () => '' });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      if (e.code !== 'no_capacity') throw new Error(`Expected code no_capacity, got ${e.code}`);
      return;
    }
    throw new Error('Should have thrown');
  });

  await run('Error code no_capacity for 429 with capacity:empty', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { code: 'capacity:empty' } })
    });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      if (e.code !== 'no_capacity') throw new Error(`Expected code no_capacity, got ${e.code}`);
      return;
    }
    throw new Error('Should have thrown');
  });

  await run('Error code rate_limited for plain 429', async () => {
    const fetchImpl = async () => ({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { message: 'too many requests' } })
    });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      if (e.code !== 'rate_limited') throw new Error(`Expected code rate_limited, got ${e.code}`);
      return;
    }
    throw new Error('Should have thrown');
  });

  await run('Error code upstream for 502', async () => {
    const fetchImpl = async () => ({ ok: false, status: 502, text: async () => '' });
    const proxy = createProxy({ key: 'k', baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      if (e.code !== 'upstream') throw new Error(`Expected code upstream, got ${e.code}`);
      return;
    }
    throw new Error('Should have thrown');
  });

  await run('Key never appears in console.error', async () => {
    const secret = 'SUPER_SECRET_KEY_123';
    const fetchImpl = async () => ({ ok: false, status: 401, text: async () => '' });
    const proxy = createProxy({ key: secret, baseUrl: 'https://x.test', fetchImpl });
    
    // Re-run logic using the run() wrapper which intercepts console.error
    await run('Leak Check Internal', async (logs) => {
      try {
        await proxy.chat([]);
      } catch (e) {
        // Expected
      }
      const leaked = logs.some(msg => msg.includes(secret));
      if (leaked) throw new Error('Secret key was leaked in console.error!');
    });

    // Since run() is nested, we don't increment results.passed twice, 
    // we just ensure this test itself passes or fails.
    // But the wrapper logic above is slightly redundant. 
    // Let's just verify the capture within this scope.
  });

  // Re-implementing the Leak Check properly for the final summary
  await run('Key leakage security check', async (logs) => {
    const secret = 'SUPER_SECRET_KEY_123';
    const fetchImpl = async () => ({ ok: false, status: 401, text: async () => '' });
    const proxy = createProxy({ key: secret, baseUrl: 'https://x.test', fetchImpl });
    try {
      await proxy.chat([]);
    } catch (e) {
      // ignore error
    }
    if (logs.some(msg => msg.includes(secret))) {
      throw new Error('Key leaked into console.error');
    }
  });

  console.log(`\n${results.passed} passed, ${results.failed} failed`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
