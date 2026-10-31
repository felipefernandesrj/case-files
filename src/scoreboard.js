import fs from 'node:fs';
import path from 'node:path';
// Score: solved = max(10, 100 - 5 per question beyond 3); wrong = 0.
export const scoreFor = (correct, questions) => (correct ? Math.max(10, 100 - 5 * Math.max(0, questions - 3)) : 0);
export function createScoreboard(file) {
  let rows = [];
  if (file && fs.existsSync(file)) try { rows = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { rows = []; }
  return {
    add(row) { rows.push(row); rows.sort((a, b) => b.score - a.score || a.questions - b.questions || a.at.localeCompare(b.at)); rows = rows.slice(0, 100);
      if (file) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, JSON.stringify(rows)); } },
    top(n = 10) { return rows.slice(0, n); }
  };
}
