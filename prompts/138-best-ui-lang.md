# Task (sprint 8): best line follows the UI language, plus a new-best label
Problem: in the Portuguese UI the English record line still reads in English ("Your best in English: ..."), because bestText(lang, entry) picks the wording by the language of the record, not by the language the player is reading.
Change public/best.js:
1. bestText gets a third optional parameter `ui` (default = lang): `export function bestText(lang, entry, ui = lang)`. `lang` is still the language of the record ('en' or 'pt'); `ui` decides the wording. Language names: in EN wording "English" / "Portuguese"; in PT wording "inglês" / "português". Exact outputs:
   - ui 'en': no entry -> `No best score yet in ${name}.`; entry -> `Your best in ${name}: ${score} points with ${q}.` (q = "1 question" or "N questions")
   - ui 'pt': no entry -> `Ainda sem recorde em ${nome}.`; entry -> `Seu recorde em ${nome}: ${score} pontos com ${q}.` (q = "1 pergunta" or "N perguntas")
   So existing calls bestText('en', x) and bestText('pt', x) keep their current output exactly. Update the JSDoc.
2. Add `newBest` to LABELS: en `'New personal best!'`, pt `'Novo recorde pessoal!'`.

Output ONLY literal edit blocks (format: <<<REPLACE public/best.js>>> newline, OLD exactly as in the file, newline, ===== on its own line, newline, NEW, newline, <<<END>>>). Block 1 OLD = the whole bestText JSDoc + function (from `/**` above `@param {'en'|'pt'} lang` with `entry` through its closing `}`). Block 2 OLD = the line `    kept: 'Nothing was reset.'` ; Block 3 OLD = the line `    kept: 'Nada foi apagado.'` (add a comma and the newBest line). No prose, no fences, no em-dashes.

Current bestText block:
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
