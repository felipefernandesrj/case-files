# Module written by you
<<<FILE src/proxy.js>>>
import { URL } from 'node:url';

/**
 * Create a FullCup proxy client.
 * @param {Object} opts
 * @param {string} opts.key
 * @param {string} opts.baseUrl
 * @param {Function} [opts.fetchImpl=fetch]
 * @param {string} [opts.model='@cf/meta/llama-4-scout-17b-16e-instruct']
 * @returns {{chat(messages: Array<Object>): Promise<string>}}
 */
export function createProxy({
  key,
  baseUrl,
  fetchImpl = fetch,
  model = '@cf/meta/llama-4-scout-17b-16e-instruct',
}) {
  const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';

  async function chat(messages) {
    const payload = {
      model,
      messages,
      max_tokens: 300,
    };

    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-FullCup-Workload': 'case-files:play',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      return typeof content === 'string' ? content : '';
    }

    const status = response.status;
    console.error(`FullCup request failed with status: ${status}`);

    const err = new Error('FullCup request failed');
    err.status = status;

    let bodyJson = null;
    try {
      const text = await response.text();
      bodyJson = JSON.parse(text);
    } catch (_) {
      // bodyJson remains null if parsing fails
    }

    if (status === 401 || status === 403) {
      err.code = 'bad_key';
    } else if (status === 402) {
      err.code = 'no_capacity';
    } else if (status === 429) {
      const lower = (bodyJson?.error?.code ?? bodyJson?.error?.message ?? '').toString().toLowerCase();
      if (lower.includes('capacity:empty')) {
        err.code = 'no_capacity';
      } else {
        err.code = 'rate_limited';
      }
    } else {
      err.code = 'upstream';
    }

    throw err;
  }

  return { chat };
}
<<<END>>>
# Task
Write test/proxy.mjs (plain node, no deps, prints PASS <name>/FAIL <name>: reason per check, then '<n> passed, <m> failed', exit 1 on failure). Use a fake fetchImpl to check: endpoint is https://x.test/v1/chat/completions for baseUrl https://x.test/v1 and for https://x.test/v1/; Authorization header is Bearer <key>; content returned on 200; err.code bad_key for 401, no_capacity for 402 and for 429 with body {error:{code:'capacity:empty'}}, rate_limited for plain 429, upstream for 502; the key never appears in any console.error output. Output ONLY test/proxy.mjs, starting with <<<FILE.
