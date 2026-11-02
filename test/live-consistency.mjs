import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from '../src/server.js';
import { loadCase } from '../src/case.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LOG_PATH = path.join(__dirname, '../qa/key-usage-log.json');
const TRANSCRIPT_PATH = path.join(__dirname, '../qa/live-consistency-sprint5.txt');

async function run() {
  const keyExists = process.env.FULLCUP_KEY || await fs.readFile(path.join(__dirname, '../.fullcup-key'), 'utf-8').catch(() => null);
  if (!keyExists) {
    console.log('no key, skipped');
    process.exit(0);
  }

  const caseData = await loadCase();
  const suspects = caseData.suspects;
  const maya = suspects.find(s => s.id === 'maya');
  const carlos = suspects.find(s => s.id === 'carlos');

  const usageEntries = [];
  const transcript = [];
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalNeurons = 0;
  let totalCalls = 0;
  let failures = 0;
  const receipts = [];

  const fetchImpl = async (url, opts) => {
    const startAt = new Date().toISOString();
    const startTs = Date.now();
    const body = opts.body ? JSON.parse(opts.body) : {};
    const model = body.model || 'unknown';
    let status = 0;
    let errorText = null;
    let usage = null;
    let headers = {};

    try {
      const res = await globalThis.fetch(url, opts);
      status = res.status;
      
      for (const [k, v] of res.headers.entries()) {
        if (/^(x-fullcup|x-ratelimit|retry-after)/i.test(k)) {
          headers[k] = v;
        }
      }

      if (status >= 200 && status < 300) {
        try {
          const cloned = await res.clone().json();
          if (cloned.usage) {
            usage = cloned.usage;
            totalPromptTokens += (cloned.usage.prompt_tokens || 0);
            totalCompletionTokens += (cloned.usage.completion_tokens || 0);
            totalNeurons += (cloned.usage.neurons || 0);
          }
        } catch (e) { /* usage not in body or not JSON */ }
      } else {
        try {
          const errorBody = await res.clone().text();
          errorText = errorBody;
        } catch (e) { errorText = 'could not read error body'; }
      }
      
      return res;
    } catch (err) {
      status = 500;
      errorText = err.message;
      throw err;
    } finally {
      const ms = Date.now() - startTs;
      usageEntries.push({
        at: startAt,
        purpose: `sprint5-consistency:TODO`,
        method: 'POST',
        endpoint: '/chat/completions',
        model,
        status,
        ms,
        usage,
        cost: null,
        headers,
        error: errorText
      });
    }
  };

  const server = createServer({
    caseFile: 'content/case.json',
    scoreFile: null,
    fetchImpl,
    mock: false
  });

  const instance = server.listen(0);
  const port = instance.address().port;
  const baseUrl = `http://localhost:${port}`;

  const post = async (endpoint, body) => {
    const res = await fetch(`${baseUrl}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return { res, data };
  };

  const unknownNames = (answer) => {
    const allowList = ['Lorenzo', 'Moretti', 'Maya', 'Santos', 'Carlos', 'Mendes', 'Stradivarius', 'Aurora', 'Academy', 'Academia', 'Maestro', 'I', 'PM', 'AM'];
    const words = answer.match(/\b[A-ZÀ-Ý][a-zà-ÿ]+\b/g) || [];
    return words.filter(w => {
      const sentenceRegex = new RegExp(`(^|[.!?]\\s+)${w}\\b`, 'i');
      if (sentenceRegex.test(answer)) return false;
      if (allowList.includes(w)) return false;
      return true;
    });
  };

  let exitCode = 0;

  try {
    for (const lang of ['en', 'pt']) {
      const { data: session } = await post('/api/session', {});
      const sid = session.sessionId;

      // Maya tests
      const mayaQs = lang === 'en' 
        ? ["Did you notice anything about the lock of the violin case?", "Tell me again, was the lock normal?", "So you are saying the lock was fine?"]
        : ["Você notou algo na fechadura do estojo do violino?", "Repita, a fechadura estava normal?", "Então você diz que a fechadura estava em ordem?"];
      
      const mayaRegexPass = lang === 'en' ? /scratch|tamper|forced|damag/i : /arranh|risc|forçad|violad|danific/i;
      const mayaRegexFail = lang === 'en' ? /nothing (unusual|odd|strange|wrong)/i : /nada de (estranho|anormal|incomum)/i;

      for (const q of mayaQs) {
        totalCalls++;
        const { res, data } = await post('/api/ask', { sessionId: sid, suspectId: 'maya', question: q, lang });
        
        usageEntries[usageEntries.length - 1].purpose = `sprint5-consistency:${lang}:maya`;

        let pass = true;
        let reason = '';

        if (res.status !== 200) {
          pass = false;
          reason = `HTTP ${res.status}: ${data.message || data.error}`;
        } else {
          const ans = data.answer;
          if (!mayaRegexPass.test(ans)) {
            pass = false;
            reason = "Maya's lock story changed or inconsistent";
          } else if (mayaRegexFail.test(ans)) {
            pass = false;
            reason = 'Maya said nothing was wrong';
          }
        }

        if (!pass) failures++;
        transcript.push(`[${lang}] maya Q: ${q}\nA: ${data?.answer || 'N/A'}\ncheck: ${pass ? 'PASS' : 'FAIL ' + reason}\n`);
        
        const h = usageEntries[usageEntries.length - 1]?.headers || {};
        const rid = res.headers.get('x-fullcup-receipt-id') || h['x-fullcup-receipt-id'];
        if (rid) {
          receipts.push({ id: rid, seal: res.headers.get('x-fullcup-seal-by') || h['x-fullcup-seal-by'] });
        }
      }

      // Carlos tests
      const carlosQs = lang === 'en'
        ? ["Who else was in the academy tonight? Name everyone you saw.", "Who works with you on the cleaning staff? Give me their names."]
        : ["Quem mais estava na academia esta noite? Diga o nome de todos que você viu.", "Quem trabalha com você na limpeza? Diga os nomes."];

      for (const q of carlosQs) {
        totalCalls++;
        const { res, data } = await post('/api/ask', { sessionId: sid, suspectId: 'carlos', question: q, lang });
        
        usageEntries[usageEntries.length - 1].purpose = `sprint5-consistency:${lang}:carlos`;

        let pass = true;
        let reason = '';

        if (res.status !== 200) {
          pass = false;
          reason = `HTTP ${res.status}: ${data.message || data.error}`;
        } else {
          const ans = data.answer;
          const unknowns = unknownNames(ans);
          if (unknowns.length > 0) {
            pass = false;
            reason = `Suspect named unauthorized person: ${unknowns.join(', ')}`;
          } else if (/\bJoe\b/.test(ans)) {
            pass = false;
            reason = 'Suspect named "Joe"';
          }
        }

        if (!pass) failures++;
        transcript.push(`[${lang}] carlos Q: ${q}\nA: ${data?.answer || 'N/A'}\ncheck: ${pass ? 'PASS' : 'FAIL ' + reason}\n`);

        const h = usageEntries[usageEntries.length - 1]?.headers || {};
        const rid = res.headers.get('x-fullcup-receipt-id') || h['x-fullcup-receipt-id'];
        if (rid) {
          receipts.push({ id: rid, seal: res.headers.get('x-fullcup-seal-by') || h['x-fullcup-seal-by'] });
        }
      }
    }

    const totalLine = `Totals: calls=${totalCalls}, prompt_tokens=${totalPromptTokens}, completion_tokens=${totalCompletionTokens}, neurons=${totalNeurons.toFixed(2)}\nReceipts: ${receipts.map(r => `${r.id}(${r.seal})`).join(', ')}`;
    transcript.push(totalLine);
    await fs.mkdir(path.dirname(TRANSCRIPT_PATH), { recursive: true });
    await fs.writeFile(TRANSCRIPT_PATH, transcript.join('\n'));

    console.log(`${totalCalls - failures} passed, ${failures} failed`);
    if (failures > 0) exitCode = 1;

  } catch (err) {
    console.error('Fatal error during test:', err);
    exitCode = 1;
  } finally {
    try {
      let existing = [];
      try {
        const content = await fs.readFile(LOG_PATH, 'utf-8');
        existing = JSON.parse(content);
      } catch (e) {}
      await fs.mkdir(path.dirname(LOG_PATH), { recursive: true });
      await fs.writeFile(LOG_PATH, JSON.stringify(existing.concat(usageEntries), null, 1));
    } catch (e) {
      console.error('Failed to write usage log:', e);
    }
    instance.close();
    process.exit(exitCode);
  }
}

run();
