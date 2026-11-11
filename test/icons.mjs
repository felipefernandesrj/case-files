import fs from 'node:fs';
import path from 'node:path';
import { once } from 'node:events';
import { createServer } from '../src/server.js';

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
    passed++;
  } catch (err) {
    console.error(`FAIL ${name}: ${err.message}`);
    failed++;
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg);
};

const root = path.resolve('.');
const spritePath = path.join(root, 'public/assets/icons.svg');
const htmlPath = path.join(root, 'public/index.html');
const cssPath = path.join(root, 'public/css/game.css');

function symbolIds(svg) {
  return [...svg.matchAll(/<symbol\s+[^>]*id="([^"]+)"/g)].map((m) => m[1]);
}

function referencedIds(text) {
  const ids = new Set();
  for (const m of text.matchAll(/<use\s+[^>]*href="#([^"]+)"/g)) ids.add(m[1]);
  for (const m of text.matchAll(/href=["']\/assets\/icons\.svg#([^"']+)["']/g)) ids.add(m[1]);
  for (const m of text.matchAll(/['"](i-[a-z0-9-]+)['"]/g)) ids.add(m[1]);
  for (const m of text.matchAll(/#(?:i-[a-z0-9-]+)/g)) ids.add(m[0].slice(1));
  return ids;
}

function referencedPublicPaths(text) {
  const paths = new Set();
  for (const m of text.matchAll(/["'(`](\/(?:icons|assets)\/[^"'`)\s]+)/g)) {
    const p = m[1].split('#')[0].split('?')[0];
    if (p) paths.add(p);
  }
  return paths;
}

const sprite = fs.readFileSync(spritePath, 'utf8');
const html = fs.readFileSync(htmlPath, 'utf8');
const css = fs.readFileSync(cssPath, 'utf8');
const ids = symbolIds(sprite);
const idSet = new Set(ids);

await test('icon sprite ships unique 24px symbols', async () => {
  assert(ids.length >= 40, `expected a full set, got ${ids.length}`);
  assert(ids.length === idSet.size, 'duplicate symbol ids in sprite');
  for (const id of ids) {
    assert(id.startsWith('i-'), `id ${id} should use the i- prefix`);
    const block = sprite.slice(sprite.indexOf(`id="${id}"`));
    const tag = block.slice(0, block.indexOf('>') + 1);
    assert(/viewBox="0 0 24 24"/.test(tag) || /viewBox="0 0 24 24"/.test(sprite.slice(0, 200)), `missing 24px grid for ${id}`);
  }
  const required = [
    'i-briefing', 'i-locations', 'i-suspects', 'i-talk', 'i-board', 'i-accuse', 'i-score',
    'i-lang', 'i-restart', 'i-questions', 'i-locked', 'i-unlocked', 'i-verdict-ok', 'i-verdict-wrong',
    'i-ev-fingerprint', 'i-ev-key', 'i-ev-ticket', 'i-ev-letter', 'i-ev-necklace', 'i-ev-violin', 'i-ev-watch', 'i-ev-footprint',
    'i-loc-instrument', 'i-loc-rehearsal', 'i-loc-office', 'i-loc-dining', 'i-loc-sleeper', 'i-loc-luggage', 'i-loc-tunnel', 'i-loc-platform'
  ];
  const missing = required.filter((id) => !idSet.has(id));
  assert(missing.length === 0, `sprite missing ${missing.join(', ')}`);
});

await test('every referenced icon id exists in the sprite', async () => {
  const inlineIds = symbolIds(html);
  assert(inlineIds.length === ids.length, `inline sprite has ${inlineIds.length} symbols, file has ${ids.length}`);
  const missingInline = ids.filter((id) => !inlineIds.includes(id));
  assert(missingInline.length === 0, `inline sprite missing ${missingInline.join(', ')}`);
  const used = referencedIds(html);
  const missing = [...used].filter((id) => !idSet.has(id));
  assert(missing.length === 0, `referenced icon ids missing from sprite: ${missing.join(', ')}`);
});

await test('referenced icon paths do not 404 (guards rotate-ccw)', async () => {
  const usedPaths = new Set([
    ...referencedPublicPaths(html),
    ...referencedPublicPaths(css)
  ]);
  usedPaths.add('/assets/icons.svg');
  const missing = [];
  for (const p of usedPaths) {
    const onDisk = path.join(root, 'public', p.replace(/^\//, ''));
    if (!fs.existsSync(onDisk)) missing.push(p);
  }
  assert(missing.length === 0, `missing public files (would 404): ${missing.join(', ')}`);
  const stale = [...usedPaths].filter((p) => p.includes('rotate-ccw'));
  assert(stale.length === 0, `rotate-ccw referenced without a file: ${stale.join(', ')}`);

  const server = createServer({ scoreFile: null, mock: true });
  server.listen(0);
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const res = await fetch(base + '/assets/icons.svg');
    assert(res.status === 200, `/assets/icons.svg status ${res.status}`);
    const body = await res.text();
    assert(body.includes('<symbol id="i-briefing"'), 'sprite body missing symbols');
    const ghost = await fetch(base + '/icons/rotate-ccw.svg');
    assert(ghost.status === 404, 'rotate-ccw should stay unreferenced and 404 if requested directly');
    assert(!html.includes('rotate-ccw') && !css.includes('rotate-ccw'), 'page must not reference rotate-ccw');
  } finally {
    server.close();
  }
});

console.log(`${passed} passed, ${failed} failed`);
if (failed) process.exit(1);
