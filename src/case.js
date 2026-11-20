import { readFileSync, readdirSync, existsSync } from 'node:fs';
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

/** One line for people: names the unknown case id and lists the valid ids. */
export function unknownCaseLine(id) {
  return `Unknown case "${String(id)}". Valid case ids: ${Object.keys(CASES).join(', ')}.`;
}

/** Folder of generated cases (M3 sprint 2): src/generator.js writes gen-<seed>.json here. */
export const GENERATED_DIR = 'content/generated';

/**
 * Generated cases in a folder: id -> case file, for every gen-<seed>.json, sorted by id.
 * @param {string} [dir=GENERATED_DIR] folder relative to the project root
 * @returns {Object<string,string>}
 */
export function generatedCases(dir = GENERATED_DIR) {
  const abs = resolve(dirname(fileURLToPath(import.meta.url)), '..', dir);
  if (!existsSync(abs)) return {};
  const out = {};
  for (const f of readdirSync(abs).sort()) {
    const m = /^(gen-[a-z0-9-]+)\.json$/.exec(f);
    if (m) out[m[1]] = `${dir}/${f}`;
  }
  return out;
}

/** Known cases: id -> case file (relative to the project root). The two handmade cases first, then every generated case. */
export const CASES = Object.freeze({ violin: 'content/case.json', 'night-train': 'content/cases/night-train.json', ...generatedCases() });

/**
 * Resolve a case id to its case file.
 * @param {string} id
 * @returns {string}
 * @throws {Error} code 'unknown_case' for an id not in CASES
 */
export function caseFileFor(id) {
  if (typeof id === 'string' && Object.prototype.hasOwnProperty.call(CASES, id)) {
    return CASES[id];
  }
  const err = new Error(`unknown case: ${String(id)} (known: ${Object.keys(CASES).join(', ')})`);
  err.code = 'unknown_case';
  throw err;
}

/**
 * Return a public version of the case (no secrets).
 * @param {Object} c
 * @param {'en'|'pt'} lang
 * @returns {Object}
 */
/** Rooms shown in the web player (public labels only). */
export const ROOMS = Object.freeze({
  violin: Object.freeze([
    { id: 'academy-exterior', en: 'Aurora Music Academy', pt: 'Academia de Música Aurora' },
    { id: 'instrument-room', en: 'Instrument room', pt: 'Sala de instrumentos' },
    { id: 'rehearsal-hall', en: 'Rehearsal hall', pt: 'Sala de ensaio' },
    { id: 'hallway', en: 'Hallway', pt: 'Corredor' },
  ]),
  'night-train': Object.freeze([
    { id: 'exterior', en: 'The Southern Star', pt: 'O Southern Star' },
    { id: 'luggage-safe', en: 'Luggage car', pt: 'Vagão de bagagem' },
    { id: 'dining-kitchen', en: 'Dining car kitchen', pt: 'Cozinha do vagão-restaurante' },
    { id: 'sleeper-corridor', en: 'Sleeper corridor', pt: 'Corredor das cabines-leito' },
    { id: 'tunnel', en: 'Black Ridge Tunnel', pt: 'Túnel Black Ridge' },
    { id: 'port-elling', en: 'Port Elling', pt: 'Port Elling' },
  ]),
});

/** Engine file key for a loaded case object. */
export function fileKeyOf(c) {
  if (c?.id === 'case-violin-001') return 'violin';
  if (c?.id === 'case-night-train-002') return 'night-train';
  const g = /^case-(gen-[a-z0-9-]+)$/.exec(c?.id || '');
  if (g) return g[1];
  return 'violin';
}

/** Rooms of a loaded case: the handmade list for its file, else the rooms the generator wrote ({ id, en, pt }). */
export function roomsOf(c, file = fileKeyOf(c)) {
  if (ROOMS[file]) return ROOMS[file];
  return (Array.isArray(c?.rooms) ? c.rooms : []).filter(r => r && typeof r.id === 'string' && /^[a-z][a-z0-9-]*$/.test(r.id));
}

/** Public pack list for the case picker (titles and hooks only). */
export function listPack(lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  return Object.entries(CASES).map(([id, file]) => {
    const c = loadCase(file);
    const intro = c.intro?.[l] ?? '';
    const hook = intro.split(/(?<=[.?!])\s/)[0] || intro;
    const item = { id, title: c.title?.[l] ?? '', hook, generated: Boolean(c.generated) };
    if (c.generated) item.cost = { usd: Number(c.generated.cost?.usd) || 0, drafts: Number(c.generated.cost?.drafts) || 0 };
    return item;
  });
}

export function publicCase(c, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  const file = fileKeyOf(c);
  const rooms = roomsOf(c, file).map(r => ({ id: r.id, name: r[l] ?? '' }));
  const timeline = Array.isArray(c.timeline)
    ? c.timeline.map(t => ({
        id: t.id,
        time: t.time,
        stop: t.stop?.[l] ?? '',
        event: t.event?.[l] ?? '',
      }))
    : [];
  return {
    id: c.id,
    file,
    title: c.title?.[l] ?? '',
    intro: c.intro?.[l] ?? '',
    suspects: (c.suspects ?? []).map(s => ({
      id: s.id,
      name: s.name,
      role: s.role?.[l] ?? '',
      persona: s.persona?.[l] ?? '',
    })),
    rooms,
    timeline,
    hints: Array.isArray(c.hints) ? c.hints.map(h => ({ id: h.id, after: h.after, text: h.text?.[l] ?? '' })) : [],
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

  // 1. Private facts
  if (suspect.facts) {
    prompt += `\n\nYour private facts (fixed, never contradict them):\n${suspect.facts}`;
  }

  // 2. Clues
  const myClues = (c.clues ?? []).filter(cl => cl.from === suspectId);
  if (myClues.length > 0) {
    prompt += `\n\nThings you know and say when asked about them:`;
    for (const cl of myClues) {
      prompt += `\n- ${cl.text?.[l] ?? ''}`;
    }
  }

  // 3. Cast
  prompt += `\n\nThe only people in this case are:`;
  for (const s of (c.suspects ?? [])) {
    prompt += `\n- ${s.name} (${s.role?.[l] ?? ''})`;
  }
  prompt += `\nNever invent or name any other person (no other staff, guests, witnesses or relatives by name). If asked about someone else, say you only know these people.`;

  // 4. Consistency rules
  prompt += `\n\nStay consistent with everything you said earlier in this conversation and with your private facts. Do not change your story between questions. You may lie only where your facts say you lie or hide something.`;

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

  prompt += `\n\nRespond in character. Use at most 3 short sentences and stay under 60 words. Never reveal you are an AI. Respond in ${l === 'pt' ? 'Portuguese' : 'English'}.`;

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
  return words.slice(0, maxWords).join(' ') + '…';
}

/**
 * Validate that a case follows the "fair play" rules.
 * @param {Object} c
 * @param {{suspects?: number}} [opts] expected suspect count (default 3)
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function fairPlay(c, { suspects = 3 } = {}) {
  const reasons = [];

  const suspectIds = (c.suspects ?? []).map(s => s.id);

  // Exactly `suspects` suspects (3 by default)
  if (suspectIds.length !== suspects) {
    reasons.push('wrong_suspect_count');
  }

  // Culprit must be a known suspect
  if (!suspectIds.includes(c.culprit)) {
    reasons.push('culprit_not_suspect');
  }

  // Validate each clue
  const clues = c.clues ?? [];
  let implicateCount = 0;
  for (const cl of clues) {
    // clue.from must be a known suspect
    if (!suspectIds.includes(cl.from)) {
      reasons.push('clue_from_unknown');
    }

    // ask must be non‑empty string
    if (!cl.ask || typeof cl.ask !== 'string' || !cl.ask.trim()) {
      reasons.push('clue_missing_ask');
    }

    // keywords must be a non‑empty array of non‑empty strings
    if (
      !Array.isArray(cl.keywords) ||
      cl.keywords.length === 0 ||
      cl.keywords.some(k => typeof k !== 'string' || !k.trim())
    ) {
      reasons.push('clue_invalid_keywords');
    }

    // text.en and text.pt must be non‑empty strings
    if (!cl.text || typeof cl.text.en !== 'string' || !cl.text.en.trim()) {
      reasons.push('clue_missing_text_en');
    }
    if (!cl.text || typeof cl.text.pt !== 'string' || !cl.text.pt.trim()) {
      reasons.push('clue_missing_text_pt');
    }

    // implicates: if non‑null must be a known suspect; count those equal to culprit
    if (cl.implicates != null) {
      if (!suspectIds.includes(cl.implicates)) {
        reasons.push('clue_implicates_invalid');
      } else if (cl.implicates === c.culprit) {
        implicateCount++;
      }
    }

    // clears: if non‑null must be a known suspect
    if (cl.clears != null && !suspectIds.includes(cl.clears)) {
      reasons.push('clue_clears_invalid');
    }
  }

  // At least two clues must implicate the culprit
  if (implicateCount < 2) {
    reasons.push('not_enough_implicates');
  }

  // Every innocent suspect must be cleared by at least one clue
  const innocents = suspectIds.filter(id => id !== c.culprit);
  for (const innocentId of innocents) {
    const cleared = clues.some(cl => cl.clears === innocentId);
    if (!cleared) {
      reasons.push('suspect_not_cleared');
      break;
    }
  }

  return { ok: reasons.length === 0, reasons };
}

/**
 * Validate a case timeline: stops in time order (the night may cross midnight once), EN and PT text, known suspects, one crime stop with the culprit.
 * @param {Object} c
 * @returns {{ok:boolean, reasons:string[]}}
 */
export function timelineCheck(c) {
  if (!Array.isArray(c.timeline) || c.timeline.length === 0) {
    return { ok: false, reasons: ['timeline_missing'] };
  }

  const reasons = new Set();
  const stopIds = new Set();
  const suspectIds = new Set((c.suspects ?? []).map(s => s.id));
  let crimeCount = 0;
  let crimeStop = null;

  const timeToMins = (t) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  let lastMins = -1;
  let offset = 0;

  for (const stop of c.timeline) {
    if (!stop.id || typeof stop.id !== 'string' || stopIds.has(stop.id)) {
      reasons.add('timeline_bad_id');
    }
    stopIds.add(stop.id);

    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.time)) {
      reasons.add('timeline_bad_time');
    } else {
      let currentMins = timeToMins(stop.time) + offset;
      if (lastMins !== -1 && currentMins < lastMins && offset === 0) {
        offset = 1440;
        currentMins += 1440;
      }
      if (lastMins !== -1 && currentMins <= lastMins) {
        reasons.add('timeline_out_of_order');
      }
      lastMins = currentMins;
    }

    const filled = (v) => typeof v === 'string' && v.trim() !== '';
    if (!filled(stop.stop?.en) || !filled(stop.stop?.pt) || !filled(stop.event?.en) || !filled(stop.event?.pt)) {
      reasons.add('timeline_missing_text');
    }

    if (!Array.isArray(stop.who) || stop.who.length === 0 || !stop.who.every(id => suspectIds.has(id))) {
      reasons.add('timeline_unknown_suspect');
    }

    if (stop.crime) {
      crimeCount++;
      crimeStop = stop;
    }
  }

  if (crimeCount !== 1) {
    reasons.add('timeline_crime_count');
  } else if (!Array.isArray(crimeStop.who) || !crimeStop.who.includes(c.culprit)) {
    reasons.add('timeline_culprit_absent');
  }

  return { ok: reasons.size === 0, reasons: [...reasons] };
}
