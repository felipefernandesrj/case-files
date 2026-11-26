// Launch build (v1.1.0): bakes the pack, prompts, credits and cost log into worker/gen/pack.json and copies public/ to worker/public for Workers static assets.
// The Worker never reads files at runtime; case logic stays in src/ and is reused here at build time.
import { readFileSync, writeFileSync, mkdirSync, cpSync, rmSync } from 'node:fs';
import { CASES, loadCase, publicCase, listPack, systemPrompt } from '../src/case.js';
import { questionBudgetFor, maxCallsFor, fairMinimum } from '../src/budget.js';
const cases = {};
for (const [key, file] of Object.entries(CASES)) {
  const c = loadCase(file);
  const prompts = { en: {}, pt: {} };
  for (const l of ['en', 'pt']) for (const s of c.suspects) prompts[l][s.id] = systemPrompt(c, s.id, l);
  cases[key] = { full: c, budget: questionBudgetFor(c), maxCalls: maxCallsFor(c), fair: fairMinimum(c), prompts, public: { en: publicCase(c, 'en'), pt: publicCase(c, 'pt') } };
}
const pack = { defaultKey: 'violin', cases, list: { en: listPack('en'), pt: listPack('pt') }, credits: JSON.parse(readFileSync('../data/credits.json', 'utf8')), costLog: JSON.parse(readFileSync('../data/cost-log.json', 'utf8')), builtAt: new Date().toISOString() };
mkdirSync('gen', { recursive: true });
writeFileSync('gen/pack.json', JSON.stringify(pack));
rmSync('public', { recursive: true, force: true });
cpSync('../public', 'public', { recursive: true });
console.log('pack', Object.keys(cases).join(', '), (JSON.stringify(pack).length / 1024).toFixed(0) + ' kB');
