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
  const endpoint = new URL('/chat/completions', baseUrl).toString();

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

    // error handling
    const err = new Error('FullCup request failed');
    const status = response.status;

    let bodyJson;
    try {
      // Try JSON first
      bodyJson = await response.json();
    } catch (_) {
      try {
        const txt = await response.text();
        bodyJson = JSON.parse(txt);
      } catch (_) {
        bodyJson = null;
      }
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
    } else if (status >= 500 && status < 600) {
      err.code = 'upstream';
    } else {
      err.code = 'upstream';
    }

    throw err;
  }

  return { chat };
}
