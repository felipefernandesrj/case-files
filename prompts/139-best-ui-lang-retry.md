# Task (sprint 8): rewrite bestText in public/best.js, plus a new-best label
bestText(lang, entry) must get a third parameter `ui` (default lang). `lang` = language of the record, `ui` = language of the wording. Write it exactly like this logic:
- const NAMES = { en: { en: 'English', pt: 'Portuguese' }, pt: { en: 'inglês', pt: 'português' } };
- const u = ui === 'pt' ? 'pt' : 'en'; const name = NAMES[u][lang === 'pt' ? 'pt' : 'en'];
- if u is 'pt': no entry -> `Ainda sem recorde em ${name}.`; else `Seu recorde em ${name}: ${entry.score} pontos com ${q}.` with q "1 pergunta" / "N perguntas".
- if u is 'en': no entry -> `No best score yet in ${name}.`; else `Your best in ${name}: ${entry.score} points with ${q}.` with q "1 question" / "N questions".
Examples: bestText('en', null, 'pt') === "Ainda sem recorde em inglês."; bestText('pt', {score:90,questions:5}, 'en') === "Your best in Portuguese: 90 points with 5 questions."; bestText('pt', null) === "Ainda sem recorde em português.".
One function only, no comments besides the JSDoc (add `@param {'en'|'pt'} [ui]`).
Also add `newBest` to LABELS: en `'New personal best!'`, pt `'Novo recorde pessoal!'`.

Output ONLY 3 literal edit blocks for public/best.js (format: <<<REPLACE public/best.js>>> newline, OLD exactly, newline, ===== on its own line, newline, NEW, newline, <<<END>>>):
1. OLD = the current block below; NEW = the new JSDoc + function.
2. OLD = `    kept: 'Nothing was reset.'` ; NEW = that line with a comma, newline, `    newBest: 'New personal best!'`
3. OLD = `    kept: 'Nada foi apagado.'` ; NEW = that line with a comma, newline, `    newBest: 'Novo recorde pessoal!'`
No prose, no fences, no thinking aloud, no em-dashes.

Current block:
/**
 * @param {'en'|'pt'} lang
 * @param {{score: number, questions: number, at: string}|null} entry
 * @returns {string}
 */
export function bestText(lang, entry) {
  if (lang === 'pt') {
    if (!entry) return "Ainda sem recorde em português.";
    const q = entry.questions === 1 ? "1 pergunta" : `${entry.questions} perguntas`;
    return `Seu recorde em português: ${entry.score} pontos com ${q}.`;
  }
  if (!entry) return "No best score yet in English.";
  const q = entry.questions === 1 ? "1 question" : `${entry.questions} questions`;
  return `Your best in English: ${entry.score} points with ${q}.`;
}
