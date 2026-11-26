// Launch (v1.1.0): copies the calls the public Worker made through the Cup key (GET /api/usage, no player data) into qa/key-usage-log.json, once per receipt.
// Usage: node tools/sync-live-usage.mjs [baseUrl] [purposePrefix]   (default https://case-files.fullcup.ai, keep the Worker's own "live:<case>:<lang>" purpose)
import fs from 'node:fs';
const BASE = process.argv[2] || 'https://case-files.fullcup.ai'; const PREFIX = process.argv[3] || '';
const LOG = 'qa/key-usage-log.json'; const log = JSON.parse(fs.readFileSync(LOG, 'utf8'));
const seen = new Set(log.map((e) => e.headers?.['x-fullcup-receipt-id']).filter(Boolean));
let after = '', added = 0;
for (;;) {
  const page = await (await fetch(`${BASE}/api/usage${after ? '?after=' + encodeURIComponent(after) : ''}`)).json();
  if (!Array.isArray(page) || !page.length) break;
  for (const e of page) { const id = e.headers?.['x-fullcup-receipt-id']; if (id && seen.has(id)) continue; if (id) seen.add(id); const { usd, ...rest } = e; log.push({ ...rest, purpose: PREFIX ? `${PREFIX}:${e.purpose.replace(/^live:/, '')}` : e.purpose }); added++; }
  after = page.at(-1).at; if (page.length < 1000) break;
}
log.sort((a, b) => String(a.at).localeCompare(String(b.at)));
fs.writeFileSync(LOG, JSON.stringify(log, null, 1)); console.log('added', added, 'from', BASE);
