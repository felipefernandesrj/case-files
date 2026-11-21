// M3 acceptance (PO harness, not product): 20 seeds through generateCase via the Cup key, 4 at a time. Cases go to qa/m3-batch/, calls to qa/key-usage-log.json (purpose m3-batch:<i>:draftN), never the key.
import fs from 'node:fs';
import { generateCase } from '../src/generator.js';
const key = fs.readFileSync('.fullcup-key', 'utf8').trim();
const seeds = ['A foggy night at a Santos Dumont airport lounge: a diplomat\'s briefcase is swapped','A samba school rehearsal in Madureira: the lead drum is found sabotaged','A cable car in Sugarloaf stops mid-ride and a necklace vanishes','A closed pharmacy in Tijuca: the safe with the prescription pads is emptied','A film set in Paraty: the lead actor\'s script goes missing before the final scene','A beach kiosk in Recreio at dawn: the day\'s takings disappear','A hotel ballroom in Copacabana: the wedding rings are gone before the vows','A university lab in Fundao: a prototype chip is stolen overnight','A ferry to Niteroi: a painting in the cargo hold is replaced by a copy','A bakery in Santa Teresa: the secret recipe book is torn out','A football stadium locker room: the captain\'s lucky boots vanish before the final','A library in the Centro: a rare map is cut from an atlas','A rooftop party in Botafogo: the host\'s watch is taken during the fireworks','A botanical garden greenhouse: a rare orchid is stolen on the eve of a contest','A tram in Santa Teresa: the conductor\'s ticket box goes missing','A radio station in Barra: the live show tape is erased minutes before air','A chess club in Leblon: the championship trophy is gone','A fish market at Sao Pedro da Aldeia: the auction ledger is altered','A jazz club in Lapa: the saxophonist\'s golden mouthpiece is stolen','A bookstore cafe in Ipanema: the poet\'s manuscript disappears from a locked drawer'];
const out = []; const calls = []; let next = 0; fs.mkdirSync('qa/m3-batch', { recursive: true });
async function worker() {
  while (next < seeds.length) {
    const i = next++; const seed = seeds[i]; let n = 0; const mine = [];
    const fetchImpl = async (url, opts) => { n++; const t0 = Date.now(); const r = await fetch(url, opts); const j = await r.clone().json().catch(() => null);
      const h = {}; for (const [k, v] of r.headers) if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) h[k] = v;
      calls.push({ at: new Date(t0).toISOString(), purpose: `m3-batch:${i + 1}:draft${n}`, method: 'POST', endpoint: '/chat/completions', model: JSON.parse(opts.body).model, status: r.status, ms: Date.now() - t0, usage: j?.usage || null, cost: j?.usage?.neurons != null ? Math.round(j.usage.neurons * 0.011) / 1000 : null, headers: h, error: r.ok ? null : j }); return r; };
    let res; try { res = await generateCase(seed, { key, fetchImpl }); } catch (e) { res = { ok: false, code: e.code, status: e.status }; }
    if (res.ok) fs.writeFileSync(`qa/m3-batch/seed-${String(i + 1).padStart(2, '0')}.json`, JSON.stringify(res.case, null, 2));
    out.push({ i: i + 1, seed, ok: res.ok, drafts: (res.attempts || []).length, reasons: res.reasons || res.code || [], spentUsd: res.spentUsd });
    console.log(i + 1, res.ok, (res.attempts || []).length, JSON.stringify(res.reasons || res.code || []));
  }
}
await Promise.all([1, 2, 3, 4].map(worker));
const all = JSON.parse(fs.readFileSync('qa/key-usage-log.json', 'utf8')); all.push(...calls); fs.writeFileSync('qa/key-usage-log.json', JSON.stringify(all, null, 1));
out.sort((a, b) => a.i - b.i); fs.writeFileSync('qa/m3-batch/summary.json', JSON.stringify(out, null, 1));
console.log('OK', out.filter(o => o.ok).length, '/', out.length, 'usd', out.reduce((a, o) => a + (o.spentUsd || 0), 0).toFixed(4));
