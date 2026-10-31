// M1: revision pass THROUGH the Cup key: send generated case + QA findings, get corrected JSON.
import fs from 'node:fs'; import { call } from '../src/fullcup.js'; import { loadKey } from '../src/server.js';
const key = loadKey(); const model = process.env.AUTHOR_MODEL || '@cf/openai/gpt-oss-120b';
const cur = JSON.parse(fs.readFileSync('src/case.generated.json', 'utf8')); const { generatedBy, ...body } = cur;
const issues = fs.readFileSync(process.argv[2], 'utf8');
const r = await call(key, 'POST', '/chat/completions', { model, max_tokens: 4000, messages: [
  { role: 'system', content: 'You are a mystery game writer. Output strict JSON only, same schema as the input.' },
  { role: 'user', content: `Fix this case JSON. QA findings:\n${issues}\nCase JSON:\n${JSON.stringify(body)}` }] }, { workload: 'case-files:author-m1', purpose: 'revise-case' });
if (!r.ok) { console.error('API error', r.status, JSON.stringify(r.json)); process.exit(1); }
const t = r.json.choices[0].message.content; const j = JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1));
fs.writeFileSync('src/case.generated.json', JSON.stringify({ generatedBy: { ...generatedBy, revisedAt: new Date().toISOString(), revisions: (generatedBy.revisions || 0) + 1 }, ...j }, null, 2));
console.log('ok', JSON.stringify(r.json.usage));
