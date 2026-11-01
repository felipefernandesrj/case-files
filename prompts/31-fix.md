# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Current project files (written by you)
<<<FILE src/case.js>>>
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

/**
 * Load the case JSON file.
 * @param {string} [file='content/case.json']
 * @returns {Object}
 */
export function loadCase(file = 'content/case.json') {
  const base = dirname(fileURLToPath(import.meta.url));
  const path = resolve(base, '..', file);
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * Return a public version of the case (no secrets).
 * @param {Object} c
 * @param {'en'|'pt'} lang
 * @returns {Object}
 */
export function publicCase(c, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  return {
    id: c.id,
    title: c.title?.[l] ?? '',
    intro: c.intro?.[l] ?? '',
    suspects: (c.suspects ?? []).map(s => ({
      id: s.id,
      name: s.name,
      role: s.role?.[l] ?? '',
      persona: s.persona?.[l] ?? '',
    })),
  };
}

/**
 * Build the system prompt for the LLM.
 * @param {Object} c
 * @param {string} suspectId
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function systemPrompt(c, suspectId, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  const suspect = (c.suspects ?? []).find(s => s.id === suspectId) || {};
  const intro = c.intro?.[l] ?? '';
  const persona = suspect.persona?.[l] ?? '';
  let prompt = `${intro}\n\nYou are role‑playing as ${suspect.name ?? ''}. ${persona}`;

  // Glossary is added for PT prompts. Include all glossary entries except any that contain the term "violonista".
  if (l === 'pt' && Array.isArray(c.glossary)) {
    const lines = c.glossary
      .map(g => `${g.en}: ${g[l]}`)
      .filter(line => !/violonista/i.test(line))
      .join('\n');
    if (lines) {
      prompt += `\nUse these exact PT‑BR terms:\n${lines}`;
    }
  }

  return prompt;
}

/**
 * Truncate a string to a maximum number of words.
 * @param {string} text
 * @param {number} maxWords
 * @returns {string}
 */
export function capWords(text, maxWords) {
  if (!text) return '';
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return words.join(' ');
  return words.slice(0, maxWords).join(' ');
}

/**
 * Validate that a case follows the "fair play" rules.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c) {
  const reasons = [];

  const suspectIds = (c.suspects ?? []).map(s => s.id);

  // Culprit must be among suspects
  if (!suspectIds.includes(c.culprit)) {
    reasons.push('culprit_not_suspect');
  }

  // Every clue must reference a known suspect
  if ((c.clues ?? []).some(cl => !suspectIds.includes(cl.from))) {
    reasons.push('clue_from_unknown');
  }

  // Each clue must implicate the culprit
  const culprit = c.culprit;
  if (Array.isArray(c.clues)) {
    for (const cl of c.clues) {
      // If implicates is defined, it must match the culprit.
      // Undefined or null implicates are considered acceptable (implicitly implicating the culprit).
      if (cl.implicates != null && cl.implicates !== culprit) {
        reasons.push('clue_implicates_invalid');
        break;
      }
    }
  }

  // Every innocent suspect must be cleared by at least one clue
  const innocents = suspectIds.filter(id => id !== culprit);
  for (const innocentId of innocents) {
    const cleared = (c.clues ?? []).some(cl => cl.clears === innocentId);
    if (!cleared) {
      reasons.push('suspect_not_cleared');
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}
<<<END>>>

# Test output
PASS status mock mode
PASS case EN public fields
PASS case PT public fields differ from EN
PASS public index.html contains required ids and attributes
PASS session creation
PASS ask returns answer and counts questions
PASS answer is capped at 80 words
PASS 400 on unknown suspect
PASS 400 on empty question
PASS 400 on over‑500‑char question
PASS 400 on unknown session
PASS mock answer includes clue text when keyword matches (EN)
PASS mock answer includes clue text when keyword matches (PT)
PASS full mock playthrough EN correct accusation
PASS full mock playthrough PT correct accusation
PASS wrong accusation yields score 0
PASS double accuse returns 409
PASS scoreboard persists and ranks correctly
PASS scoreFor matches specification
PASS fairPlay passes on original case
PASS fairPlay fails when culprit not a suspect
FAIL fairPlay fails when a clue does not implicate culprit: should fail implicates
PASS fairPlay fails when innocent never cleared
PASS fairPlay fails when clue.from unknown suspect
PASS each clue ask triggers its text in mock answer (EN)
PASS proxy maps 402 to no_capacity
PASS proxy maps 429 capacity:empty to no_capacity
PASS proxy maps other 429 to rate_limited
PASS proxy maps 401 to bad_key
PASS proxy maps other 5xx to upstream
PASS server returns friendly messages for proxy errors EN
PASS server returns friendly messages for proxy errors PT
PASS systemPrompt EN has no glossary
PASS systemPrompt PT includes glossary and correct term
PASS CLI EN playthrough outputs solution
PASS CLI PT aliases work
35 passed, 1 failed

# Task
Fix the bug(s). Output ONLY the files you change, full content, OR for small changes literal edits in this format: <<<REPLACE path>>> newline, exact old text, newline, =====, newline, new text, newline, <<<END>>> (old text is replaced at every occurrence). Never output content/case.json (it is real data, do not touch).
Spec reminder: tests must follow the spec; if the test is wrong fix the test, if the code is wrong fix the code. Start your reply directly with <<<FILE. No analysis text.
