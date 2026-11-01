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
