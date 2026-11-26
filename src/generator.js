import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fairPlay, timelineCheck } from './case.js';
import { fairMinimum } from './budget.js';

export const GEN_MODEL = '@cf/google/gemma-4-26b-a4b-it';
export const MAX_ATTEMPTS = 3;
/** Workers AI price of one neuron in USD (US$ 0.011 per 1,000 neurons). */
export const NEURON_USD = 0.011 / 1000;
/** Spending cap of one generation in USD (M3 sprint 2): no new draft starts if it would likely pass the cap. */
export const DEFAULT_MAX_USD = 0.005;

const GEN_SYSTEM = `You are a detective game generator. Create a complete mystery case in JSON format.
The case must include:
- title and intro (English and Brazilian Portuguese).
- culprit: the ID of one suspect.
- suspects: an array of objects with id (a-z/numbers/hyphens), name, role (en/pt), persona (en/pt), alibi (en/pt), and facts: ONE English string with that suspect's own private truth told to them in 2nd person ("You were in the lounge at 22:00. You lie that..."), including their lie.
- timeline: an array of stops with id, time (HH:MM), stop (en/pt), event (en/pt), who (array of suspect ids). Exactly one stop must have crime: true and include the culprit. "crime" sits on the stop itself, next to "who", never inside "event": { "id": "t3", "time": "22:15", "stop": { "en": "...", "pt": "..." }, "event": { "en": "...", "pt": "..." }, "who": ["the-culprit-id"], "crime": true }.
- clues: an array of objects with id, from (suspect id), ask (English), keywords (lowercase en/pt), implicates (suspect id or null), clears (suspect id or null), and text (en/pt). At least 2 clues must implicate the culprit, and every innocent suspect must be cleared by at least one clue from ANOTHER suspect (a witness), not by their own alibi.
- hints: 2 or 3 objects with id, after (seconds 30-120), and text (en/pt).
- glossary: en/pt terms.
- rooms: 3 to 6 places of the case where the detective can look, each { "id" (a-z/numbers/hyphens), "en", "pt" } with a short place name (not an event).
- solution: en/pt description of how the crime was solved.
- aftermath: an OBJECT keyed by each innocent suspect id (not an array), each value { "en": { "headline", "body" }, "pt": { "headline", "body" } }: the newspaper story when the player wrongly accuses that suspect.
- every clue is a line a suspect says when asked: "from" is the speaker, "ask" is a question to that suspect, "text" is their answer in first person ("I saw...", "Eu vi..."), never narration ("The floor shows...", "You find..."). A suspect never implicates themselves.

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
  timeline_crime_count: 'exactly one timeline stop has the key "crime": true (the stop when the crime happens, with the culprit in "who"); no other stop has it',
  timeline_culprit_absent: 'the crime stop "who" list must include the culprit',
  timeline_out_of_order: 'timeline times must go forward (crossing midnight once is fine)',
  timeline_unknown_suspect: 'every "who" entry must be a suspect id',
  timeline_missing_text: 'every stop needs stop.en, stop.pt, event.en and event.pt',
  missing_hints: 'add 2 or 3 hints with id, after and text en/pt',
  suspect_bad: 'every suspect needs a lowercase id, name, role en/pt and facts',
  rooms_bad: 'add "rooms": 3 to 6 places, each with a lowercase id and short en and pt names',
  clue_self_cleared_only: 'every innocent suspect must be cleared by a clue "from" ANOTHER suspect (a witness who saw them); a suspect clearing themselves does not count',
  hint_names_culprit: 'hints must not contain the culprit name or role; describe a sound, a mark or an object instead and let the player connect it',
  hint_lists_innocents: 'a hint must never list every innocent suspect; at most one hint may point at one witness',
  clue_not_testimony: 'every clue text is spoken by its "from" suspect in first person, in en and pt ("I saw...", "Eu vi..."), never narration or "You find..."',
});

const FIRST_EN = /\b(i|i'm|i've|i'd|i'll|me|my|mine|myself|we|us|our|ours)\b/i;
const FIRST_PT = /(^|[^\p{L}])(eu|me|mim|meu|meus|minha|minhas|comigo|nós|nos|nosso|nossa|nossos|nossas|vi|ouvi|fui|estive|sei|vejo|acho|lembro|tenho|estou|sou|\p{L}{2,}ei)(?![\p{L}])/iu;

const THIRD_EN = /\b(he|she|him|her|his|they|them|their)\b/i;
const THIRD_PT = /(^|[^\p{L}])(ele|ela|eles|elas|dele|dela|deles|delas)(?![\p{L}])/iu;

/**
 * True when a clue reads as testimony (M3 sprint 2: drafts narrated scenes instead): its EN and PT text both speak in
 * first person, or, without "You..." / "Você...", both talk about another person (another suspect's name or a he/she
 * pronoun), as a witness would. A scene told with no person in it ("The floor shows...") is narration.
 * @param {Object} clue
 * @param {Object} [c] the case, for the suspect names
 */
/** Pre-launch QA (82 bot games): both generated cases gave the culprit away in the 45 s hint.
 * 'hint_names_culprit' when a hint (en or pt) has the culprit's name or a 5+ letter word of the culprit's role;
 * 'hint_lists_innocents' when one hint names every innocent suspect; else null. */
export function hintLeak(c) {
  const suspects = Array.isArray(c && c.suspects) ? c.suspects : [];
  const hints = Array.isArray(c && c.hints) ? c.hints : [];
  const names = (s) => [...new Set((typeof s.name === 'object' && s.name ? Object.values(s.name) : [s.name]).filter((n) => typeof n === 'string' && n.trim()).map((n) => n.trim().toLowerCase()))];
  const words = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').split(/[^a-z0-9]+/).filter(Boolean);
  const has = (text, phrase) => { const w = words(text).join(' '); const p = words(phrase).join(' '); return !!p && (' ' + w + ' ').includes(' ' + p + ' '); };
  const culprit = suspects.find((s) => s && s.id === c.culprit);
  const innocents = suspects.filter((s) => s && s.id !== c.culprit);
  for (const h of hints) {
    const texts = h && typeof h.text === 'object' && h.text ? Object.values(h.text) : [h && h.text];
    for (const t of texts) {
      if (typeof t !== 'string') continue;
      if (culprit) {
        if (names(culprit).some((n) => has(t, n) || has(t, n.split(/\s+/)[0]))) return 'hint_names_culprit';
        // the role noun only (EN last word, PT first word): 'Lead Dancer' -> dancer, 'Passista Principal' -> passista; 'dining car' stays a place
        const roleWords = [words(culprit.role && culprit.role.en).at(-1), words(culprit.role && culprit.role.pt)[0]].filter((w) => w && w.length >= 5);
        const tw = words(t);
        if (roleWords.some((rw) => tw.some((w) => w === rw || w === rw + 's'))) return 'hint_names_culprit';
      }
      if (innocents.length && innocents.every((s) => names(s).some((n) => has(t, n.split(/\s+/)[0])))) return 'hint_lists_innocents';
    }
  }
  return null;
}

export function isTestimony(clue, c) {
  const en = clue?.text?.en, pt = clue?.text?.pt;
  if (typeof en !== 'string' || typeof pt !== 'string') return false;
  if (FIRST_EN.test(en) && FIRST_PT.test(pt)) return true;
  if (/^\s*you\b/i.test(en) || /^\s*voc[eê]\b/i.test(pt)) return false;
  const others = (Array.isArray(c?.suspects) ? c.suspects : []).filter((s) => s && s.id !== clue.from).flatMap((s) => String(s.name || '').split(/\s+/)).filter((w) => w.length >= 3);
  const self = (Array.isArray(c?.suspects) ? c.suspects : []).filter((s) => s && s.id === clue.from).flatMap((s) => String(s.name || '').split(/\s+/)).filter((w) => w.length >= 3);
  if (self.some((w) => en.includes(w)) && !others.some((w) => en.includes(w))) return false;
  return others.some((w) => en.includes(w) && pt.includes(w)) || (THIRD_EN.test(en) && THIRD_PT.test(pt));
}

/** USD of one model answer: from its neurons, else from its tokens at gemma's output price (an upper bound). */
export function usageUsd(usage) {
  if (!usage) return 0;
  if (Number.isFinite(usage.neurons)) return usage.neurons * NEURON_USD;
  return ((Number(usage.prompt_tokens) || 0) + (Number(usage.completion_tokens) || 0)) * 0.3 / 1e6;
}

export function genMessages(seed, { suspects = 4, reasons = [], previous = '' } = {}) {
  const why = reasons.map((r) => `- ${r}: ${REASON_HINTS[r] || 'fix this check'}`).join('\n');
  const fix = `The previous draft failed these checks: ${reasons.join(', ')}. Fix every one and send the whole case again.\n${why}`;
  // M3 sprint 2: with the previous draft in the chat the model repairs it instead of writing a new case with new mistakes
  if (reasons.length && typeof previous === 'string' && previous.trim()) {
    return [
      { role: 'system', content: GEN_SYSTEM },
      { role: 'user', content: `Seed: ${seed}\nSuspects: ${suspects}` },
      { role: 'assistant', content: previous.slice(0, 24000) },
      { role: 'user', content: `${fix}\nKeep everything that already passes (the rooms, the one timeline stop with "crime": true, the aftermath); change only what these checks need.` }
    ];
  }
  const userContent = `Seed: ${seed}\nSuspects: ${suspects}${reasons.length ? `\n${fix}` : ''}`;
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
/**
 * Repair two shapes the model keeps writing before the gate sees a draft (M3 sprint 2, live drafts): "crime": true
 * nested inside a stop's event or stop text is lifted onto the stop, and facts written as { en, pt } become the EN string.
 * @param {Object} c a parsed draft (changed in place and returned)
 */
export function normalizeDraft(c) {
  if (!c || typeof c !== 'object' || Array.isArray(c)) return c;
  for (const t of Array.isArray(c.timeline) ? c.timeline : []) {
    if (!t || typeof t !== 'object') continue;
    for (const k of ['event', 'stop']) {
      if (t[k] && typeof t[k] === 'object' && 'crime' in t[k]) {
        if (t.crime === undefined && t[k].crime === true) t.crime = true;
        delete t[k].crime;
      }
    }
  }
  for (const s of Array.isArray(c.suspects) ? c.suspects : []) {
    if (s && s.facts && typeof s.facts === 'object' && typeof s.facts.en === 'string') s.facts = s.facts.en;
  }
  return c;
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
      if (!s.name || !s.role?.en || !s.role?.pt || typeof s.facts !== 'string' || !s.facts.trim()) {
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
  // M3 sprint 2: a generated case needs its own rooms, and clue texts are lines a suspect says
  const rooms = Array.isArray(c.rooms) ? c.rooms : [];
  const roomIds = new Set(rooms.map((r) => r && r.id));
  if (rooms.length < 3 || rooms.length > 6 || roomIds.size !== rooms.length || rooms.some((r) => !r || typeof r.id !== 'string' || !/^[a-z][a-z0-9-]*$/.test(r.id) || typeof r.en !== 'string' || !r.en.trim() || typeof r.pt !== 'string' || !r.pt.trim())) reasons.push('rooms_bad');
  if ((Array.isArray(c.clues) ? c.clues : []).some((cl) => cl && cl.text && !isTestimony(cl, c))) reasons.push('clue_not_testimony');
  // live drafts 6 and 7: innocents cleared only by their own alibi; a witness has to clear them
  const clearedBy = (id) => (Array.isArray(c.clues) ? c.clues : []).filter((cl) => cl && cl.clears === id);
  if (ids.filter((id) => id !== c.culprit).some((id) => clearedBy(id).length && !clearedBy(id).some((cl) => cl.from !== id))) reasons.push('clue_self_cleared_only');

  // pre-launch QA: a hint may not name the culprit or the culprit's role, and may not name every innocent suspect
  const leak = hintLeak(c);
  if (leak) reasons.push(leak);
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

export function finishCase(c, seed, model, attempts = []) {
  const usd = attempts.reduce((a, t) => a + usageUsd(t.usage), 0);
  return {
    ...c,
    id: `case-gen-${slugSeed(seed)}`,
    questionBudget: 2 * fairMinimum(c),
    generated: { seed: String(seed), model, cost: { usd: Math.round(usd * 1e6) / 1e6, drafts: attempts.length, receipts: attempts.map((t) => t.receipt).filter(Boolean) } }
  };
}

export async function generateCase(seed, { key, baseUrl = 'https://qa-api.fullcup.ai/v1', fetchImpl = fetch, model = GEN_MODEL, suspects = 4, maxAttempts = MAX_ATTEMPTS, maxTokens = 8000, maxUsd = DEFAULT_MAX_USD } = {}) {
  const attempts = [];
  let currentReasons = [];
  let previous = '';
  let spentUsd = 0;
  const round = (v) => Math.round(v * 1e6) / 1e6;

  for (let n = 1; n <= maxAttempts; n++) {
    // M3 sprint 2: stop before a draft that would likely pass the cap (estimate: the average draft so far)
    const nextUsd = n === 1 ? 0 : spentUsd / (n - 1);
    if (!(maxUsd > 0) || (n > 1 && spentUsd + nextUsd > maxUsd)) {
      return { ok: false, case: null, attempts, reasons: [...currentReasons, 'cost_cap'], spentUsd: round(spentUsd) };
    }
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
          messages: genMessages(seed, { suspects, reasons: currentReasons, previous }),
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
      
      const parsed = normalizeDraft(extractJson(content));
      const validation = parsed ? validateCase(parsed, { suspects }) : { ok: false, reasons: ['not_json'] };
      
      currentReasons = validation.reasons;
      previous = content;
      attempts.push({ n, status: response.status, usage, receipt, ok: validation.ok, reasons: validation.reasons });
      spentUsd += usageUsd(usage);

      if (validation.ok) {
        return { ok: true, case: finishCase(parsed, seed, model, attempts), attempts, spentUsd: round(spentUsd) };
      }
    } catch (e) {
      if (e.status !== undefined && e.code !== undefined) throw e;
      
      const err = new Error(e.message);
      err.code = 'network';
      err.attempts = [...attempts, { n, status: 0, usage: null, receipt: null, ok: false, reasons: ['network'] }];
      throw err;
    }
  }

  return { ok: false, case: null, attempts, reasons: currentReasons, spentUsd: round(spentUsd) };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const args = process.argv.slice(2);
  const getIdx = (flag) => args.indexOf(flag);
  
  const seedIdx = getIdx('--seed');
  if (seedIdx === -1 || !args[seedIdx + 1]) {
    process.stderr.write('Usage: node src/generator.js --seed "<text>" [--suspects 4] [--max-usd 0.005] [--out file]\n');
    process.exit(2);
  }

  const seed = args[seedIdx + 1];
  const si = args.indexOf('--suspects');
  const suspects = si !== -1 ? Number(args[si + 1]) : 4;
  const outIdx = getIdx('--out');
  const outPath = outIdx !== -1 ? args[outIdx + 1] : `content/generated/gen-${slugSeed(seed)}.json`;
  const mi = args.indexOf('--max-usd');
  const maxUsd = mi !== -1 ? Number(args[mi + 1]) : DEFAULT_MAX_USD;

  let key = process.env.FULLCUP_KEY;
  if (!key) {
    const keyFile = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '.fullcup-key');
    if (fs.existsSync(keyFile)) key = fs.readFileSync(keyFile, 'utf8').trim();
  }

  const baseUrl = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';

  (async () => {
    try {
      const result = await generateCase(seed, { key, baseUrl, suspects, maxUsd });
      if (result.ok) {
        if (!fs.existsSync(path.dirname(outPath))) fs.mkdirSync(path.dirname(outPath), { recursive: true });
        fs.writeFileSync(outPath, JSON.stringify(result.case, null, 2) + '\n');
        console.log(JSON.stringify({ ok: true, out: outPath, attempts: result.attempts, reasons: [], spentUsd: result.spentUsd }, null, 1));
        process.exit(0);
      } else {
        console.log(JSON.stringify({ ok: false, out: null, attempts: result.attempts, reasons: result.reasons, spentUsd: result.spentUsd }, null, 1));
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
