import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { resolve, join } from 'path';
import { fileURLToPath } from 'url';
import { env } from 'process';
import { URL } from 'url';

// Resolve directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..', '..');

// Load case data
let caseData;
try {
  const casePath = join(__dirname, 'content', 'case.json');
  const raw = await readFile(casePath, 'utf8');
  caseData = JSON.parse(raw);
} catch (e) {
  console.error('Failed to load case data:', e);
  process.exit(1);
}

// Determine key / mock mode
let fullcupKey = env.FULLCUP_KEY?.trim();
if (!fullcupKey) {
  try {
    const keyFile = await readFile('.fullcup-key', 'utf8');
    fullcupKey = keyFile.trim();
  } catch (_) {
    fullcupKey = '';
  }
}
const MOCK = env.MOCK === '1' || !fullcupKey;
const BASE_URL = env.FULLCUP_BASE_URL?.replace(/\/+$/, '') || 'https://qa-api.fullcup.ai/v1';
const PORT = Number(env.PORT) || 3000;

// Helper: send JSON response
function json(res, status, obj) {
  const payload = JSON.stringify(obj);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  });
  res.end(payload);
}

// Helper: parse JSON body
async function parseJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const data = Buffer.concat(chunks).toString();
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Helper: friendly capacity message
function capacityMessage(lang) {
  const msgs = {
    en: 'The game is currently out of capacity. Please try again later.',
    pt: 'O jogo está sem capacidade no momento. Por favor, tente novamente mais tarde.',
  };
  return msgs[lang] || msgs.en;
}

// Helper: friendly upstream error
function upstreamMessage(lang) {
  const msgs = {
    en: 'There was an error contacting the AI service. Please try again later.',
    pt: 'Ocorreu um erro ao contatar o serviço de IA. Por favor, tente novamente mais tarde.',
  };
  return msgs[lang] || msgs.en;
}

// Main request handler
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    // Serve static index.html
    if (req.method === 'GET' && pathname === '/') {
      try {
        const htmlPath = join(__dirname, 'public', 'index.html');
        const data = await readFile(htmlPath);
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(data);
      } catch (e) {
        json(res, 500, { error: 'internal', message: 'Failed to load index.html' });
      }
      return;
    }

    // API routes
    if (pathname.startsWith('/api/')) {
      // CORS preflight
      if (req.method === 'OPTIONS') {
        res.writeHead(204, {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
      }

      // GET case info
      if (req.method === 'GET' && pathname === '/api/case') {
        const lang = url.searchParams.get('lang')?.toLowerCase() === 'pt' ? 'pt' : 'en';
        const { title, intro, suspects } = caseData;
        const outSuspects = suspects.map(s => ({
          id: s.id,
          name: s.name,
          role: s.role[lang],
          persona: s.persona[lang],
        }));
        json(res, 200, {
          title: title[lang],
          intro: intro[lang],
          suspects: outSuspects,
        });
        return;
      }

      // POST ask
      if (req.method === 'POST' && pathname === '/api/ask') {
        const body = await parseJson(req);
        if (!body || typeof body.suspectId !== 'string' || typeof body.question !== 'string' || !body.question.trim()) {
          json(res, 400, { error: 'bad_request', message: 'Missing or empty suspectId/question' });
          return;
        }
        const lang = body.lang?.toLowerCase() === 'pt' ? 'pt' : 'en';
        const suspect = caseData.suspects.find(s => s.id === body.suspectId);
        if (!suspect) {
          json(res, 400, { error: 'bad_request', message: 'Invalid suspectId' });
          return;
        }

        // Mock mode handling
        if (MOCK) {
          const canned = {
            en: `${suspect.name} says nothing of interest.`,
            pt: `${suspect.name} não tem nada a dizer.`,
          };
          json(res, 200, { answer: canned[lang] });
          return;
        }

        // Build system prompt; handle facts being string or array
        const factsText = Array.isArray(suspect.facts) ? suspect.facts.join(' ') : String(suspect.facts);
        const systemPrompt = `You are ${suspect.name}, ${suspect.role[lang]}. Facts: ${factsText}`;
        const messages = [{ role: 'system', content: systemPrompt }];

        // History if provided
        if (Array.isArray(body.history)) {
          for (const turn of body.history) {
            if (turn.q) messages.push({ role: 'user', content: turn.q });
            if (turn.a) messages.push({ role: 'assistant', content: turn.a });
          }
        }

        messages.push({ role: 'user', content: body.question });

        const payload = {
          model: '@cf/meta/llama-4-scout-17b-16e-instruct',
          messages,
          max_tokens: 300,
        };

        try {
          const resp = await fetch(`${BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${fullcupKey}`,
              'Content-Type': 'application/json',
              'X-FullCup-Workload': 'caso-3-atos',
            },
            body: JSON.stringify(payload),
          });

          const respJson = await resp.json();

          // Capacity handling
          if (resp.status === 402 ||
            (resp.status === 429 && respJson?.error?.message?.includes('capacity:empty'))) {
            json(res, 402, { error: 'capacity', message: capacityMessage(lang) });
            return;
          }

          if (!resp.ok) {
            json(res, 502, { error: 'upstream', message: upstreamMessage(lang) });
            return;
          }

          const answer = respJson?.choices?.[0]?.message?.content?.trim() ?? '';
          json(res, 200, { answer });
        } catch (e) {
          json(res, 502, { error: 'upstream', message: upstreamMessage(lang) });
        }
        return;
      }

      // POST accuse
      if (req.method === 'POST' && pathname === '/api/accuse') {
        const body = await parseJson(req);
        if (!body || typeof body.suspectId !== 'string') {
          json(res, 400, { error: 'bad_request', message: 'Missing suspectId' });
          return;
        }
        const lang = body.lang?.toLowerCase() === 'pt' ? 'pt' : 'en';
        const isCorrect = body.suspectId === caseData.culprit;
        const response = {
          correct: isCorrect,
          culprit: caseData.culprit,
          solution: caseData.solution[lang],
        };
        json(res, 200, response);
        return;
      }

      // Unknown API route
      json(res, 404, { error: 'not_found' });
      return;
    }

    // Fallback 404
    json(res, 404, { error: 'not_found' });
  } catch (err) {
    console.error('Unhandled error:', err);
    if (!res.headersSent) {
      json(res, 500, { error: 'internal', message: 'Internal server error' });
    } else {
      // If headers already sent, just end the response
      res.end();
    }
  }
});

// Start server
server.listen(PORT, () => {
  console.log(`Server listening on ${PORT}`);
});
