# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}
# File written by you
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
<<<END>>>
# Bug (live mode)
Every live /api/ask returns error code 'upstream'. new URL('/chat/completions', 'https://qa-api.fullcup.ai/v1') yields https://qa-api.fullcup.ai/chat/completions (the /v1 path is dropped, 404). Build the endpoint by joining baseUrl without its trailing slash + '/chat/completions'. Also add a console.error line with status (never the key) when a request fails. Output ONLY src/proxy.js, complete, starting with <<<FILE.
