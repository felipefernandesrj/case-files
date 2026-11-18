// QA harness (not product): game feel sprint 13 (locked question box visual state) in mock mode via headless Chrome CDP.
// Usage: node tools/probe-gf13.mjs <outdir> <prefix>   (prefix before|after). Writes qa/m2gf13-probes/probe-<prefix>.json
// States measured on the Talk step: open (fresh game), out (budget spent), over (after an accusation), reduced motion out.
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import { spawn } from 'node:child_process';
import { createServer } from '../src/server.js';
const OUT = process.argv[2] || '/workspace/casefiles-qa/run41'; const PFX = process.argv[3] || 'before';
const server = createServer({ caseFile: 'content/case.json', scoreFile: path.join(os.tmpdir(), `s-${Date.now()}.json`), mock: true });
await new Promise(r => server.listen(0, r)); const base = `http://127.0.0.1:${server.address().port}/`;
const ud = fs.mkdtempSync(path.join(os.tmpdir(), 'chr-'));
const ch = spawn('/usr/bin/google-chrome', ['--headless=new', '--no-sandbox', '--hide-scrollbars', '--remote-debugging-port=0', `--user-data-dir=${ud}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
const wsUrl = await new Promise(res => ch.stderr.on('data', d => { const m = String(d).match(/(ws:\/\/\S+)/); if (m) res(m[1]); }));
const port = new URL(wsUrl).port; await new Promise(r => setTimeout(r, 800));
const t = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(x => x.type === 'page');
const ws = new WebSocket(t.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r));
let id = 0; const pend = new Map();
ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: true }); });
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => (await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true })).result?.result?.value;
const wait = ms => new Promise(r => setTimeout(r, ms));
const shot = async (file) => {
  const clip = await ev(`(()=>{const f=document.getElementById('conversation');if(!f)return null;f.scrollIntoView({block:'end'});const b=document.getElementById('ask-form').getBoundingClientRect();const top=Math.max(0,b.top-60+scrollY);return {x:0,y:top,width:innerWidth,height:Math.min(320,innerHeight),scale:1}})()`);
  const r = await send('Page.captureScreenshot', clip ? { format: 'png', clip, captureBeyondViewport: true } : { format: 'png' }); fs.writeFileSync(file, Buffer.from(r.result.data, 'base64'));
};
await send('Page.enable'); await send('Runtime.enable');
const fresh = async (w, h, L, rm) => {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 });
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }] });
  await send('Page.navigate', { url: base }); await wait(2500);
  if (L === 'pt') { await ev(`document.getElementById('lpt').click()`); await wait(1500); }
};
const step = (s) => `(()=>{document.querySelector('#steps [data-step="${s}"]').click();return true})()`;
const pick = (name) => `(()=>{const b=[...document.querySelectorAll('#suspect-buttons button')].find(x=>x.textContent.includes(${JSON.stringify(name)}));if(!b)return false;b.click();return true})()`;
const ask = (q) => `(()=>{const i=document.getElementById('q');i.value=${JSON.stringify(q)};document.getElementById('ask-btn').click();return true})()`;
// look of the question box and Ask button; WCAG contrast of text and placeholder on the box background
const look = `(()=>{const rgb=s=>{const m=s.match(/[\\d.]+/g).map(Number);return {r:m[0],g:m[1],b:m[2],a:m[3]??1}};
 const L=c=>{const f=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};return 0.2126*f(c.r)+0.7152*f(c.g)+0.0722*f(c.b)};
 const mix=(fg,bg)=>({r:fg.r*fg.a+bg.r*(1-fg.a),g:fg.g*fg.a+bg.g*(1-fg.a),b:fg.b*fg.a+bg.b*(1-fg.a)});
 const cr=(fg,bg)=>{const a=L(mix(fg,bg)),b=L(bg);return Math.round(((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05))*100)/100};
 const box=el=>{const s=getComputedStyle(el);const bg=rgb(s.backgroundColor);const op=Number(s.opacity);return {disabled:el.disabled,ariaDisabled:el.getAttribute('aria-disabled'),bg:s.backgroundColor,color:s.color,border:s.borderColor+' '+s.borderStyle,cursor:s.cursor,opacity:op,filter:s.filter,contrast:cr(rgb(s.color),bg)}};
 const q=document.getElementById('q');const a=document.getElementById('ask-btn');const qs=box(q);const ps=getComputedStyle(q,'::placeholder');
 qs.placeholder=q.placeholder;qs.placeholderColor=ps.color;qs.placeholderContrast=q.placeholder?cr(rgb(ps.color),rgb(getComputedStyle(q).backgroundColor)):null;
 const f=document.getElementById('ask-form');return {q:qs,ask:box(a),askLabel:a.textContent.trim(),formClass:f.className,askMsg:document.getElementById('ask-msg').hidden?'':document.getElementById('ask-msg').textContent.trim(),questionsUsed:document.getElementById('questions-used').textContent.trim()}})()`;
const report = {};
const diff = (a, b) => ['bg', 'color', 'cursor', 'opacity', 'border'].filter(k => a[k] !== b[k]);
for (const [w, h] of [[1280, 800], [390, 844]]) {
  for (const L of ['en', 'pt']) {
    const r = {}; const tag = `${w}-${L}`;
    await fresh(w, h, L, false); await ev(step('suspects')); await wait(300);
    await ev(pick('Lorenzo')); await wait(400); await ev(step('talk')); await wait(400);
    r.open = await ev(look); await shot(path.join(OUT, `${PFX}-${tag}-open.png`));
    for (let i = 0; i < 12; i++) { if (await ev(`document.getElementById('ask-btn').disabled`)) break; await ev(ask(`Where were you at nine? (${i + 1})`)); await wait(i < 2 ? 1500 : 500); }
    await wait(800); r.out = await ev(look); await shot(path.join(OUT, `${PFX}-${tag}-out.png`));
    r.outChanged = { q: diff(r.open.q, r.out.q), ask: diff(r.open.ask, r.out.ask) };
    await ev(`localStorage.setItem('cf-confirm-accuse','0')`); await ev(step('accuse')); await wait(400);
    await ev(`(()=>{const b=[...document.querySelectorAll('#accuse-buttons button')].find(x=>x.textContent.includes('Carlos'));b.click();return true})()`); await wait(1800);
    await ev(step('talk')); await wait(500); r.over = await ev(look); await shot(path.join(OUT, `${PFX}-${tag}-over.png`));
    r.overChanged = { q: diff(r.open.q, r.over.q), ask: diff(r.open.ask, r.over.ask) };
    await ev(`document.getElementById('restart-btn').click()`); await wait(1500); await ev(step('talk')); await wait(400);
    r.restart = await ev(look);
    report[tag] = r;
  }
}
// reduced motion: out state must look locked with no animation on the box
{
  await fresh(1280, 800, 'en', true); await ev(step('suspects')); await wait(300); await ev(pick('Lorenzo')); await wait(300); await ev(step('talk')); await wait(300);
  for (let i = 0; i < 12; i++) { if (await ev(`document.getElementById('ask-btn').disabled`)) break; await ev(ask(`Where were you? (${i + 1})`)); await wait(500); }
  await wait(600); const lk = await ev(look);
  const anim = await ev(`[...document.querySelectorAll('#ask-form, #ask-form *, #q-budget, #q-budget *')].map(n=>getComputedStyle(n)).filter(s=>s.animationName!=='none'||(parseFloat(s.transitionDuration)>0.001&&s.transitionProperty!=='none')).length`);
  report.reducedMotion = { look: lk, animatedOrTransitioning: anim };
  await shot(path.join(OUT, `${PFX}-1280-en-reduced-out.png`));
}
const dir = process.env.PROBE_DIR || 'qa/m2gf13-probes'; fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, `probe-${PFX}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
ws.close(); ch.kill(); server.close(); process.exit(0);
