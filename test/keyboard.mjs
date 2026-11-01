import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import http from 'http';
import { fileURLToPath, pathToFileURL } from 'url';
import { createServer } from '../src/server.js';

// Helper to locate Chrome
function findChrome() {
  const envPath = process.env.CHROME;
  const candidates = [
    envPath,
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      fs.accessSync(p, fs.constants.X_OK);
      return p;
    } catch {}
  }
  return null;
}

// Exit early if no Chrome or WebSocket support
if (!global.WebSocket || !findChrome()) {
  console.log('SKIP keyboard (no Chrome)');
  process.exit(0);
}

// Load case data to get suspect IDs
const caseData = JSON.parse(fs.readFileSync(path.resolve('content/case.json'), 'utf8'));
const suspectIds = caseData.suspects.map(s => s.id);

// Start the app server
const app = createServer({ mock: true, scoreFile: null });
const server = http.createServer(app);
await new Promise(resolve => server.listen(0, resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;

// Launch Chrome with a random debugging port
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const chromePath = findChrome();
const chrome = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--remote-debugging-port=0',
  `--user-data-dir=${userDataDir}`,
  `${baseUrl}/`,
], { stdio: ['ignore', 'ignore', 'pipe'] });

let chromeKilled = false;
function killChrome() {
  if (chromeKilled) return;
  chromeKilled = true;
  try { chrome.kill('SIGKILL'); } catch {}
  try { fs.rmSync(userDataDir, { recursive: true, force: true }); } catch {}
}

// Global watchdog (60 s)
const watchdog = setTimeout(() => {
  console.error('Test timeout – killing Chrome');
  killChrome();
  process.exit(1);
}, 60000);

// Ensure cleanup on all exit paths
function cleanup(exitCode = 0) {
  clearTimeout(watchdog);
  killChrome();
  server.close();
  process.exit(exitCode);
}
process.on('exit', () => cleanup(0));
process.on('SIGINT', () => cleanup(1));
process.on('SIGTERM', () => cleanup(1));
process.on('uncaughtException', err => {
  console.error(err);
  cleanup(1);
});

// Parse Chrome stderr to obtain DevTools WebSocket URL
let wsUrl = null;
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Chrome did not emit DevTools URL')), 10000);
  chrome.stderr.setEncoding('utf8');
  chrome.stderr.on('data', chunk => {
    const lines = chunk.split('\n');
    for (const line of lines) {
      const m = line.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (m) {
        wsUrl = m[1];
        clearTimeout(timeout);
        resolve();
        return;
      }
    }
  });
  chrome.on('error', reject);
  chrome.on('exit', code => {
    if (!wsUrl) reject(new Error(`Chrome exited early with code ${code}`));
  });
});

// Extract debugging port from wsUrl
const dbgPort = new URL(wsUrl).port;

// Helper to wait for a condition
function waitFor(condition, timeout = 5000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (function check() {
      if (condition()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('Timeout'));
      setTimeout(check, 100);
    })();
  });
}

// Wait for Chrome DevTools HTTP endpoint to be ready
await waitFor(async () => {
  try {
    const res = await fetch(`http://127.0.0.1:${dbgPort}/json/version`);
    return res.ok;
  } catch {
    return false;
  }
}, 10000);

// Get a page target id (first page target)
async function getPageTargetId() {
  const timeout = 10000;
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await fetch(`http://127.0.0.1:${dbgPort}/json/list`);
      if (res.ok) {
        const list = await res.json();
        const target = list.find(t => t.type === 'page');
        if (target && target.id) return target.id;
      }
    } catch (_) {}
    await new Promise(r => setTimeout(r, 100));
  }
  throw new Error('Page target not found');
}
const targetId = await getPageTargetId();

// Connect to CDP page target
const pageWsUrl = `${wsUrl.replace(/\/devtools\/browser\/.*/, '')}/devtools/page/${targetId}`;
const ws = new WebSocket(pageWsUrl);
await new Promise(resolve => {
  if (ws.readyState === WebSocket.OPEN) resolve();
  else ws.addEventListener('open', resolve);
});

let msgId = 1;
const pending = new Map();
ws.addEventListener('message', event => {
  const msg = JSON.parse(event.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
  }
});

function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = msgId++;
    pending.set(id, resolve);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expr) {
  const res = await send('Runtime.evaluate', { expression: expr, returnByValue: true });
  if (res.exceptionDetails) throw new Error('Eval error');
  if (res.result && res.result.result !== undefined) {
    return res.result.result.value;
  }
  if (res.result && res.result.value !== undefined) {
    return res.result.value;
  }
  throw new Error('Unexpected evaluate result');
}

// Enable required domains
await send('Page.enable');
await send('Runtime.enable');
await send('DOM.enable');
await send('Input.enable');

// Navigate to the app URL
await send('Page.navigate', { url: baseUrl + '/' });

// Wait for page load
await waitFor(async () => {
  const ready = await evaluate('document.readyState');
  return ready === 'complete';
}, 15000);

// Ensure accuse buttons are rendered
await waitFor(async () => {
  const count = await evaluate('document.querySelectorAll("#accuse-buttons button").length');
  return count >= 3;
}, 5000);

// Helper to dispatch key events
async function pressKey(key, code, vk, text) {
  await send('Input.dispatchKeyEvent', {
    type: 'keyDown',
    windowsVirtualKeyCode: vk,
    key,
    code,
    ...(text !== undefined ? { text, unmodifiedText: text } : {})
  });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: vk, key, code });
}
async function pressTab() { await pressKey('Tab', 'Tab', 9); }
async function pressEnter() { await pressKey('Enter', 'Enter', 13, '\r'); }
async function insertText(txt) { await send('Input.insertText', { text: txt }); }

// Helpers to query state
async function activeId() {
  return await evaluate(`(function(){
    const el=document.activeElement;
    if(el.id) return el.id;
    const acc=document.querySelectorAll('#accuse-buttons button');
    for(let i=0;i<acc.length;i++) if(el===acc[i]) return 'accuse-'+i;
    return el.tagName;
  })()`);
}
async function outlineNotNone(id) {
  return await evaluate(`(function(){
    const el=document.getElementById('${id}');
    if(!el) return false;
    const style=getComputedStyle(el);
    return style.outlineStyle !== 'none';
  })()`);
}

// Result tracking
let passed = 0;
let failed = 0;
function pass(name) { console.log(`PASS ${name}`); passed++; }
function fail(name, reason) { console.log(`FAIL ${name}: ${reason}`); failed++; }

// 1. Tab order and outline
const expectedOrder = ['len', 'lpt', ...suspectIds, 'q', 'ask-btn', 'player'];
const accuseCount = 3;
for (let i = 0; i < accuseCount; i++) expectedOrder.push(`accuse-${i}`);

let orderOk = true;
for (let i = 0; i < expectedOrder.length; i++) {
  await pressTab();
  const cur = await activeId();
  if (cur !== expectedOrder[i]) {
    orderOk = false;
    fail('tab-order', `expected ${expectedOrder[i]}, got ${cur} at position ${i}`);
    break;
  }
  const id = cur.startsWith('accuse-') ? null : cur;
  if (id) {
    const ok = await outlineNotNone(id);
    if (!ok) {
      orderOk = false;
      fail('outline-visible', `${id} has no outline`);
      break;
    }
  }
}
if (orderOk) pass('tab-order');

// 2. Enter on suspect selects it and moves focus to #q
for (const sid of suspectIds) {
  await evaluate(`document.getElementById('${sid}').focus()`);
  await pressEnter();
  const pressed = await evaluate(`document.getElementById('${sid}').getAttribute('aria-pressed')`);
  const focus = await evaluate(`document.activeElement.id`);
  if (pressed !== 'true') {
    fail('suspect-select', `aria-pressed not true for ${sid}`);
  } else if (focus !== 'q') {
    fail('suspect-focus', `focus not moved to q after selecting ${sid}`);
  } else {
    pass(`suspect-select-${sid}`);
  }
  break; // test first suspect only
}

// 3. Ask a question and verify log updates
await evaluate(`document.getElementById('q').focus()`);
await insertText('What is your alibi?');
await pressEnter();

await waitFor(async () => {
  const count = await evaluate(`document.querySelectorAll('#log p').length`);
  return count >= 2;
}, 5000);
const logText = await evaluate(`document.getElementById('log').innerText`);
if (logText.includes('What is your alibi?')) {
  pass('ask-question');
} else {
  fail('ask-question', 'question not logged');
}

// 4. Switching suspects retains history
const secondSuspect = suspectIds[1];
await evaluate(`document.getElementById('${secondSuspect}').focus()`);
await pressEnter();
await evaluate(`document.getElementById('q').focus()`);
await insertText('Did you see anything?');
await pressEnter();
await waitFor(async () => {
  const cnt = await evaluate(`document.querySelectorAll('#log p').length`);
  return cnt >= 2;
}, 5000);
await evaluate(`document.getElementById('${suspectIds[0]}').focus()`);
await pressEnter();
const firstLog = await evaluate(`document.getElementById('log').innerText`);
if (firstLog.includes('What is your alibi?') && !firstLog.includes('Did you see anything?')) {
  pass('history-per-suspect');
} else {
  fail('history-per-suspect', 'history not preserved per suspect');
}

// 5. Language toggle with Enter on lpt and len
await evaluate(`document.getElementById('lpt').focus()`);
await pressEnter();
let langAttr = await evaluate(`document.documentElement.lang`);
let qLabel = await evaluate(`document.getElementById('question-label').textContent`);
if (langAttr !== 'pt-BR' || qLabel !== 'Pergunta') {
  fail('lang-pt', `lang=${langAttr}, label=${qLabel}`);
} else {
  pass('lang-pt');
}
await evaluate(`document.getElementById('len').focus()`);
await pressEnter();
langAttr = await evaluate(`document.documentElement.lang`);
qLabel = await evaluate(`document.getElementById('question-label').textContent`);
if (langAttr !== 'en' || qLabel !== 'Question') {
  fail('lang-en', `lang=${langAttr}, label=${qLabel}`);
} else {
  pass('lang-en');
}

// 6. Accuse button fills verdict and focuses it
await evaluate(`document.getElementById('player').value = ''`);
await evaluate(`document.getElementById('player').focus()`);
await pressEnter();
await evaluate(`document.querySelectorAll('#accuse-buttons button')[0].focus()`);
await pressEnter();
await waitFor(async () => {
  const hidden = await evaluate(`document.getElementById('verdict').hidden`);
  return hidden === false;
}, 5000);
const verdictFocused = await evaluate(`document.activeElement.id`);
if (verdictFocused !== 'verdict') {
  fail('verdict-focus', `focus is on ${verdictFocused}`);
} else {
  pass('verdict-focus');
}

// 7. Every input has an associated label
const inputs = await evaluate(`Array.from(document.querySelectorAll('input')).map(i=>i.id)`);
let allLabeled = true;
for (const inp of inputs) {
  const hasLabel = await evaluate(`document.querySelector('label[for="${inp}"]') !== null`);
  if (!hasLabel) {
    allLabeled = false;
    fail('input-label', `input ${inp} missing label`);
    break;
  }
}
if (allLabeled) pass('input-labels');

// 8. #err exists with role=alert
const errExists = await evaluate(`document.getElementById('err') !== null`);
const errRole = await evaluate(`document.getElementById('err')?.getAttribute('role')`);
if (errExists && errRole === 'alert') {
  pass('#err-alert');
} else {
  fail('#err-alert', `exists=${errExists}, role=${errRole}`);
}

// Summary
console.log(`${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

// Cleanup (successful path)
ws.close();
cleanup(0);
