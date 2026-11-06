/** @type {string} */
export const BEST_KEY = 'casefiles:best:v1';

/**
 * @param {Storage} storage
 * @returns {{ en: {score: number, questions: number, at: string}|null, pt: {score: number, questions: number, at: string}|null }}
 */
export function readBest(storage) {
  const result = { en: null, pt: null };
  try {
    if (!storage) return result;
    const raw = storage.getItem(BEST_KEY);
    if (!raw) return result;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return result;

    for (const lang of ['en', 'pt']) {
      const entry = data[lang];
      if (entry && typeof entry.score === 'number' && typeof entry.questions === 'number' && typeof entry.at === 'string') {
        result[lang] = entry;
      }
    }
  } catch (e) {
    // Never throws
  }
  return result;
}

/**
 * @param {Storage} storage
 * @param {string} lang
 * @param {{score: number, questions: number, correct: boolean}} result
 * @param {string} [now]
 * @returns {{best: {score: number, questions: number, at: string}|null, isNew: boolean}}
 */
export function recordResult(storage, lang, { score, questions, correct }, now = new Date().toISOString()) {
  const targetLang = lang === 'pt' ? 'pt' : 'en';
  const all = readBest(storage);

  let isNew = false;
  let bestEntry = all[targetLang];

  if (correct) {
    const currentBest = all[targetLang];
    const isBetter = !currentBest || 
      score > currentBest.score || 
      (score === currentBest.score && questions < currentBest.questions);

    if (isBetter) {
      bestEntry = { score, questions, at: now };
      all[targetLang] = bestEntry;
      isNew = true;
      try {
        if (storage) storage.setItem(BEST_KEY, JSON.stringify(all));
      } catch (e) {
        // Still return computed result
      }
    }
  }

  return { best: bestEntry, isNew };
}

/**
 * @param {Storage} storage
 * @returns {boolean}
 */
export function resetBest(storage) {
  try {
    if (!storage) return false;
    storage.removeItem(BEST_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * @param {'en'|'pt'} lang
 * @param {{score: number, questions: number, at: string}|null} entry
 * @param {'en'|'pt'} [ui=lang] language of the wording
 * @returns {string}
 */
export function bestText(lang, entry, ui = lang) {
  const NAMES = { en: { en: 'English', pt: 'Portuguese' }, pt: { en: 'inglês', pt: 'português' } };
  const u = ui === 'pt' ? 'pt' : 'en';
  const name = NAMES[u][lang === 'pt' ? 'pt' : 'en'];
  if (u === 'pt') {
    if (!entry) return `Ainda sem recorde em ${name}.`;
    const q = entry.questions === 1 ? "1 pergunta" : `${entry.questions} perguntas`;
    return `Seu recorde em ${name}: ${entry.score} pontos com ${q}.`;
  }
  if (!entry) return `No best score yet in ${name}.`;
  const q = entry.questions === 1 ? "1 question" : `${entry.questions} questions`;
  return `Your best in ${name}: ${entry.score} points with ${q}.`;
}

/**
 * @param {'en'|'pt'} lang
 * @param {number} n
 * @returns {string}
 */
export function questionsText(lang, n) {
  return lang === 'pt' ? `Perguntas feitas: ${n}` : `Questions used: ${n}`;
}

/** @type {{ en: object, pt: object }} */
export const LABELS = {
  en: {
    bestTitle: 'Your best',
    reset: 'Reset my best scores',
    confirm: 'Reset your best scores for both languages? This cannot be undone.',
    done: 'Your best scores were reset.',
    kept: 'Nothing was reset.',
    newBest: 'New personal best!',
    confirmAccuse: 'Accuse {name}? You only get one accusation.',
    thinking: '…thinking'
  },
  pt: {
    bestTitle: 'Seu recorde',
    reset: 'Apagar meus recordes',
    confirm: 'Apagar seus recordes nos dois idiomas? Isso não pode ser desfeito.',
    done: 'Seus recordes foram apagados.',
    kept: 'Nada foi apagado.',
    newBest: 'Novo recorde pessoal!',
    confirmAccuse: 'Acusar {name}? Você só tem uma acusação.',
    thinking: '…pensando'
  }
};
