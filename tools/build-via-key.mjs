// Thin harness: sends a prompt file to the Cup key, writes returned files verbatim, logs metrics. No product code here.
import fs from 'node:fs'; import path from 'node:path';
const [promptFile, label, model = '@cf/openai/gpt-oss-120b'] = process.argv.slice(2);
const key = fs.readFileSync('.fullcup-key', 'utf8').trim();
const BASE = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';
const prompt = fs.readFileSync(promptFile, 'utf8');
const sys = 'You are a senior Node.js engineer. Output ONLY files, each as:\n<<<FILE path/to/file>>>\n...full file content...\n<<<END>>>\nNo prose, no markdown fences.';
const t0 = Date.now();
const r = await fetch(BASE + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': 'case-files:build-m1' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: 16000 }) });
const ms = Date.now() - t0; const txt = await r.text(); let j = {}; try { j = JSON.parse(txt); } catch {}
const out = j.choices?.[0]?.message?.content || '';
const files = [];
for (const m of out.matchAll(/<<<FILE ([^>\s]+)>>>\n([\s\S]*?)\n?<<<END>>>/g)) {
  let body = m[2].replace(/^```[a-z]*\n/, '').replace(/\n```\s*$/, '');
  fs.mkdirSync(path.dirname(m[1]), { recursive: true }); fs.writeFileSync(m[1], body + '\n');
  files.push({ path: m[1], lines: body.split('\n').length });
}
fs.mkdirSync('qa/build', { recursive: true });
fs.writeFileSync(`qa/build/${label}.raw.txt`, out || txt.slice(0, 2000));
const e = { label, at: new Date().toISOString(), model, status: r.status, ms, usage: j.usage || null, files };
let a = []; try { a = JSON.parse(fs.readFileSync('qa/build-log.json', 'utf8')); } catch {}
a.push(e); fs.writeFileSync('qa/build-log.json', JSON.stringify(a, null, 1));
console.log(JSON.stringify(e));
