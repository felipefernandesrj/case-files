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
  retryMaxMs = 8000,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
}) {
  const endpoint = baseUrl.replace(/\/$/, '') + '/chat/completions';

  async function chat(messages) {
    const payload = {
      model,
      messages,
      max_tokens: 300,
    };

    const send = () => fetchImpl(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        'X-FullCup-Workload': 'case-files:play',
      },
      body: JSON.stringify(payload),
    });
    let response = await send();
    // pre-launch QA: the Cup key allows 60 requests a minute for the whole game; wait out one short rate limit instead of failing the question
    if (response.status === 429) {
      const ra = Number(response.headers?.get?.('retry-after'));
      let peek = '';
      try { peek = await response.clone().text(); } catch {}
      if (!peek.toLowerCase().includes('capacity:empty') && Number.isFinite(ra) && ra * 1000 <= retryMaxMs) {
        await sleep(ra * 1000);
        response = await send();
      }
    }

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
    let errorText = '';
    try {
      bodyJson = await response.json();
    } catch {
      try {
        errorText = await response.text();
      } catch {
        // Both json() and text() failed or were unavailable
      }
    }

    const errorContent = (bodyJson?.error?.code ?? bodyJson?.error?.message ?? errorText ?? '').toString().toLowerCase();

    if (status === 401 || status === 403) {
      err.code = 'bad_key';
    } else if (status === 402) {
      err.code = 'no_capacity';
    } else if (status === 429) {
      if (errorContent.includes('capacity:empty')) {
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
