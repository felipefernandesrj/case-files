# FullCup proxy API contract
- Base URL from env FULLCUP_BASE_URL, default https://qa-api.fullcup.ai/v1
- Key from env FULLCUP_KEY or file .fullcup-key in project root (trimmed). No key => mock mode.
- POST {BASE}/chat/completions, headers: Authorization: Bearer <key>, Content-Type: application/json, optional X-FullCup-Workload: <string>.
- Body (OpenAI-compatible): {"model":"@cf/meta/llama-4-scout-17b-16e-instruct","messages":[{"role":"system|user|assistant","content":"..."}],"max_tokens":300}
- 200: {"choices":[{"message":{"role":"assistant","content":"..."}}],"usage":{"prompt_tokens":n,"completion_tokens":n,"total_tokens":n}}
- 401 invalid key. 402 Cup has no capacity. 429 rate limit; if body error code/message contains "capacity:empty" it also means no capacity. 5xx upstream error.
- Error body: {"error":{"message":"...","code":"..."}}

# Current project files (written by you)
<<<FILE src/cli.js>>>
import { createServer } from './server.js';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import readline from 'readline';
import { randomUUID } from 'node:crypto';
import { URLSearchParams } from 'node:url';

// Helper to perform fetch with JSON body
async function postJSON(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

async function getJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// Parse CLI args
const args = process.argv.slice(2);
let lang = 'en';
let player = 'anon';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--lang' && i + 1 < args.length) {
    lang = args[i + 1] === 'pt' ? 'pt' : 'en';
    i++;
  } else if (args[i] === '--player' && i + 1 < args.length) {
    player = args[i + 1].slice(0, 24);
    i++;
  }
}

// Start server on random port
const server = await createServer({
  caseFile: 'content/case.json',
  mock: true,
});
await new Promise((resolve) => server.listen(0, resolve));
const address = server.address();
const baseUrl = `http://localhost:${address.port}`;

// Helper to display case intro
async function displayIntro() {
  const data = await getJSON(`${baseUrl}/api/case?lang=${lang}`);
  console.log(`\n=== ${data.title} ===\n`);
  console.log(data.intro);
  console.log('\nSuspects:');
  data.suspects.forEach((s) => {
    console.log(`- ${s.id}: ${s.name} (${s.role})`);
  });
  console.log('');
}

// History storage
const histories = new Map(); // suspectId -> [{q, a}]

async function main() {
  await displayIntro();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: process.stdin.isTTY,
  });

  // Create a session
  const { sessionId } = await postJSON(`${baseUrl}/api/session`, {});

  let terminated = false; // tracks whether we should stop prompting

  // Prompt only when in interactive (TTY) mode
  if (process.stdin.isTTY) {
    rl.setPrompt('> ');
    rl.prompt();
  }

  // Process each line sequentially
  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) {
      if (!terminated && process.stdin.isTTY) rl.prompt();
      continue;
    }

    const parts = line.split(' ');
    const cmd = parts[0].toLowerCase();

    // PT aliases
    const cmdMap = {
      pergunta: 'ask',
      acusar: 'accuse',
      historico: 'history',
      sair: 'quit',
      quit: 'quit',
      ask: 'ask',
      accuse: 'accuse',
      history: 'history',
    };
    const action = cmdMap[cmd] || null;

    if (!action) {
      console.log('Unknown command');
      if (!terminated && process.stdin.isTTY) rl.prompt();
      continue;
    }

    try {
      if (action === 'ask') {
        const suspectId = parts[1];
        const question = parts.slice(2).join(' ');
        if (!suspectId || !question) {
          console.log('Usage: ask <suspectId> <question>');
        } else {
          const resp = await postJSON(`${baseUrl}/api/ask`, {
            sessionId,
            suspectId,
            question,
            lang,
          });
          console.log(`\n${resp.answer}\n`);
          const hist = histories.get(suspectId) || [];
          hist.push({ q: question, a: resp.answer });
          histories.set(suspectId, hist);
        }
      } else if (action === 'accuse') {
        const suspectId = parts[1];
        if (!suspectId) {
          console.log('Usage: accuse <suspectId>');
        } else {
          const resp = await postJSON(`${baseUrl}/api/accuse`, {
            sessionId,
            suspectId,
            player,
            lang,
          });
          console.log('\n=== Verdict ===');
          console.log(resp.correct ? 'Correct!' : 'Wrong.');
          console.log(`Culprit: ${resp.culpritName}`);
          console.log(`Solution: ${resp.solution}`);
          console.log(`Score: ${resp.score} (questions asked: ${resp.questions})\n`);

          // Show scoreboard
          const top = await getJSON(`${baseUrl}/api/scores`);
          console.log('--- Top Scores ---');
          top.forEach((e, idx) => {
            console.log(
              `${idx + 1}. ${e.player} - ${e.score} pts (${e.questions} Q) [${e.lang}]`,
            );
          });
          terminated = true;
        }
      } else if (action === 'history') {
        const suspectId = parts[1];
        if (!suspectId) {
          console.log('Usage: history <suspectId>');
        } else {
          const hist = histories.get(suspectId) || [];
          if (hist.length === 0) {
            console.log('No history for this suspect.');
          } else {
            hist.forEach((pair, i) => {
              console.log(`${i + 1}. Q: ${pair.q}`);
              console.log(`   A: ${pair.a}`);
            });
          }
        }
      } else if (action === 'quit') {
        terminated = true;
      }
    } catch (e) {
      console.error('Error:', e.message);
    }

    if (terminated) {
      rl.close();
      break;
    }

    if (process.stdin.isTTY) rl.prompt();
  }

  // Cleanup after loop ends (either EOF or quit)
  server.close();
  process.exit(0);
}

await main();
<<<END>>>

# Test output

=== The Vanishing Violin ===

During a rehearsal at the Aurora Music Academy, the priceless Stradivarius violin disappears from the instrument room. Three people were present that night: the charismatic conductor, a nervous violin prodigy, and the longtime janitor. Who took the priceless instrument?

Suspects:
- lorenzo: Lorenzo Moretti (Conductor)
- maya: Maya Santos (Violinist)
- carlos: Carlos Mendes (Janitor)

exit=124
Above: full output when piping 3 commands (ask maya cart? / history maya / accuse carlos). The commands produce NO output at all: no answer, no history, no verdict. Expected an answer, the history and the verdict with score. Find why lines are never processed and fix.

# Task
Fix the bug(s). Output ONLY the files you change, full content. Never output content/case.json (it is real data, do not touch).
