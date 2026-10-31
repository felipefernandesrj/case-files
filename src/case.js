import fs from 'node:fs';
// Caso em 3 Atos / The Lighthouse Ledger. Text fields are bilingual: { en, pt }.
export const LANGS = ['en', 'pt'];
// Story, personas, secrets, clues and solution are authored by the Cup key (tools/generate-case.mjs + tools/revise-case.mjs).
const G = JSON.parse(fs.readFileSync(new URL('./case.generated.json', import.meta.url), 'utf8'));
const FIXED = [
  { id: 'marta', name: 'Marta Reis', role: { en: 'harbor bookkeeper', pt: 'contadora do porto' } },
  { id: 'tomas', name: 'Tomás Abreu', role: { en: 'lighthouse keeper', pt: 'faroleiro' } },
  { id: 'lia', name: 'Lia Sombra', role: { en: 'fisherwoman', pt: 'pescadora' } }];
export const CASE = {
  id: 'lighthouse-ledger', generatedBy: G.generatedBy,
  title: { en: 'The Lighthouse Ledger', pt: 'O Livro do Farol' },
  intro: G.intro, culprit: 'marta', solution: G.solution,
  suspects: FIXED.map(f => { const g = G.suspects.find(s => s.id === f.id); return { ...f, persona: g.persona, facts: g.facts }; }),
  clues: G.clues
};
export const L = (v, lang) => (v && typeof v === 'object' ? v[lang] || v.en : v);
export const publicCase = (lang = 'en') => ({ id: CASE.id, lang, title: L(CASE.title, lang), intro: L(CASE.intro, lang),
  suspects: CASE.suspects.map(s => ({ id: s.id, name: s.name, role: L(s.role, lang), persona: L(s.persona, lang) })) });

// Fair-play check: the culprit must be provable from clues alone.
export function fairPlay(c = CASE) {
  const errors = [], ids = c.suspects.map(s => s.id);
  if (!ids.includes(c.culprit)) errors.push('culprit not a suspect');
  const against = c.clues.filter(k => k.implicates === c.culprit).length;
  if (against < 2) errors.push('fewer than 2 clues implicate the culprit');
  for (const id of ids) if (id !== c.culprit && !c.clues.some(k => k.clears === id) ) errors.push(`innocent ${id} is never cleared`);
  if (c.clues.some(k => k.implicates && k.implicates !== c.culprit)) errors.push('a clue implicates an innocent');
  for (const k of c.clues) if (!ids.includes(k.from)) errors.push(`clue ${k.id} has no source`);
  for (const lang of ['en', 'pt']) for (const f of ['title', 'intro', 'solution']) if (!c[f]?.[lang]) errors.push(`missing ${f}.${lang}`);
  return { ok: errors.length === 0, errors };
}
