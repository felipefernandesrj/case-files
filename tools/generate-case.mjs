// M1: authors the case content THROUGH the Cup key (spends Cup capacity). Output: src/case.generated.json
import fs from 'node:fs'; import { call } from '../src/fullcup.js'; import { loadKey } from '../src/server.js';
const key = loadKey(); if (!key) throw new Error('no key (.fullcup-key)');
const model = process.env.AUTHOR_MODEL || '@cf/openai/gpt-oss-120b';
const spec = `Write a fair-play murder-mystery style case for a browser game called "Case Files". Title EN "The Lighthouse Ledger", PT-BR "O Livro do Farol".
Fixed: suspects ids/names/roles: marta "Marta Reis" (EN "harbor bookkeeper", PT "contadora do porto"), tomas "Tomás Abreu" (EN "lighthouse keeper", PT "faroleiro"), lia "Lia Sombra" (EN "fisherwoman", PT "pescadora"). Culprit: marta. Crime: the harbor ledger listing debts to smugglers was burned in the lighthouse stove at night.
Core clues that MUST exist: tomas saw a lantern near the stove room at 23:00 (no face); lia noticed Marta's boots black with soot this morning (implicates marta); marta falsely claims she was home all night (implicates marta); lia was at the tavern until midnight (clears lia); tomas was in the lamp room all night (clears tomas). You may add 1-2 extra clues.
Return ONLY JSON: {"intro":{"en","pt"},"solution":{"en","pt"} (solution EN must contain "bookkeeper", PT must contain "contadora"),
"suspects":[{"id","persona":{"en","pt"},"facts":"English private instructions for the role-play model: secrets, what they know, how they lie or deflect; the culprit never confesses outright"}],
"clues":[{"id","from","implicates":null|"marta","clears":null|id,"ask":"an English question that reveals it","text":{"en","pt"}}]}. Atmospheric, concise, PT-BR natural.`;
const r = await call(key, 'POST', '/chat/completions', { model, messages: [{ role: 'system', content: 'You are a mystery game writer. Output strict JSON only.' }, { role: 'user', content: spec }], max_tokens: 4000 }, { workload: 'case-files:author-m1', purpose: 'author-case' });
if (!r.ok) { console.error('API error', r.status, JSON.stringify(r.json)); process.exit(1); }
const txt = r.json.choices[0].message.content; const j = JSON.parse(txt.slice(txt.indexOf('{'), txt.lastIndexOf('}') + 1));
fs.writeFileSync('src/case.generated.json', JSON.stringify({ generatedBy: { model, at: new Date().toISOString(), via: 'FullCup Cup key (QA)', usage: r.json.usage || null }, ...j }, null, 2));
console.log('ok', model, JSON.stringify(r.json.usage));
