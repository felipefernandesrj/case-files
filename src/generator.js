import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fairPlay, timelineCheck } from './case.js';
import { fairMinimum } from './budget.js';

export const GEN_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const MAX_ATTEMPTS = 3;

const GEN_SYSTEM = `You are a detective game generator. Create a complete mystery case in JSON format.
The case must include:
- title and intro (English and Brazilian Portuguese).
- culprit: the ID of one suspect.
- suspects: an array of objects with id (a-z/numbers/hyphens), name, role (en/pt), persona (en/pt), alibi (en/pt), and facts (English, 2nd person "You are...", including their lie).
- timeline: an array of stops with id, time (HH:MM), stop (en/pt), event (en/pt), who (array of suspect ids). Exactly one stop must have crime: true and include the culprit.
- clues: an array of objects with id, from (suspect id), ask (English), keywords (lowercase en/pt), implicates (suspect id or null), clears (suspect id or null), and text (en/pt). At least 2 clues must implicate the culprit, and every innocent suspect must be cleared by at least one clue.
- hints: 2 or 3 objects with id, after (seconds 30-120), and text (en/pt).
- glossary: en/pt terms.
- solution: en/pt description of how the crime was solved.
- aftermath: an OBJECT keyed by each innocent suspect id (not an array), each value { "en": { "headline", "body" }, "pt": { "headline", "body" } }: the newspaper story when the player wrongly accuses that suspect.
- every clue is a line a suspect says when asked: "from" is the speaker, "ask" is a question to that suspect, "text" is their answer in first person. A suspect never implicates themselves.

The mystery must be solvable only from the clues.
Answer with ONE JSON object only, no markdown, no prose.
Portuguese is Brazilian Portuguese.`;

export function slugSeed(seed) {
  let s = String(seed).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  s = s.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s === '') return 'case';
  return s.slice(0, 40).replace(/-+$/, '');
}

/** One plain-English fix per check code, sent back to the model on a retry (M3 sprint 1). */
export const REASON_HINTS = Object.freeze({
  not_json: 'answer with one JSON object only, nothing before or after it',
  wrong_suspect_count: 'use exactly the number of suspects asked for',
  culprit_not_suspect: 'culprit must be the id of one of the suspects',
  not_enough_implicates: 'at least two clues must have implicates set to the culprit id',
  suspect_not_cleared: 'every innocent suspect id must appear as "clears" in at least one clue',
  clue_self_implicates: 'a clue whose "implicates" is X must come "from" a different suspect than X; the culprit never accuses herself, other suspects point at her',
  aftermath_bad: 'aftermath must be an object keyed by every innocent suspect id, each with en and pt objects holding headline and body',
  culprit_cleared: 'no clue may have "clears" set to the culprit id; clues only clear innocent suspects',
  timeline_crime_count: 'exactly one timeline stop has "crime": true',
  timeline_culprit_absent: 'the crime stop "who" list must include the culprit',
  timeline_out_of_order: 'timeline times must go forward (crossing midnight once is fine)',
  timeline_unknown_suspect: 'every "who" entry must be a suspect id',
  timeline_missing_text: 'every stop needs stop.en, stop.pt, event.en and event.pt',
  missing_hints: 'add 2 or 3 hints with id, after and text en/pt',
  suspect_bad: 'every suspect needs a lowercase id, name, role en/pt and facts',
});

export function genMessages(seed, { suspects = 4, reasons = [] } = {}) {
  const why = reasons.map((r) => `- ${r}: ${REASON_HINTS[r] || 'fix this check'}`).join('\n');
  const userContent = `Seed: ${seed}\nSuspects: ${suspects}${reasons.length ? `\nThe previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.\n${why}` : ''}`;
  return [
    { role: 'system', content: GEN_SYSTEM },
    { role: 'user', content: userContent }
  ];
}

export function extractJson(text) {
  if (typeof text !== 'string') return null;
  let clean = text.replace(/```json\n?|```/g, '').trim();
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
  try {
    return JSON.parse(clean.substring(firstBrace, lastBrace + 1));
  } catch {
    return null;
  }
}

export function shapeCheck(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { ok: false, reasons: ['not_object'] };
  const reasons = [];
  if (!c.title?.en || !c.title?.pt) reasons.push('missing_title');
  if (!c.intro?.en || !c.intro?.pt) reasons.push('missing_intro');
  if (!c.solution?.en || !c.solution?.pt) reasons.push('missing_solution');
  
  if (Array.isArray(c.suspects)) {
    const ids = new Set();
    for (const s of c.suspects) {
      if (!s.id || !/^[a-z][a-z0-9-]*$/.test(s.id)) {
        reasons.push('suspect_bad');
        break;
      }
      if (ids.has(s.id)) {
        reasons.push('duplicate_suspect_id');
        break;
      }
      ids.add(s.id);
      if (!s.name || !s.role?.en || !s.role?.pt || !s.facts) {
        reasons.push('suspect_bad');
        break;
      }
    }
  } else {
    reasons.push('suspect_bad');
  }

  if (!Array.isArray(c.hints) || c.hints.length === 0) reasons.push('missing_hints');
  // M3 sprint 1: the first live case passed fairPlay with an array aftermath and a self-implicating clue
  const ids = Array.isArray(c.suspects) ? c.suspects.map((s) => s && s.id) : [];
  const am = c.aftermath;
  const story = (v) => v && typeof v.headline === 'string' && v.headline.trim() && typeof v.body === 'string' && v.body.trim();
  if (!am || typeof am !== 'object' || Array.isArray(am) || ids.filter((id) => id !== c.culprit).some((id) => !am[id] || !story(am[id].en) || !story(am[id].pt))) reasons.push('aftermath_bad');
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.implicates != null && cl.from === cl.implicates)) reasons.push('clue_self_implicates');
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.clears != null && cl.clears === c.culprit)) reasons.push('culprit_cleared');

  return { ok: reasons.length === 0, reasons };
}

export function validateCase(c, { suspects = 4 } = {}) {
  const shape = shapeCheck(c);
  if (!shape.ok) return shape;

  const reasons = new Set();
  
  try {
    const fp = fairPlay(c, { suspects });
    if (!fp.ok) fp.reasons.forEach(r => reasons.add(r));
  } catch (e) {
    reasons.add('check_crashed');
  }

  try {
    const tc = timelineCheck(c);
    if (!tc.ok) tc.reasons.forEach(r => reasons.add(r));
  } catch (e) {
    reasons.add('check_crashed');
  }

  return { ok: reasons.size === 0, reasons: Array.from(reasons) };
}

export function finishCase(c, seed, model) {
  return {
    ...c,
    id: `case-gen-${slugSeed(seed)}`,
    questionBudget: 2 * fairMinimum(c),
    generated: { seed: String(seed), model }
  };
}

export async function generateCase(seed, { key, baseUrl = 'https://qa-api.fullcup.ai/v1', fetchImpl = fetch, model = GEN_MODEL, suspects = 4, maxAttempts = MAX_ATTEMPTS, maxTokens = 8000 } = {}) {
  const attempts = [];
  let currentReasons = [];

  for (let n = 1; n <= maxAttempts; n++) {
    try {
      const url = baseUrl.endsWith('/') ? `${baseUrl}chat/completions` : `${baseUrl}/chat/completions`;
      const response = await fetchImpl(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'X-FullCup-Workload': 'case-files:generate'
        },
        body: JSON.stringify({
          model,
          messages: genMessages(seed, { suspects, reasons: currentReasons }),
          max_tokens: maxTokens,
          chat_template_kwargs: { enable_thinking: false }
        })
      });

      if (!response.ok) {
        const err = new Error('generation request failed');
        err.status = response.status;
        
        let bodyText = '';
        try { bodyText = await response.text(); } catch {}

        if (response.status === 401 || response.status === 403) err.code = 'bad_key';
        else if (response.status === 402 || (response.status === 429 && bodyText.includes('capacity:empty'))) err.code = 'no_capacity';
        else if (response.status === 429) err.code = 'rate_limited';
        else err.code = 'upstream';
        
        err.attempts = [...attempts, { n, status: response.status, usage: null, receipt: null, ok: false, reasons: [err.code] }];
        throw err;
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';
      const usage = data.usage || null;
      const receipt = response.headers.get('x-fullcup-receipt-id') || null;
      
      const parsed = extractJson(content);
      const validation = parsed ? validateCase(parsed, { suspects }) : { ok: false, reasons: ['not_json'] };
      
      currentReasons = validation.reasons;
      attempts.push({ n, status: response.status, usage, receipt, ok: validation.ok, reasons: validation.reasons });

      if (validation.ok) {
        return { ok: true, case: finishCase(parsed, seed, model), attempts };
      }
    } catch (e) {
      if (e.status !== undefined && e.code !== undefined) throw e;
      
      const err = new Error(e.message);
      err.code = 'network';
      err.attempts = [...attempts, { n, status: 0, usage: null, receipt: null, ok: false, reasons: ['network'] }];
      throw err;
    }
  }

  return { ok: false, case: null, attempts, reasons: currentReasons };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const getIdx = (flag) => args.indexOf(flag);
  
  const seedIdx = getIdx('--seed');
  if (seedIdx === -1 || !args[seedIdx + 1]) {
    process.stderr.write('Usage: node src/generator.js --seed "<text>" [--suspects 4] [--out file]\n');
    process.exit(2);
  }

  const seed = args[seedIdx + 1];
  const si = args.indexOf('--suspects');
  const suspects = si !== -1 ? Number(args[si + 1]) : 4;
  const outIdx = getIdx('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : `content/cases/gen-${slugSeed(seed)}.json`;

  let key = process.env.FULLCUP_KEY;
  if (!key) {
    const keyFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.fullcup-key');
    if (fs.existsSync(keyFile)) key = fs.readFileSync(keyFile, 'utf8').trim();
  }

  const baseUrl = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';

  (async () => {
    try {
      const result = await generateCase(seed, { key, baseUrl, suspects });
      if (result.ok) {
        if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(result.case, null, 2) + '\n');
        console.log(JSON.stringify({ ok: true, out: outPath, attempts: result.attempts, reasons: [] }, null, 1));
        process.exit(0);
      } else {
        console.log(JSON.stringify({ ok: false, out: null, attempts: result.attempts, reasons: result.reasons }, null, 1));
        process.exit(1);
      }
    } catch (e) {
      const errObj = {
        ok: false,
        code: e.code || 'error',
        status: e.status || 500,
        attempts: e.attempts || []
      };
      console.log(JSON.stringify(errObj, null, 1));
      process.exit(1);
    }
  })();
}
