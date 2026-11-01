import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

/**
 * Compute a score.
 * @param {boolean} correct
 * @param {number} questions
 * @returns {number}
 */
export function scoreFor(correct, questions) {
  if (!correct) return 0;
  return Math.max(10, 100 - 5 * Math.max(0, questions - 3));
}

/**
 * Create a scoreboard manager.
 * @param {string|null} filePath
 * @returns {{add: Function, top: Function}}
 */
export function createScoreboard(filePath = null) {
  let entries = [];

  const load = async () => {
    if (!filePath) return;
    try {
      const data = await readFile(filePath, 'utf8');
      entries = JSON.parse(data);
    } catch (_) {
      entries = [];
    }
  };

  const persist = async () => {
    if (!filePath) return;
    try {
      const dir = dirname(filePath);
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, JSON.stringify(entries, null, 2), 'utf8');
    } catch (_) {
      // ignore persistence errors
    }
  };

  // initial load
  load();

  /**
   * Add a new scoreboard entry.
   * @param {Object} param0
   * @param {string} param0.player
   * @param {number} param0.score
   * @param {number} param0.questions
   * @param {boolean} param0.correct
   * @param {'en'|'pt'} param0.lang
   * @param {string} [param0.at] ISO timestamp
   * @param {string} [param0.caseId] Identifier of the case
   */
  async function add({ player, score, questions, correct, lang, at, caseId }) {
    const entry = {
      player,
      score,
      questions,
      correct,
      lang,
      at: at || new Date().toISOString(),
      caseId,
    };
    entries.push(entry);
    // keep only latest 100 after sorting
    entries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    if (entries.length > 100) entries.length = 100;
    await persist();
  }

  /**
   * Get top N entries, optionally filtered by caseId.
   * @param {number} [n=10]
   * @param {string} [caseId] Filter entries to this case
   * @returns {Array<Object>}
   */
  function top(n = 10, caseId) {
    let list = entries;
    if (caseId) {
      list = list.filter(e => e.caseId === caseId);
    }
    const sorted = [...list].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.questions !== b.questions) return a.questions - b.questions;
      return new Date(a.at) - new Date(b.at);
    });
    return sorted.slice(0, n);
  }

  return { add, top };
}
