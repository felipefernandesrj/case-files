// Launch (v1.1.0, PO): checks for the public Cloudflare Worker that need no network.
import { readFileSync } from 'node:fs';
import { friendly } from '../src/messages.js';
import { classify } from '../src/costs.js';
const out = []; let fail = 0; const ok = (c, m) => { out.push(`${c ? '[PASS]' : '[FAIL]'} ${m}`); if (!c) fail++; };
ok(['player_cap', 'daily_cap', 'too_many_games'].every((k) => friendly(k, 'en') && friendly(k, 'pt') && friendly(k, 'en') !== friendly(k, 'pt')), 'cap messages exist in EN and PT');
const cfg = JSON.parse(readFileSync('worker/wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, ''));
ok(!cfg.vars.TEST_NETWORK_HEADER && cfg.vars.PLAYER_CAP_USD === '0.01' && cfg.vars.GLOBAL_CAP_USD === '1' && Number(cfg.vars.RPM) < 60, 'public deploy: US$0.01 per network, US$1 a day, under the key\'s 60 requests a minute, no test header');
ok(Array.isArray(cfg.env.capcheck.routes) && cfg.env.capcheck.routes.length === 0, 'the cap check deploy never takes the public domain');
const w = readFileSync('worker/src/index.js', 'utf8');
ok(/g\.calls \+= 1; g\.pending \+= 1;/.test(w) && w.indexOf('g.pending += 1') < w.indexOf('await hub.reserve'), 'worker counts a pending question before its first await (no budget race)');
ok(!/fullcup-key|CUP_KEY/.test(readFileSync('public/index.html', 'utf8')) && /env\.CUP_KEY/.test(w), 'the Cup key is a Worker secret, never in the page');
ok(classify('live:night-train:pt').case === 'night-train' && classify('launch-capcheck:violin:en').case === 'violin', 'live Worker calls are booked on their case in the cost log');
console.log(out.join('\n')); console.log(`launch-worker: ${out.length - fail} passed, ${fail} failed`); if (fail) process.exit(1);
