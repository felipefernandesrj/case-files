// Pre-launch stress harness (PO harness, not product): game server on its own port with a temp scoreboard.
// MODE=mock (local mock answers) or MODE=fake (fake upstream: latency 200-1200 ms, ~8% 429/502). No key calls.
import os from 'node:os'; import path from 'node:path'; import { createServer } from '../src/server.js';
const MODE = process.env.MODE || 'mock'; const SF = path.join(os.tmpdir(), `stress-scores-${Date.now()}.json`);
let n = 0;
const fakeFetch = async (url, opts) => { n++; await new Promise(r => setTimeout(r, 200 + Math.random() * 1000));
  const roll = Math.random(); if (roll < 0.04) return new Response(JSON.stringify({ error: { code: 'rate_limited' } }), { status: 429 });
  if (roll < 0.08) return new Response('bad gateway', { status: 502 });
  return new Response(JSON.stringify({ choices: [{ message: { content: 'I was in the hall the whole time. Ask the others.' } }] }), { status: 200, headers: { 'content-type': 'application/json' } }); };
const server = createServer({ caseFile: 'content/case.json', scoreFile: SF, mock: MODE === 'mock', key: MODE === 'fake' ? 'fake' : undefined, fetchImpl: MODE === 'fake' ? fakeFetch : undefined });
server.listen(Number(process.env.PORT) || 3100, () => console.log('listening', server.address().port, MODE, SF));
setInterval(() => { process.stdout.write(JSON.stringify({ t: Date.now(), rss: process.memoryUsage().rss, heap: process.memoryUsage().heapUsed, upstreamCalls: n }) + '\n'); }, 2000);
