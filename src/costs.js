import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { CASES, loadCase } from './case.js';

export const NEURON_USD = 0.011 / 1000;
export const RECEIPT_URL = 'https://qa.fullcup.ai/receipts/';

export const RULES = [
  { re: /^m2gf\d+-art:violin-/, case: 'violin', kind: 'art' },
  { re: /^m2gf\d+-art:night-train-/, case: 'night-train', kind: 'art' },
  { re: /^(interrogate|m1-acceptance|sprint\d+-smoke|sprint5-consistency)(:|$)/, case: 'violin', kind: 'play' },
  { re: /^(author-case|revise-case)(:|$)/, case: 'violin', kind: 'author' },
  { re: /^(m2-acceptance|m2s\d+-smoke|m2-shots)(:|$)/, case: 'night-train', kind: 'play' },
  { re: /^(m3-acceptance|m3s2-shots)(:|$)/, case: 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', kind: 'play' },
  { re: /^m4-acceptance/, case: 'gen-a-samba-school-rehearsal-in-madureira-th', kind: 'play' },
  // launch (v1.1.0): calls of the public Worker (live:<case>:<lang>) and of its cap check deploy (launch-capcheck:<case>:<lang>)
  ...['violin', 'night-train', 'gen-a-rainy-night-at-a-lapa-bookshop-in-rio', 'gen-a-samba-school-rehearsal-in-madureira-th'].map((c) => ({ re: new RegExp(`^(live|launch-capcheck):${c}(:|$)`), case: c, kind: 'play' }))
];

export function round6(x) {
  return Math.round(x * 1e6) / 1e6;
}

export function entryUsd(e) {
  if (e.usage && Number.isFinite(e.usage.neurons)) return round6(e.usage.neurons * NEURON_USD);
  else if (typeof e.cost === 'number') return round6(e.cost);
  else return 0;
}

export function receiptOf(e) {
  return e.headers?.['x-fullcup-receipt-id'] || e.headers?.['x-fullcup-receipt'] || null;
}

export function ulidTime(id) {
  if (typeof id !== 'string' || id.length < 10) return null;
  const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  let ms = 0;
  const sub = id.substring(0, 10).toUpperCase();
  for (let i = 0; i < sub.length; i++) {
    const idx = ALPHABET.indexOf(sub[i]);
    if (idx === -1) return null;
    ms = ms * 32 + idx;
  }
  return new Date(ms).toISOString();
}

export function artCase(asset) {
  if (/(^|\/)violin(-|$)/.test(String(asset))) return 'violin';
  if (/(^|\/)night-train(-|$)/.test(String(asset))) return 'night-train';
  return 'pack';
}

export function classify(purpose, rules = RULES) {
  const str = String(purpose || '');
  for (const { re, case: c, kind } of rules) {
    if (re.test(str)) return { case: c, kind };
  }
  return { case: 'pack', kind: /build/.test(purpose) ? 'build' : 'dev' };
}

export function buildCostLog({ usage = [], build = [], cases = {}, art = [], now = new Date().toISOString() }) {
  const buckets = [];
  const caseKeys = Object.keys(cases);
  
  for (const key of caseKeys) {
    const c = cases[key];
    buckets.push({
      id: key,
      title: c.title,
      generated: Boolean(c.generated),
      entries: []
    });
  }
  
  const packBucket = {
    id: 'pack',
    title: { en: 'The whole pack (shared build and tools)', pt: 'O pacote inteiro (construção e ferramentas compartilhadas)' },
    generated: false,
    entries: []
  };

  const receiptToCase = new Map();
  for (const key of caseKeys) {
    const c = cases[key];
    const receipts = c.generated?.cost?.receipts || [];
    for (const r of receipts) receiptToCase.set(r, key);
  }

  const seenReceipts = new Set();

  for (const e of usage) {
    if (e.status === undefined) continue;
    const receipt = receiptOf(e);
    let targetCaseKey;
    let kind;

    if (receipt && receiptToCase.has(receipt)) {
      targetCaseKey = receiptToCase.get(receipt);
      kind = 'generate';
    } else {
      const cls = classify(e.purpose);
      targetCaseKey = cls.case;
      kind = cls.kind;
    }

    const bucket = buckets.find(b => b.id === targetCaseKey) || packBucket;
    bucket.entries.push({
      at: e.at || ulidTime(receipt),
      kind,
      purpose: e.purpose,
      model: e.model || null,
      status: e.status,
      usd: entryUsd(e),
      receipt
    });
    if (receipt) seenReceipts.add(receipt);
  }

  for (const e of build) {
    const receipt = receiptOf(e);
    if (receipt && seenReceipts.has(receipt)) continue;
    if (receipt) seenReceipts.add(receipt);
    
    packBucket.entries.push({
      at: e.at || ulidTime(receipt),
      kind: 'build',
      purpose: 'build:' + e.label,
      model: e.model,
      status: e.status,
      usd: entryUsd(e),
      receipt
    });
  }

  for (const item of art) {
    if (item.receipt && seenReceipts.has(item.receipt)) continue;
    if (item.receipt) seenReceipts.add(item.receipt);
    const bucket = buckets.find(b => b.id === artCase(item.asset)) || packBucket;
    bucket.entries.push({
      at: ulidTime(item.receipt),
      kind: 'art',
      purpose: 'art:' + item.asset + ':' + item.attempt,
      model: item.model || null,
      status: 200,
      usd: round6(Number(item.usd) || 0),
      receipt: item.receipt || null
    });
  }

  const allBuckets = [...buckets, packBucket];

  for (const b of allBuckets) {
    b.entries.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
    const totals = {
      usd: 0,
      calls: b.entries.length,
      receipts: 0,
      byKind: {}
    };
    for (const entry of b.entries) {
      totals.usd += entry.usd;
      if (entry.receipt) totals.receipts++;
      if (!totals.byKind[entry.kind]) totals.byKind[entry.kind] = { usd: 0, calls: 0 };
      totals.byKind[entry.kind].usd += entry.usd;
      totals.byKind[entry.kind].calls += 1;
    }
    totals.usd = round6(totals.usd);
    for (const k in totals.byKind) {
      totals.byKind[k].usd = round6(totals.byKind[k].usd);
    }
    b.totals = totals;
  }

  const totalSum = allBuckets.reduce((acc, b) => acc + b.totals.usd, 0);
  const totalCalls = allBuckets.reduce((acc, b) => acc + b.totals.calls, 0);
  const totalReceipts = allBuckets.reduce((acc, b) => acc + b.totals.receipts, 0);

  return {
    version: 1,
    generatedAt: now,
    usdPer1000Neurons: 0.011,
    receiptUrl: RECEIPT_URL,
    cases: buckets,
    pack: packBucket,
    total: {
      usd: round6(totalSum),
      calls: totalCalls,
      receipts: totalReceipts
    }
  };
}

export function costsFor(log, key) {
  if (key === 'pack') return log.pack;
  return log.cases.find(b => b.id === key) || null;
}

export function writeCostLog({ usageFile = 'qa/key-usage-log.json', buildFile = 'qa/build-log.json', artFile = 'data/art-receipts.json', outFile = 'data/cost-log.json' } = {}) {
  const usage = existsSync(usageFile) ? JSON.parse(readFileSync(usageFile, 'utf8')) : [];
  const build = existsSync(buildFile) ? JSON.parse(readFileSync(buildFile, 'utf8')) : [];
  const art = existsSync(artFile) ? (() => { const parsed = JSON.parse(readFileSync(artFile, 'utf8')); return parsed && Array.isArray(parsed.items) ? parsed.items : []; })() : [];
  
  const cases = {};
  for (const key of Object.keys(CASES)) {
    cases[key] = loadCase(CASES[key]);
  }

  const log = buildCostLog({ usage, build, cases, art });
  writeFileSync(outFile, JSON.stringify(log, null, 1) + '\n');
  return log;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const log = writeCostLog();
  for (const b of [...log.cases, log.pack]) {
    console.log(`${b.id}: US$ ${b.totals.usd.toFixed(6)} over ${b.totals.calls} calls (${b.totals.receipts} receipts)`);
  }
  console.log(`total: US$ ${log.total.usd.toFixed(6)} over ${log.total.calls} calls (${log.total.receipts} receipts)`);
}
