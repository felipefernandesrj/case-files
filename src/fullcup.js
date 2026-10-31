// FullCup proxy client. Every call is logged (no key) to qa/key-usage-log.json.
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
export const BASE = process.env.FULLCUP_BASE_URL || 'https://qa-api.fullcup.ai/v1';
const LOG = process.env.KEY_LOG ?? path.join(root, 'qa/key-usage-log.json');
const HDR = /capacity|cost|usage|credit|ratelimit|rate-limit|retry|fullcup|cup|request-id|balance|remaining/i;
export function logEntry(e) {
  if (!LOG) return; let a = []; try { a = JSON.parse(fs.readFileSync(LOG, 'utf8')); } catch {}
  a.push(e); fs.mkdirSync(path.dirname(LOG), { recursive: true }); fs.writeFileSync(LOG, JSON.stringify(a, null, 1));
}
export async function call(key, method, endpoint, body, { workload, purpose } = {}) {
  const t0 = Date.now();
  const r = await fetch(BASE + endpoint, { method, headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...(workload ? { 'X-FullCup-Workload': workload } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = {}; try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 300) }; }
  const headers = {}; r.headers.forEach((v, k) => { if (HDR.test(k)) headers[k] = v; });
  logEntry({ at: new Date().toISOString(), purpose, method, endpoint, model: body?.model || null, status: r.status, ms: Date.now() - t0,
    usage: json.usage || null, cost: json.usage?.cost ?? json.cost ?? headers['x-fullcup-cost'] ?? null, headers, error: r.ok ? null : json });
  return { ok: r.ok, status: r.status, json, headers };
}
