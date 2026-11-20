// M3 sprint 2 live generation (PO harness, not product): runs src/generator.js generateCase through the Cup key, logs each call to qa/key-usage-log.json (purpose m3s2-generate:<tag>:draftN), never the key.
// Usage: node tools/gen-live-m3s2.mjs <tag> "<seed>" [maxUsd]
import fs from 'node:fs'; import path from 'node:path';
import { generateCase, slugSeed } from '../src/generator.js';
const [tag, seed, maxUsdArg] = process.argv.slice(2);
const key = fs.readFileSync('.fullcup-key', 'utf8').trim();
const log = []; let n = 0; // appended at the end to the current file, so two runs can share it
const fetchImpl = async (url, opts) => { n++; const t0 = Date.now(); const r = await fetch(url, opts); const j = await r.clone().json().catch(() => null);
  const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
  log.push({ at: new Date(t0).toISOString(), purpose: `m3s2-generate:${tag}:draft${n}`, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms: Date.now() - t0, usage: j?.usage || null, cost: j?.usage?.neurons != null ? Math.round(j.usage.neurons * 0.011) / 1000 : null, headers: h });
  fs.writeFileSync(`qa/m3s2-probes/gen-${tag}-draft${n}.txt`, j?.choices?.[0]?.message?.content ?? JSON.stringify(j)); return r; };
let res;
try { res = await generateCase(seed, { key, fetchImpl, ...(maxUsdArg ? { maxUsd: Number(maxUsdArg) } : {}) }); }
catch (e) { res = { ok: false, code: e.code, status: e.status, attempts: e.attempts }; }
const all = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); all.push(...log); fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(all, null, 1));
const out = `content/generated/gen-${slugSeed(seed)}.json`;
if (res.ok) { fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(res.case, null, 2) + '\n'); }
const summary = { tag, seed, ok: res.ok, out: res.ok ? out : null, spentUsd: res.spentUsd, reasons: res.reasons || res.code || [], attempts: (res.attempts || []).map((a) => ({ n: a.n, status: a.status, ok: a.ok, reasons: a.reasons, receipt: a.receipt, neurons: a.usage?.neurons })) };
fs.writeFileSync(`qa/m3s2-probes/gen-${tag}.json`, JSON.stringify(summary, null, 1));
console.log(JSON.stringify(summary, null, 1));
if (!JSON.stringify(summary).includes(key.slice(-8))) console.log('key not in summary: ok');
