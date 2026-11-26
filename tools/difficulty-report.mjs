// Pre-launch difficulty report (PO harness): stats from the LLM bot games in players.json. Usage: node tools/difficulty-report.mjs <players.json> [out.md]
import fs from 'node:fs';
const [IN, OUT] = process.argv.slice(2); const games = JSON.parse(fs.readFileSync(IN, 'utf8')).filter((g) => g.valid !== false);
const oldScore = (ok, q) => (ok ? Math.max(10, 100 - 5 * Math.max(0, q - 3)) : 0); const newScore = (ok, q, c) => (!ok ? 0 : q < 2 ? 25 : Math.max(10, 100 - 5 * Math.max(0, q - (c === 'violin' ? 4 : 5)))); // pre-launch rule: hunch 25, free questions = fair minimum
const pct = (a, p) => { const s = [...a].sort((x, y) => x - y); if (!s.length) return '-'; const i = (s.length - 1) * p; const lo = Math.floor(i), hi = Math.ceil(i); return +(s[lo] + (s[hi] - s[lo]) * (i - lo)).toFixed(1); };
const mean = (a) => (a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(1) : '-');
const short = { violin: 'Violin', 'night-train': 'Night Train', 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio': 'Lapa (gen)', 'gen-a-samba-school-rehearsal-in-madureira-th': 'Samba (gen)' };
const group = (keyFn) => { const m = {}; for (const g of games) (m[keyFn(g)] ||= []).push(g); return m; };
const row = (k, v) => { const sc = v.map((g) => oldScore(g.correct, g.questions)); const q = v.map((g) => g.questions); const t = v.map((g) => g.seconds);
  return `| ${k} | ${v.length} | ${Math.round(100 * v.filter((g) => g.correct).length / v.length)}% | ${mean(sc)} | ${pct(sc, 0.5)} | ${pct(sc, 0.1)} | ${pct(sc, 0.9)} | ${mean(q)} | ${Math.round(100 * v.filter((g) => g.questions >= g.budget).length / v.length)}% | ${mean(t)} s |`; };
const H = '| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |\n|---|---|---|---|---|---|---|---|---|---|';
const L = [`# Difficulty report (${games.length} LLM bot games, brain gemma-4-26b, suspects llama-4-scout via the Cup key)`, '', 'Scores use the v1.0.0 rule (100 up to 3 questions, minus 5 per extra question, floor 10, wrong = 0). Hints were all given to the brain at the start (real players see them at 45/100/160 s), so win rates are an upper bound.', '',
  '## Per case and language', H, ...Object.entries(group((g) => `${short[g.case]} ${g.lang.toUpperCase()}`)).sort().map(([k, v]) => row(k, v)), '',
  '## Per case', H, ...Object.entries(group((g) => short[g.case])).map(([k, v]) => row(k, v)), '',
  '## Per skill persona (r1 = brain chose freely; r2/r3 = harness cap: careless 3 questions, average 60% of budget, methodical whole budget)', H, ...Object.entries(group((g) => `${g.persona} ${g.run && g.run !== 'r1' ? 'capped' : 'free'}`)).sort().map(([k, v]) => row(k, v)), '',
  '## Per language', H, ...Object.entries(group((g) => g.lang.toUpperCase())).map(([k, v]) => row(k, v)), '',
  '## Wrong accusations (who confused the bots)', '| case | lang | persona | questions | accused | culprit | clues found |', '|---|---|---|---|---|---|---|',
  ...games.filter((g) => !g.correct).map((g) => `| ${short[g.case]} | ${g.lang} | ${g.persona} | ${g.questions} | ${g.accused} | ${g.culprit} | ${g.cluesFound.length} |`), '',
  '## Expected score by strategy (v1.0.0 rule vs pre-launch rule: hunch 25 under 2 questions, free questions = fair minimum)', '| strategy | old rule | new rule |', '|---|---|---|',
  ...['careless', 'average', 'methodical'].map((p) => { const v = games.filter((g) => g.persona === p && g.run && g.run !== 'r1'); return `| ${p} (capped runs, n=${v.length}) | ${mean(v.map((g) => oldScore(g.correct, g.questions)))} | ${mean(v.map((g) => newScore(g.correct, g.questions, g.case)))} |`; }),
  `| blind guess, 0 questions (Violin 1 in 3, others 1 in 4) | ${(100 * (1 / 3 + 3 / 4) / 4).toFixed(1)} expected, 100 on a lucky try | ${(25 * (1 / 3 + 3 / 4) / 4).toFixed(1)} expected, 25 max |`,
  '', '## Clues detected by the server per game (keyword match)', `mean ${mean(games.map((g) => g.cluesFound.length))}; winners with no clue against the culprit detected: ${games.filter((g) => g.correct && !g.cluesFound.some((c) => c.includes('against ' + g.culprit))).length} of ${games.filter((g) => g.correct).length}`];
fs.writeFileSync(OUT || '/dev/stdout', L.join('\n') + '\n');
