// M1 live playthrough through the Cup key + model access QA. Prints answers only (no key).
import { createServer, loadKey } from '../src/server.js'; import { call } from '../src/fullcup.js'; import { CASE } from '../src/case.js';
const key = loadKey(); if (!key) throw new Error('no key');
if (!process.env.SKIP_QA) {
const m = await call(key, 'GET', '/models', null, { purpose: 'qa:list-models' }); console.log('models', m.status, m.json.data.map(x => x.id).join(', '));
const ok = await call(key, 'POST', '/chat/completions', { model: '@cf/zai-org/glm-4.7-flash', messages: [{ role: 'user', content: 'Reply with: ok' }], max_tokens: 20 }, { purpose: 'qa:allowed-model' });
console.log('allowed glm-4.7-flash', ok.status, JSON.stringify(ok.headers));
for (const model of ['@cf/moonshotai/kimi-k2.6', 'deepseek-v4-pro', 'gpt-4o']) { const no = await call(key, 'POST', '/chat/completions', { model, messages: [{ role: 'user', content: 'hi' }], max_tokens: 5 }, { purpose: 'qa:disallowed-model' }); console.log('disallowed', model, no.status, JSON.stringify(no.json)); }
}
const srv = createServer({ scoreFile: null }).listen(0); await new Promise(r => srv.once('listening', r));
const B = `http://127.0.0.1:${srv.address().port}`;
const post = async (p, b, lang) => (await fetch(`${B}${p}?lang=${lang}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })).json();
console.log('status', JSON.stringify(await (await fetch(B + '/api/status')).json()));
for (const lang of ['en', 'pt']) {
  const { sessionId } = await post('/api/session', {}, lang); const hist = {};
  const qs = lang === 'en' ? [['tomas', 'What did you see at 23:00?'], ['lia', 'Did you notice anything about Marta this morning?'], ['marta', 'Where were you last night?'], ['tomas', 'Did you find any remains of the ledger?']]
    : [['tomas', 'O que você viu às 23h?'], ['lia', 'Notou algo na Marta hoje cedo?'], ['marta', 'Onde você estava ontem à noite?']];
  for (const [id, q] of qs) { const h = hist[id] ||= []; const r = await post('/api/ask', { suspectId: id, question: q, sessionId, history: h }, lang);
    console.log(`[${lang}] ${id} <- ${q}\n      -> ${r.answer || r.code + ': ' + r.error}`); h.push({ role: 'user', content: q }, { role: 'assistant', content: r.answer || '' }); }
  const v = await post('/api/accuse', { suspectId: 'marta', sessionId, player: `live-${lang}` }, lang); console.log(`[${lang}] VERDICT correct=${v.correct} score=${v.score}`);
}
srv.close(); console.log('culprit', CASE.culprit);
