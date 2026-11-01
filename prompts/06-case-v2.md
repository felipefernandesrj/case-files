# Product docs
# PRD — Caso em 3 Atos
## Goal
Fund $120 of compute in 4 milestones to grow Caso em 3 Atos into a pack of AI detective games running on Workers AI: M1 polish Caso em 3 Atos ($25), M2 The Night Train on a shared engine ($30), M3 a validated case generator ($35), M4 the published pack with picker, scoreboard and public cost log ($30).
## Problem
Test creator project for FullCup: a small, fun app whose every action is a metered model call, exercising consumption, 402 and empty-key paths.
## Users
Players in a browser; the creator who funds it via a Cup.
## Requirements
- Interrogate 3 suspects in free text; each answers in character, consistent with hidden facts.
- Accuse one suspect; reveal verdict and solution.
- Key never reaches the browser. Works without key (mock mode).
- When the Cup has no capacity (402, or 429 `capacity:empty`), the player sees a clear message, not an error dump.
## Out of scope (M1)
Images, generated cases, scoreboard.

# Case Files: a pack of AI detective games

[![Case Files: AI detective games pack on FullCup](https://qa.fullcup.ai/projects/case-files-ai-detective-games-pack/badge.svg)](https://qa.fullcup.ai/cups/case-files-ai-detective-games-pack?ref=badge)

## Overview

Hi, I'm Caio Ventura. I make small browser mystery games where an AI plays every suspect. You ask questions, they lie, and you name the culprit.

This repo starts from **Caso em 3 Atos**, a working prototype: three suspects played by a language model, an interrogation room and a verdict. Every question is one model call through the FullCup proxy, so the game runs on capacity from backers. It uses only open models on Cloudflare Workers AI.

**The plan:** turn the prototype into a pack of four cases. I don't build ahead of the funding. Each milestone starts when its budget is funded, and I post progress, the cost of each case and play receipts as I go.


# Feature spec v2 (M1 parity). Node 20+, ES modules, ZERO npm deps.

## Case data: content/case.json
{id,title{en,pt},intro{en,pt},culprit,
 suspects:[{id,name,role{en,pt},persona{en,pt},facts:string (English private role-play instructions)}],
 clues:[{id,from:suspectId,ask:string (EN example question that reveals it),keywords:[lowercase EN+PT words that trigger it],implicates:suspectId|null,clears:suspectId|null,text{en,pt}}],
 glossary:[{en,pt}] (fixed PT-BR translations of key nouns; the role-play prompt in PT must enforce them),
 solution{en,pt}}

## Modules (exact exports)
- src/case.js: loadCase(file='content/case.json') -> case object; publicCase(c, lang) -> {id,title,intro,suspects:[{id,name,role,persona}]} (strings in lang, NEVER facts/culprit/solution/clues); fairPlay(c) -> {ok:boolean, reasons:[string]}: ok only if there are exactly 3 suspects, culprit is a suspect id, at least 2 clues implicate the culprit, every innocent is cleared by at least one clue, every clue.from is a suspect id, and every clue has non-empty ask, keywords, text.en, text.pt. systemPrompt(c, suspectId, lang) -> string: in character, uses facts and that suspect's clues (reveal a clue's text when the question touches it), never confess outright, reply in the language (PT-BR when lang=pt, with "Use these exact PT-BR terms:" + glossary lines; EN prompt has no glossary), max 80 words. capWords(text, n=80) -> text trimmed to at most n words (ending with "…" when cut).
- src/proxy.js: createProxy({key, baseUrl, fetchImpl=fetch, model='@cf/meta/llama-4-scout-17b-16e-instruct'}) -> {chat(messages) -> Promise<string>}. POST {baseUrl}/chat/completions, Authorization Bearer, header X-FullCup-Workload: case-files:play. Errors throw an Error with .code: 402 -> 'no_capacity'; 429 whose body (error.code or message or raw text) contains 'capacity:empty' -> 'no_capacity'; other 429 -> 'rate_limited'; 401/403 -> 'bad_key'; anything else -> 'upstream'. Never include the key in errors or logs.
- src/mock.js: mockAnswer(c, suspectId, question, lang) -> deterministic in-character string in lang; if the question matches a clue's keywords (case-insensitive) for that suspect, the answer includes that clue's text[lang]. No network.
- src/messages.js: friendly(code, lang) -> short friendly sentence EN/PT for no_capacity ("this Cup is out of capacity, backers can refill it"), rate_limited (try again in a moment), bad_key (game key not configured or invalid, the creator was notified), upstream, bad_request.
- src/scoreboard.js: scoreFor(correct, questions) = correct ? max(10, 100 - 5*max(0, questions-3)) : 0. createScoreboard(file|null) -> {add({player,score,questions,correct,lang,at}), top(n=10)}; sorted by score desc, then fewer questions, then earlier at; keeps 100; persists JSON to file if file is set (create dir). Default file data/scores.json.
- src/server.js: export createServer({caseFile, scoreFile='data/scores.json', key, baseUrl, fetchImpl, mock}) returning an http.Server (not listening). If run directly (import.meta.url is the entry), listen on PORT||3000 and print the URL. Key from opts.key, else env FULLCUP_KEY, else file .fullcup-key; mock = opts.mock ?? (env MOCK==='1' || no key). Routes (JSON; lang from body.lang or ?lang, default en):
  GET / -> public/index.html. GET /api/status -> {mode:'mock'|'live', caseId}. GET /api/case -> publicCase. POST /api/session -> {sessionId} (random). POST /api/ask {sessionId,suspectId,question,lang} -> {answer, questions:<count for session>}; per-session per-suspect history kept on the server and sent to the model as prior turns; answer passed through capWords(…,80). POST /api/accuse {sessionId,suspectId,player,lang} -> {correct,culprit,culpritName,solution,score,questions}; adds to scoreboard (player default 'anon', max 24 chars); second accuse in same session -> 409. GET /api/scores -> top 10.
  Validation -> 400 {error:'bad_request',message}: unknown suspect, empty/over-500-char question, unknown session. Proxy errors -> status 402 (no_capacity), 429 (rate_limited), 503 (bad_key), 502 (upstream) with {error:code, message:friendly(code,lang)}. Unhandled errors -> 500 JSON, never crash. Never send the key to the client.
- src/cli.js: terminal play: `node src/cli.js [--lang pt] [--player name]`; starts createServer on port 0, prints title, intro, suspects; commands `ask <id> <question>`, `accuse <id>`, `history <id>`, `quit` (PT aliases pergunta/acusar/historico/sair). Works with piped stdin (exit after accuse or EOF).

## Web page public/index.html (single file, inline CSS+JS)
- Language toggle: two buttons id="len" (EN) and id="lpt" (PT) with aria-pressed reflecting state; switching re-renders all UI text and the case; html lang attribute updated ("en"/"pt-BR").
- Suspects: a group of 3 buttons (data-id=suspect id), aria-pressed on the selected one; selecting moves focus to the question input id="q".
- Form: <label for="q">, input id="q", submit button "Ask"/"Perguntar"; Enter submits. Per-suspect conversation log (all previous Q&A for the selected suspect, persisted while switching suspects) in an element id="log" with role="log" aria-live="polite". While waiting show "…thinking" text and disable the button.
- Player name input id="player" with label. Accuse section id="acc" with 3 buttons "Accuse <name>"/"Acusar <name>". Verdict in id="verdict" role="status" aria-live="assertive", focus moves to it (tabindex=-1), shows correct/wrong, solution and score; then a scoreboard table (GET /api/scores) with caption.
- Errors (402/429/503/502) shown as the friendly message in a role="alert" element id="err".
- Visible focus outline on every interactive element (:focus-visible outline 3px). Tab order: len, lpt, 3 suspects, q, Ask, player, 3 accuse buttons. Good contrast, responsive.

# Your previous case file (to upgrade)
<<<FILE content/case.json>>>
{
  "id": "case-violin-001",
  "title": {
    "en": "The Vanishing Violin",
    "pt": "O Violino Desaparecido"
  },
  "intro": {
    "en": "During a rehearsal at the Aurora Music Academy, the priceless Stradivarius violin disappears from the instrument room. Three people were present that night: the charismatic conductor, a nervous violin prodigy, and the longtime janitor. Who took the priceless instrument?",
    "pt": "Durante um ensaio na Academia de Música Aurora, o valioso violino Stradivarius desaparece da sala de instrumentos. Três pessoas estavam presentes naquela noite: o carismático maestro, a prodígio violonista nervosa e o zelador de longa data. Quem levou o precioso instrumento?"
  },
  "culprit": "carlos",
  "suspects": [
    {
      "id": "lorenzo",
      "name": "Lorenzo Moretti",
      "role": {
        "en": "Conductor",
        "pt": "Maestro"
      },
      "persona": {
        "en": "A passionate, slightly flamboyant conductor who prides himself on precision and reputation. He often stays late to perfect the orchestra’s sound.",
        "pt": "Um maestro apaixonado, um pouco flamboyant, que se orgulha da precisão e da reputação. Ele costuma ficar até tarde para aperfeiçoar o som da orquestra."
      },
      "facts": "You are Lorenzo Moretti. You were in the instrument room at 9:30 pm to retrieve the Stradivarius for the final piece. You noticed the lock on the case was slightly ajar, but you assumed it was an oversight. Later, you saw a janitor (Carlos) pushing a cart near the room, but you dismissed it as routine. You want to protect the academy’s image, so you will downplay any negligence and subtly shift suspicion toward the student if pressed. You never admit seeing the lock tampered."
    },
    {
      "id": "maya",
      "name": "Maya Santos",
      "role": {
        "en": "Violinist",
        "pt": "Violinista"
      },
      "persona": {
        "en": "A talented but anxious student who dreams of soloing at the upcoming recital. She is meticulous about her instrument and worries about her performance.",
        "pt": "Uma estudante talentosa, porém ansiosa, que sonha em fazer solo no recital que se aproxima. Ela é meticulosa com seu violino e se preocupa com sua performance."
      },
      "facts": "You are Maya Santos. You rehearsed in the main hall all evening and planned to borrow the Stradivarius for the finale. You entered the instrument room at 9:45 pm and saw the case slightly open, with a faint scratch on the lock—evidence of tampering. You also noticed the janitor’s cart had a wooden compartment that seemed out of place. You are afraid to accuse anyone without proof, but you will mention the odd cart and the disturbed lock. You also hide the fact that you previously borrowed the violin for private practice, fearing it might look suspicious."
    },
    {
      "id": "carlos",
      "name": "Carlos Mendes",
      "role": {
        "en": "Janitor",
        "pt": "Zelador"
      },
      "persona": {
        "en": "A friendly, long‑time staff member who knows every corner of the academy. He is proud of his work but financially strained.",
        "pt": "Um funcionário amigável e de longa data que conhece cada canto da academia. Ele tem orgulho do seu trabalho, mas está com dificuldades financeiras."
      },
      "facts": "You are Carlos Mendes. You have been cleaning the academy for years and have access to all rooms. You stole the Stradivarius because you need money to pay for your daughter's surgery. You hid the violin in the back of your cart, planning to sell it later. You will claim you were only sweeping the hallway at the time and that you saw Lorenzo lingering near the case, implying he might have left it unattended. You will never directly admit the theft; you will deflect, lie about your whereabouts, and try to shift blame onto Lorenzo."
    }
  ],
  "solution": {
    "en": "The culprit is Carlos Mendes, the janitor. He stole the Stradivarius to fund his daughter's surgery, hiding it in his cart. Lorenzo saw the open lock but thought it was an oversight, while Maya noticed the tampered lock and the odd cart, providing the clues that point to Carlos.",
    "pt": "O culpado é Carlos Mendes, o zelador. Ele roubou o Stradivarius para pagar a cirurgia da filha, escondendo‑o no fundo do seu carrinho. Lorenzo viu a fechadura aberta, mas assumiu que foi um descuido, enquanto Maya notou a fechadura violada e o carrinho estranho, fornecendo as pistas que apontam para Carlos."
  }
}
<<<END>>>
# Task
Rewrite content/case.json to the v2 shape: keep the same story, suspects and culprit, add at least 6 clues (>=2 implicating the culprit, each innocent cleared by >=1, discoverable by questioning, with EN+PT keywords) and a glossary of >=6 terms. Polish all PT to natural PT-BR. Note: "violonista" means guitarist; a violin player is "violinista". Output only content/case.json.
