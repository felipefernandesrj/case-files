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

// Central command processor (shared between interactive & piped mode)
async function processCommand(line) {
  const parts = line.trim().split(' ');
  const cmd = parts[0].toLowerCase();

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
    return false;
  }
  // Adjust language based on Portuguese command aliases
  if (['pergunta', 'acusar', 'historico', 'sair'].includes(cmd)) {
    lang = 'pt';
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
        if (lang === 'pt') {
          console.log(resp.correct ? 'Correto!' : 'Errado.');
          console.log(`Culprit: ${resp.culpritName}`);
          console.log(`Solução: ${resp.solution}`);
          console.log(`Score: ${resp.score} (questions asked: ${resp.questions})\n`);
        } else {
          console.log(resp.correct ? 'Correct!' : 'Wrong.');
          console.log(`Culprit: ${resp.culpritName}`);
          console.log(`Solution: ${resp.solution}`);
          console.log(`Score: ${resp.score} (questions asked: ${resp.questions})\n`);
        }

        const top = await getJSON(`${baseUrl}/api/scores`);
        console.log('--- Top Scores ---');
        top.forEach((e, idx) => {
          console.log(
            `${idx + 1}. ${e.player} - ${e.score} pts (${e.questions} Q) [${e.lang}]`,
          );
        });
        return true; // signal termination
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
      return true;
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
  return false;
}

// Main flow
await displayIntro();

// Create a session
const { sessionId } = await postJSON(`${baseUrl}/api/session`, {});

let terminated = false;

// Interactive (TTY) mode
if (process.stdin.isTTY) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  rl.setPrompt('> ');
  rl.prompt();

  for await (const rawLine of rl) {
    const line = rawLine.trim();
    if (!line) {
      rl.prompt();
      continue;
    }
    terminated = await processCommand(line);
    if (terminated) {
      rl.close();
      break;
    }
    rl.prompt();
  }
} else {
  // Piped / non‑interactive mode: read all stdin at once
  let stdinData = '';
  for await (const chunk of process.stdin) {
    stdinData += typeof chunk === 'string' ? chunk : chunk.toString();
  }
  const lines = stdinData.split(/\r?\n/).filter((l) => l.trim().length > 0);
  for (const line of lines) {
    terminated = await processCommand(line);
    if (terminated) break;
  }
}

// Cleanup
server.close();
process.exit(0);
