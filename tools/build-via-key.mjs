// Thin harness: sends a prompt file to the Cup key, writes returned files verbatim, logs metrics. No product code here.
import fs from 'node:fs'; import path from 'node:path';
const [promptFile, label, model = '@cf/openai/gpt-oss-120b'] = process.argv.slice(2);
const key = fs.readFileSync('.fullcup-key', 'utf8').trim();
const BASE = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';
const prompt = fs.readFileSync(promptFile, 'utf8');
const REPARSE = process.env.REPARSE; // re-parse a saved raw output, no new call
const sys = 'You are a senior Node.js engineer. Output ONLY files, each as:\n<<<FILE path/to/file>>>\n...full file content...\n<<<END>>>\nNo prose, no markdown fences.';
const t0 = Date.now();
const r = REPARSE ? { status: 200, text: async () => JSON.stringify({ choices: [{ message: { content: fs.readFileSync(`qa/build/${REPARSE}.raw.txt`, 'utf8') } }] }) } : await fetch(BASE + '/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', 'X-FullCup-Workload': 'case-files:build-m1' }, body: JSON.stringify({ model, messages: [{ role: 'system', content: sys }, { role: 'user', content: prompt }], max_tokens: Number(process.env.MAXTOK) || 16000, stream: !!process.env.STREAM, ...(process.env.REASONING ? { reasoning_effort: process.env.REASONING } : {}), ...(process.env.NOTHINK ? { chat_template_kwargs: { enable_thinking: false } } : {}) }) });
const ms0 = Date.now() - t0; let txt = await r.text(); let j = {};
if (/^data: /m.test(txt)) { let c = '', u = null; for (const l of txt.split('\n')) { if (!l.startsWith('data: {')) continue; try { const k = JSON.parse(l.slice(6)); c += k.choices?.[0]?.delta?.content || ''; if (k.usage) u = k.usage; } catch {} } j = { choices: [{ message: { content: c } }], usage: u }; txt = c; } else { try { j = JSON.parse(txt); } catch {} }
const ms = Date.now() - t0;
const out = j.choices?.[0]?.message?.content || '';
const files = [];
const allow = process.env.ALLOW ? process.env.ALLOW.split(',') : null; const skipped = [];
for (const m of out.matchAll(/<<<FILE ([^>\s]+)>>>\n([\s\S]*?)\n?<<<END>>>/g)) {
  if (allow && !allow.includes(m[1])) { skipped.push(m[1]); continue; }
  let body = m[2].replace(/^```[a-z]*\n/, '').replace(/\n```\s*$/, '');
  fs.mkdirSync(path.dirname(m[1]), { recursive: true }); fs.writeFileSync(m[1], body + '\n');
  files.push({ path: m[1], lines: body.split('\n').length });
}
// literal search/replace edits produced by the model: <<<REPLACE path>>>\nOLD\n=====\nNEW\n<<<END>>>
for (const m of out.matchAll(/<<<REPLACE ([^>\s]+)>>>\n([\s\S]*?)\n=====\n([\s\S]*?)\n?(?:<<<END>>>|(?=<<<REPLACE ))/g)) { // sprint 4: a missing <<<END>>> before the next block ends the block
  if (allow && !allow.includes(m[1])) { skipped.push(m[1]); continue; }
  const cur = fs.readFileSync(m[1], 'utf8'); const n = cur.split(m[2]).length - 1;
  fs.writeFileSync(m[1], cur.split(m[2]).join(m[3])); files.push({ path: m[1], edit: true, occurrences: n, lines: m[3].split('\n').length });
}
// apply_patch-style hunks inside <<<REPLACE path>>> ... <<<END>>> (lines ' ' context, '-' old, '+' new, '@@' separators)
for (const m of out.matchAll(/<<<REPLACE ([^>\s]+)>>>\n([\s\S]*?)\n?<<<END>>>/g)) {
  if (!/^@@/m.test(m[2]) && !/\n=====\n/.test(m[2]) && /^(import|\/\/|<!doctype|<!DOCTYPE|\{)/.test(m[2])) { if (allow && !allow.includes(m[1])) { skipped.push(m[1]); continue; } fs.writeFileSync(m[1], m[2] + '\n'); files.push({ path: m[1], lines: m[2].split('\n').length, fullViaReplace: true }); continue; }
  if (!/^@@/m.test(m[2])) continue; if (allow && !allow.includes(m[1])) { skipped.push(m[1]); continue; }
  let cur = fs.readFileSync(m[1], 'utf8'); let ok = 0, bad = 0;
  for (const h of m[2].split(/^@@.*$/m)) {
    const ls = h.split('\n').filter(l => !/^\*\*\* /.test(l)); while (ls.length && ls.at(-1) === '') ls.pop(); while (ls.length && ls[0] === '') ls.shift(); if (!ls.length) continue;
    const old = ls.filter(l => !l.startsWith('+')).map(l => l.slice(1)).join('\n'); const neu = ls.filter(l => !l.startsWith('-')).map(l => l.slice(1)).join('\n');
    if (old && cur.includes(old)) { cur = cur.replace(old, neu); ok++; } else bad++;
  }
  fs.writeFileSync(m[1], cur); files.push({ path: m[1], patch: true, hunksApplied: ok, hunksFailed: bad });
}
fs.mkdirSync('qa/build', { recursive: true });
fs.writeFileSync(`qa/build/${label}.raw.txt`, out || txt.slice(0, 2000));
const hdr = {}; try { for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after|ratelimit)/i.test(k)) hdr[k] = v; } catch {} // sprint 4: log receipt/seal/ratelimit headers
const e = { label, at: new Date().toISOString(), model, status: r.status, ms, usage: j.usage || null, headers: hdr, files, skipped };
let a = []; try { a = JSON.parse(fs.readFileSync('qa/build-log.json', 'utf8')); } catch {}
a.push(e); fs.writeFileSync('qa/build-log.json', JSON.stringify(a, null, 1));
console.log(JSON.stringify(e));
