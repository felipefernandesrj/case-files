// M1 sprint 3: real keyboard test in headless Chrome over CDP (no deps). Skips if Chrome is missing.
import assert from 'node:assert/strict'; import { spawn } from 'node:child_process'; import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
process.env.MOCK = '1';
const CHROME = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => p && fs.existsSync(p));
if (!CHROME || typeof WebSocket === 'undefined') { console.log('skip keyboard test (no Chrome / WebSocket)'); process.exit(0); }
const { createServer } = await import('../src/server.js');
const srv = createServer({ scoreFile: null }).listen(0); await new Promise(r => srv.once('listening', r));
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-kb-'));
const ch = spawn(CHROME, ['--headless=new', '--no-sandbox', '--disable-gpu', '--remote-debugging-port=0', `--user-data-dir=${dir}`, '--lang=en-US', 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };
try {
  const wsUrl = await new Promise((ok, no) => { let e = ''; ch.stderr.on('data', d => { e += d; const m = e.match(/ws:\/\/\S+/); if (m) ok(m[0]); }); setTimeout(() => no(new Error('chrome did not start')), 15000).unref(); });
  const port = new URL(wsUrl).port;
  const page = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = e => { const m = JSON.parse(e.data); if (pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
  const cdp = (method, params = {}) => new Promise(ok => { const i = ++id; pend.set(i, ok); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async x => (await cdp('Runtime.evaluate', { expression: x, awaitPromise: true, returnByValue: true })).result.result.value;
  const key = async (k, code = k, vk = { Tab: 9, Enter: 13 }[k]) => { for (const type of ['keyDown', 'keyUp']) await cdp('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, ...(k === 'Enter' && type === 'keyDown' ? { text: '\r' } : {}) }); };
  const until = async (x, ms = 5000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await ev(x)) return true; await new Promise(r => setTimeout(r, 50)); } return false; };
  const focused = () => ev(`(e=>e.id||e.dataset.id||e.textContent.trim().slice(0,20))(document.activeElement)`);
  await cdp('Page.navigate', { url: `http://127.0.0.1:${srv.address().port}/` });
  assert(await until(`document.querySelectorAll('#acc button').length===3`), 'page loaded');
  await t('Tab reaches every control in order, each with a visible focus outline', async () => {
    const seen = [];
    for (let i = 0; i < 11; i++) { await key('Tab'); seen.push(await focused());
      assert.notEqual(await ev(`getComputedStyle(document.activeElement).outlineStyle`), 'none', `focus visible on ${seen.at(-1)}`); }
    assert.deepEqual(seen.slice(0, 8), ['len', 'lpt', 'marta', 'tomas', 'lia', 'q', 'Ask', 'player']);
    assert.equal(seen.slice(8).filter(s => /^Accuse /.test(s)).length, 3);
  });
  await t('Enter on a suspect selects it (aria-pressed) and moves focus to the question box', async () => {
    await ev(`document.querySelector('#sus [data-id=lia]').focus()`); await key('Enter');
    assert.equal(await ev(`document.querySelector('#sus [data-id=lia]').getAttribute('aria-pressed')`), 'true');
    assert.equal(await focused(), 'q');
  });
  await t('Enter in the question box submits and the answer lands in the aria-live log', async () => {
    await cdp('Input.insertText', { text: 'Did you notice anything about Marta?' }); await key('Enter');
    assert(await until(`/soot/.test(document.getElementById('log').textContent)`), 'answer shown');
    assert.equal(await ev(`document.getElementById('log').getAttribute('aria-live')`), 'polite');
    assert.equal(await ev(`document.getElementById('q').value`), '');
  });
  await t('language toggle works from the keyboard and reports state', async () => {
    await ev(`document.getElementById('lpt').focus()`); await key('Enter');
    assert(await until(`document.documentElement.lang==='pt-BR' && document.querySelector('label[for=q]').textContent.startsWith('Faça')`));
    assert.equal(await ev(`document.getElementById('lpt').getAttribute('aria-pressed')`), 'true');
    assert.equal(await ev(`document.getElementById('len').getAttribute('aria-pressed')`), 'false');
    assert.equal(await focused(), 'lpt');
  });
  await t('Enter on an accuse button gives the verdict in a live status region', async () => {
    await ev(`[...document.querySelectorAll('#acc button')].find(b=>/Marta/.test(b.textContent)).focus()`); await key('Enter');
    assert(await until(`/Caso resolvido/.test(document.getElementById('verdict').textContent)`));
    assert.equal(await ev(`document.getElementById('verdict').getAttribute('role')`), 'status');
  });
  ws.close(); console.log(`\n${n}/${n} keyboard passed`);
} finally { ch.kill('SIGKILL'); srv.closeAllConnections?.(); srv.close(); fs.rmSync(dir, { recursive: true, force: true }); }
