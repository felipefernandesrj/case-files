# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Feature spec v2 (M1 parity). Node 20+, ES modules, ZERO npm deps.

## Case data: content/case.json
{id,title{en,pt},intro{en,pt},culprit,
 suspects:[{id,name,role{en,pt},persona{en,pt},facts:string (English private role-play instructions)}],
 clues:[{id,from:suspectId,ask:string (EN example question that reveals it),keywords:[lowercase EN+PT words that trigger it],implicates:suspectId|null,clears:suspectId|null,text{en,pt}}],
 glossary:[{en,pt}] (fixed PT-BR translations of key nouns; the role-play prompt in PT must enforce them),
 solution{en,pt}}

## Modules (exact exports)
- src/case.js: loadCase(file='content/case.json') -> case object; publicCase(c, lang) -> {id,title,intro,suspects:[{id,name,role,persona}]} (strings in lang, NEVER facts/culprit/solution/clues); fairPlay(c) -> {ok:boolean, reasons:[string]}: ok only if there are exactly 3 suspects, culprit is a suspect id, at least 2 clues implicate the culprit, every innocent is cleared by at least one clue, every clue.from is a suspect id, and every clue has non-empty ask, keywords, text.en, text.pt. systemPrompt(c, suspectId, lang) -> string: in character, uses facts and that suspect's clues (reveal a clue's text when the question touches it), never confess outright, reply in the language (PT-BR when lang=pt, with "Use these exact PT-BR terms:" + glossary lines; EN prompt has no glossary), max 80 words. capWords(text, n=80) -> text trimmed to at most n words (ending with "…" when cut).
- src/proxy.js: createProxy({key, baseUrl, fetchImpl=fetch, model='@cf/meta/llama-4-scout-17b-16e-instruct'}) -> {chat(messages) -> Promise<string>}. POST {baseUrl}/chat/completions, Authorization Bearer, header X-FullCup-Workload: case-files:play. Errors throw an Error with .code: 402 -> 'no_capacity'; 429 whose body (error.code or message or raw text) contains 'capacity:empty' -> 'no_capacity'; other 429 -> 'rate_limited'; 401/403 -> 'bad_key'; anything else -> 'upstream'. Never include the key in errors or logs.
- src/mock.js: mockAnswer(c, suspectId, question, lang) -> deterministic in-character string in lang; if the question matches a clue's keywords (case-insensitive) for that suspect, the answer includes that clue's text[lang]. No network.
- src/messages.js: friendly(code, lang) -> short friendly sentence EN/PT for no_capacity ("this Cup is out of capacity, backers can refill it"), rate_limited (try again in a moment), bad_key (game key not configured or invalid, the creator was notified), upstream, bad_request.
- src/scoreboard.js: scoreFor(correct, questions) = correct ? max(10, 100 - 5*max(0, questions-3)) : 0. createScoreboard(file|null) -> {add({player,score,questions,correct,lang,at}), top(n=10)}; sorted by score desc, then fewer questions, then earlier at; keeps 100; persists JSON to file if file is set (create dir). Default file data/scores.json.
- src/server.js: export createServer({caseFile, scoreFile='data/scores.json', key, baseUrl, fetchImpl, mock}) returning an http.Server (not listening). If run directly (import.meta.url is the entry), listen on PORT||3000 and print the URL. Key from opts.key, else env FULLCUP_KEY, else file .fullcup-key; mock = opts.mock ?? (env MOCK==='1' || no key). Routes (JSON; lang from body.lang or ?lang, default en):
  GET / -> public/index.html. GET /api/status -> {mode:'mock'|'live', caseId}. GET /api/case -> publicCase. POST /api/session -> {sessionId} (random). POST /api/ask {sessionId,suspectId,question,lang} -> {answer, questions:<count for session>}; per-session per-suspect history kept on the server and sent to the model as prior turns; answer passed through capWords(…,80). POST /api/accuse {sessionId,suspectId,player,lang} -> {correct,culprit,culpritName,solution,score,questions}; adds to scoreboard (player default 'anon', max 24 chars); second accuse in same session -> 409. GET /api/scores -> top 10.
  Validation -> 400 {error:'bad_request',message}: unknown suspect, empty/over-500-char question, unknown session. Proxy errors -> status 402 (no_capacity), 429 (rate_limited), 503 (bad_key), 502 (upstream) with {error:code, message:friendly(code,lang)}. Unhandled errors -> 500 JSON, never crash. Never send the key to the client.
- src/cli.js: terminal play: `node src/cli.js [--lang pt] [--player name]`; starts createServer on port 0, prints title, intro, suspects; commands `ask <id> <question>`, `accuse <id>`, `history <id>`, `quit` (PT aliases pergunta/acusar/historico/sair). Works with piped stdin (exit after accuse or EOF).

## Web page public/index.html (single file, inline CSS+JS)
- Language toggle: two buttons id="len" (EN) and id="lpt" (PT) with aria-pressed reflecting state; switching re-renders all UI text and the case; html lang attribute updated ("en"/"pt-BR").
- Suspects: a group of 3 buttons (data-id=suspect id), aria-pressed on the selected one; selecting moves focus to the question input id="q".
- Form: <label for="q">, input id="q", submit button "Ask"/"Perguntar"; Enter submits. Per-suspect conversation log (all previous Q&A for the selected suspect, persisted while switching suspects) in an element id="log" with role="log" aria-live="polite". While waiting show "…thinking" text and disable the button.
- Player name input id="player" with label. Accuse section id="acc" with 3 buttons "Accuse <name>"/"Acusar <name>". Verdict in id="verdict" role="status" aria-live="assertive", focus moves to it (tabindex=-1), shows correct/wrong, solution and score; then a scoreboard table (GET /api/scores) with caption.
- Errors (402/429/503/502) shown as the friendly message in a role="alert" element id="err".
- Visible focus outline on every interactive element (:focus-visible outline 3px). Tab order: len, lpt, 3 suspects, q, Ask, player, 3 accuse buttons. Good contrast, responsive.

# Files already written by you
<<<FILE src/case.js>>>
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Load the case JSON file.
 * @param {string} [file='content/case.json']
 * @returns {Promise<Object>}
 */
export async function loadCase(file = 'content/case.json') {
  const base = dirname(fileURLToPath(import.meta.url));
  const path = resolve(base, '..', file);
  const data = await readFile(path, 'utf8');
  return JSON.parse(data);
}

/**
 * Return a public version of the case (no secrets) in the requested language.
 * @param {Object} c
 * @param {'en'|'pt'} lang
 * @returns {Object}
 */
export function publicCase(c, lang) {
  const suspects = c.suspects.map(s => ({
    id: s.id,
    name: s.name,
    role: s.role[lang],
    persona: s.persona[lang],
  }));
  return {
    id: c.id,
    title: c.title[lang],
    intro: c.intro[lang],
    suspects,
  };
}

/**
 * Validate the case for fair play.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c) {
  const reasons = [];

  // 3 suspects
  if (!Array.isArray(c.suspects) || c.suspects.length !== 3) {
    reasons.push('case must contain exactly 3 suspects');
  }

  const suspectIds = new Set(c.suspects.map(s => s.id));

  // culprit is a suspect
  if (!suspectIds.has(c.culprit)) {
    reasons.push('culprit must be one of the suspect ids');
  }

  // clues checks
  if (!Array.isArray(c.clues) || c.clues.length === 0) {
    reasons.push('case must contain clues');
  } else {
    // at least 2 clues implicate the culprit
    const implicating = c.clues.filter(cl => cl.implicates === c.culprit);
    if (implicating.length < 2) {
      reasons.push('at least two clues must implicate the culprit');
    }

    // every innocent cleared by at least one clue
    const innocents = c.suspects.filter(s => s.id !== c.culprit).map(s => s.id);
    for (const innocent of innocents) {
      const cleared = c.clues.some(cl => cl.clears === innocent);
      if (!cleared) {
        reasons.push(`innocent suspect ${innocent} must be cleared by at least one clue`);
      }
    }

    // each clue.from must be a suspect id and fields non‑empty
    for (const cl of c.clues) {
      if (!suspectIds.has(cl.from)) {
        reasons.push(`clue ${cl.id} has invalid from ${cl.from}`);
      }
      if (!cl.ask || typeof cl.ask !== 'string' || cl.ask.trim() === '') {
        reasons.push(`clue ${cl.id} must have a non‑empty ask`);
      }
      if (!Array.isArray(cl.keywords) || cl.keywords.length === 0) {
        reasons.push(`clue ${cl.id} must have non‑empty keywords`);
      }
      if (!cl.text?.en || typeof cl.text.en !== 'string' || cl.text.en.trim() === '') {
        reasons.push(`clue ${cl.id} must have non‑empty text.en`);
      }
      if (!cl.text?.pt || typeof cl.text.pt !== 'string' || cl.text.pt.trim() === '') {
        reasons.push(`clue ${cl.id} must have non‑empty text.pt`);
      }
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Build a system prompt for the LLM.
 * @param {Object} c
 * @param {string} suspectId
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function systemPrompt(c, suspectId, lang) {
  const suspect = c.suspects.find(s => s.id === suspectId);
  if (!suspect) return '';

  const facts = suspect.facts?.trim() ?? '';
  const role = suspect.role[lang];
  const persona = suspect.persona[lang];

  let prompt = `You are ${suspect.name}, a ${role}. Persona: ${persona}.`;

  if (facts) {
    prompt += ` Facts: ${facts}.`;
  }

  // Add glossary for Portuguese
  if (lang === 'pt') {
    const lines = c.glossary.map(g => `${g.en}: ${g.pt}`);
    prompt += ` Use these exact PT-BR terms: ${lines.join(', ')}.`;
  }

  // Ensure max 80 words
  return capWords(prompt, 80);
}

/**
 * Trim a text to at most n words, adding an ellipsis if cut.
 * @param {string} text
 * @param {number} [n=80]
 * @returns {string}
 */
export function capWords(text, n = 80) {
  const words = text.trim().split(/\s+/);
  if (words.length <= n) return text.trim();
  return words.slice(0, n).join(' ') + '…';
}
<<<END>>>
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

    let bodyText = '';
    let bodyJson;
    try {
      bodyText = await response.text();
      bodyJson = JSON.parse(bodyText);
    } catch (_) {
      // ignore parse errors
    }

    if (status === 401 || status === 403) {
      err.code = 'bad_key';
    } else if (status === 402) {
      err.code = 'no_capacity';
    } else if (status === 429) {
      const lower = (bodyJson?.error?.code ?? bodyJson?.error?.message ?? bodyText ?? '').toString().toLowerCase();
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
<<<FILE src/mock.js>>>
/**
 * Deterministic mock answer generator.
 * @param {Object} c
 * @param {string} suspectId
 * @param {string} question
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function mockAnswer(c, suspectId, question, lang) {
  const suspect = c.suspects.find(s => s.id === suspectId);
  if (!suspect) return '';

  const lowerQ = question.toLowerCase();

  // Find clues that belong to this suspect
  const clues = (c.clues || []).filter(cl => cl.from === suspectId);

  for (const clue of clues) {
    const keywords = (clue.keywords || []).map(k => k.toLowerCase());
    if (keywords.some(k => lowerQ.includes(k))) {
      // Return the clue text in the appropriate language
      return clue.text[lang] ?? '';
    }
  }

  // No matching clue – generic fallback
  if (lang === 'pt') {
    return 'Não tenho comentários sobre isso.';
  } else {
    return 'I have no comment on that.';
  }
}
<<<END>>>
<<<FILE src/messages.js>>>
/**
 * Friendly messages for client‑facing errors.
 * @param {'no_capacity'|'rate_limited'|'bad_key'|'upstream'|'bad_request'} code
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function friendly(code, lang) {
  const msgs = {
    no_capacity: {
      en: 'this Cup is out of capacity, backers can refill it',
      pt: 'este Copo está sem capacidade, os apoiadores podem reabastecê-lo',
    },
    rate_limited: {
      en: 'try again in a moment',
      pt: 'tente novamente em um momento',
    },
    bad_key: {
      en: 'game key not configured or invalid, the creator was notified',
      pt: 'chave do jogo não configurada ou inválida, o criador foi notificado',
    },
    upstream: {
      en: 'upstream service error, please try later',
      pt: 'erro no serviço upstream, tente novamente mais tarde',
    },
    bad_request: {
      en: 'bad request',
      pt: 'requisição inválida',
    },
  };

  const entry = msgs[code];
  if (!entry) return '';
  return lang === 'pt' ? entry.pt : entry.en;
}
<<<END>>>
<<<FILE src/scoreboard.js>>>
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

/**
 * Compute a score.
 * @param {boolean} correct
 * @param {number} questions
 * @returns {number}
 */
export function scoreFor(correct, questions) {
  if (!correct) return 0;
  return Math.max(10, 100 - 5 * Math.max(0, questions - 3));
}

/**
 * Create a scoreboard manager.
 * @param {string|null} filePath
 * @returns {{add: Function, top: Function}}
 */
export function createScoreboard(filePath = null) {
  let entries = [];

  const load = async () => {
    if (!filePath) return;
    try {
      const data = await readFile(filePath, 'utf8');
      entries = JSON.parse(data);
    } catch (_) {
      entries = [];
    }
  };

  const persist = async () => {
    if (!filePath) return;
    try {
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
    } catch (_) {
      // ignore persistence errors
    }
  };

  // initial load
  load();

  /**
   * Add a new scoreboard entry.
   * @param {Object} param0
   * @param {string} param0.player
   * @param {number} param0.score
   * @param {number} param0.questions
   * @param {boolean} param0.correct
   * @param {'en'|'pt'} param0.lang
   * @param {string} [param0.at] ISO timestamp
   */
  async function add({ player, score, questions, correct, lang, at }) {
    const entry = {
      player,
      score,
      questions,
      correct,
      lang,
      at: at || new Date().toISOString(),
    };
    entries.push(entry);
    // keep only latest 100 after sorting
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    if (entries.length > 100) entries.length = 100;
    await persist();
  }

  /**
   * Get top N entries.
   * @param {number} [n=10]
   * @returns {Array<Object>}
   */
  function top(n = 10) {
    const sorted = [...entries].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    return sorted.slice(0, n);
  }

  return { add, top };
}
<<<END>>>

# Task
Write src/server.js and src/cli.js exactly per spec, using your modules above.
Output only the requested files, complete. Never output content/case.json.
