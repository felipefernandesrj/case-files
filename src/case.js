// Caso em 3 Atos / The Lighthouse Ledger. Text fields are bilingual: { en, pt }.
export const LANGS = ['en', 'pt'];
export const CASE = {
  id: 'lighthouse-ledger',
  title: { en: 'The Lighthouse Ledger', pt: 'O Livro do Farol' },
  intro: {
    en: 'At dawn the harbor ledger was found burned in the lighthouse stove. It recorded who owed the smugglers. Three people had a key to the lighthouse last night.',
    pt: 'Ao amanhecer, o livro-caixa do porto foi encontrado queimado no fogão do farol. Ele registrava quem devia aos contrabandistas. Três pessoas tinham a chave do farol ontem à noite.' },
  culprit: 'marta',
  solution: {
    en: 'Marta, the bookkeeper, burned it: her name was in the ledger. She claims she was home, but the keeper saw a lantern by the stove room at 23:00 and her boots carry lighthouse soot.',
    pt: 'Marta, a contadora, queimou o livro: o nome dela estava nele. Ela diz que estava em casa, mas o faroleiro viu uma lanterna perto do fogão às 23h e as botas dela tinham fuligem do farol.' },
  suspects: [
    { id: 'marta', name: 'Marta Reis', role: { en: 'harbor bookkeeper', pt: 'contadora do porto' },
      persona: { en: 'Calm, precise, slightly defensive.', pt: 'Calma, precisa, um pouco defensiva.' },
      facts: 'You are the culprit. You burned the ledger at 23:00 because it listed your debt. Lie: say you were home all night. If pressed about soot or the lantern, become evasive. Never confess outright.' },
    { id: 'tomas', name: 'Tomás Abreu', role: { en: 'lighthouse keeper', pt: 'faroleiro' },
      persona: { en: 'Gruff, honest, tired.', pt: 'Rabugento, honesto, cansado.' },
      facts: 'Innocent. You were in the lamp room all night. Around 23:00 you saw a lantern moving below, near the stove room. You did not see the face.' },
    { id: 'lia', name: 'Lia Sombra', role: { en: 'fisherwoman', pt: 'pescadora' },
      persona: { en: 'Sarcastic, nervous about the smugglers.', pt: 'Sarcástica, nervosa com os contrabandistas.' },
      facts: "Innocent, but you do owe the smugglers and hated the ledger. You were at the tavern until midnight; the barman can confirm. You noticed Marta's boots were black with soot this morning." }
  ],
  // Fair-play clues: each is obtainable by interrogation (from) and points at a suspect (implicates) or clears one (clears).
  clues: [
    { id: 'lantern', from: 'tomas', implicates: null, ask: 'What did you see at 23:00?' },
    { id: 'soot', from: 'lia', implicates: 'marta', ask: 'Did you notice anything about Marta?' },
    { id: 'false-alibi', from: 'marta', implicates: 'marta', ask: 'Where were you last night?' },
    { id: 'tavern', from: 'lia', clears: 'lia', ask: 'Where were you last night?' },
    { id: 'lamp-room', from: 'tomas', clears: 'tomas', ask: 'Where were you last night?' }
  ]
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
