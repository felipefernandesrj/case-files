# SPEC

## Server (`src/server.js`)

### Routes

#### Static
- `GET /`: Serves `public/index.html`.

#### API
- `GET /api/status`
  - Returns `{ mode: 'mock' | 'live', caseId: string }`.

- `GET /api/case?lang=[pt|en]`
  - Returns the public version of the case (no secrets).
  - Shape: `{ id, title, intro, suspects: [{ id, name, role, persona }] }`.

- `POST /api/session`
  - Starts a new game session.
  - Returns `{ sessionId: string }`.

- `POST /api/ask`
  - Body: `{ sessionId, suspectId, question, lang?: 'pt' | 'en' }`.
  - Returns: `{ answer: string, questions: number }`.
  - Only a successful answer counts: `questions` and the suspect's history change only on 200. A failed ask (402, 429, 502, 503) changes nothing in the session, and `message` is a friendly EN/PT sentence from src/messages.js.
  - Errors:
    - `400`: `unknown session`, `unknown suspect`, `empty question`, `question too long`.
    - `402`: `no_capacity` (upstream capacity exhausted).
    - `429`: `rate_limited` (upstream rate limit).
    - `502`: `upstream` (upstream error).
    - `503`: `bad_key` (invalid API key).

- `POST /api/accuse`
  - Body: `{ sessionId, suspectId, player?: string, lang?: 'pt' | 'en' }`.
  - Returns: `{ correct: boolean, culprit: string, culpritName: string, solution: string, score: number, questions: number }`.
  - Errors:
    - `400`: `unknown session`, `unknown suspect`.
    - `409`: `already accused`.

- `GET /api/scores`
  - Returns the top 10 scores for the current case.

- `GET /api/credits?lang=[pt|en]`
  - Returns credits information.
  - Shape: `{ title: string, backers: string[], example: boolean }`.
  - If the file (configured via `creditsFile` option, defaults to `data/credits.json`) is missing or invalid, returns: `{ title: "Thanks to the backers" | "Obrigado aos apoiadores", backers: [], example: false }`.

### Key & Mode Resolution
1. **Key**: Provided via `createServer` options, or environment variable `FULLCUP_KEY`, or a `.fullcup-key` file in the working directory.
2. **Mock Mode**: Enabled if `mock: true` is passed to `createServer`, if `process.env.MOCK === '1'`, or if no key is found.

### Scoreboard
- Persisted to `data/scores.json` (default).
- Records player name (max 24 chars), score, questions asked, correctness, language, and case ID.
- The page renders every scoreboard cell with textContent, so player names are plain text, never HTML.

### Personal best (browser)
- Stored in browser's localStorage under `casefiles:best:v1`.
- Better result = higher score, or same score with fewer questions (wrong accusations never count).
- Reset requires user confirmation; GET /best.js serves the storage module.
- Accuse: the page shows a native confirm (EN "Accuse {name}? You only get one accusation." / PT "Acusar {name}? Você só tem uma acusação.") before POST /api/accuse; Cancel does nothing. The confirm is skipped only when the player unchecked "Confirm before accusing" (see quick accusations, sprint 7).
- Ask busy: while POST /api/ask is in flight, #q and Accuse buttons are disabled, #ask-form has aria-busy=true, and the thinking line uses LABELS.thinking (EN "…thinking" / PT "…pensando"); on settle, controls re-enable, aria-busy clears, leftover thinking is removed, and #q is focused. The Start over button is disabled under the same busy lock.
- Start over: #restart-btn (EN "Start over" / PT "Nova partida") shows a native confirm (EN "Start a new game? Your current questions will be lost." / PT "Começar um novo jogo? Suas perguntas atuais serão perdidas."); Cancel does nothing; Confirm POSTs /api/session, clears histories/questionsUsed/selectedSuspect/verdict/credits, re-enables Ask/Accuse, refreshes personal-best display without wiping it, and focuses the first suspect.
- Escape: a document keydown listener for Escape clears #q.value and focuses #q only when document.activeElement (or event.target) is #q; it does not cancel accuse/restart confirms.
- Game over: after a successful accusation, setGameOver(true) disables #q, #ask-btn and Accuse buttons, and #best-status shows LABELS.gameOver (EN "Game over. Use Start over for a new case." / PT "Fim de jogo. Use Nova partida para um novo caso."); askQuestion and Accuse clicks no-op while locked; restartGame clears the lock; setLang refreshes the game-over status; renderAccuseButtons keeps Accuse disabled while locked.
- Ask hints: if Ask is pressed with no selectedSuspect, #best-status shows LABELS.pickSuspect (EN "Choose a suspect first." / PT "Escolha um suspeito primeiro.") instead of returning silently; if the question is empty, #best-status shows LABELS.emptyQuestion (EN "Type a question first." / PT "Digite uma pergunta primeiro.") and #q is focused. selectSuspect clears #best-status when it shows LABELS.en.pickSuspect or LABELS.pt.pickSuspect.
- Best lines use the UI language wording (bestText(lang, entry, ui)) and a new best is announced in the role=status line.

## Web page: scene backdrop (M2 game feel sprint 2)

- Markup: the first children of `#play` are `#scene` (aria-hidden, two `.scene-layer` divs) and `#scene-label`.
- `syncScene()` runs at the end of `renderRooms()`, so opening a room, Start over, opening another file and switching language all update it. With a current room it sets the caption to `Scene: <room name>` or `Cena: <room name>`, adds `has-scene` to `#play` and, only when the room changed, loads the plate with `locArt` and fades it in on the other layer while the old layer fades out. With no current room it clears both layers and hides the caption.
- CSS: `.scene-layer` fades opacity over 700ms to 0.35 (a dimmed backdrop under a dark vignette); reduced motion removes the fade; the conversation panel and log are see-through while `has-scene` is set.
- The CASE CLOSED stamp is a centred block below the Score line (margin 32px above), so its rotation never covers the score.

## Web page: hint toasts and pin language (M2 game feel sprint 3)

- Data: each case JSON has `hints`, an array of `{id, after, text{en,pt}}` where `after` is seconds from the start of a game; `publicCase(c, lang)` returns `hints` as `{id, after, text}` with text in that language.
- Markup: `#toasts` (class `toasts`, role status, aria-live polite) is a direct child of body, right before the page script.
- `startHints()` clears pending timers (`stopHints()`), empties `#toasts` and sets one timer per hint at `after * 1000` ms. When a timer fires it does nothing if `gameOver` is true; otherwise it reads the hint with the same id from the current `caseData` (so a language switch is respected) and calls `showToast(text)`. `init()`, `openPackFile(id)` and `restartGame()` call `startHints()`.
- `showToast(text)` appends a `.toast` with a `.toast-kicker` (Hint or Pista) and a `.toast-text`, keeps at most two toasts, adds `is-out` after 8000 ms and removes the toast 400 ms later.
- CSS: `.toasts` is fixed at the bottom centre (above `--dock-h` on phones), toasts slide in over 350 ms and fade out over 400 ms, no animation with reduced motion.
- Pins: `renderBoard()` shows each pin with the name of the room with the same id in the current `caseData.rooms`, falling back to the stored label.

## Web page: readable board heading and toast language (M2 game feel sprint 4)

- CSS: `#board-title` sits on an ink plate (`background: rgba(12,11,10,0.88)`, `color: var(--cf-text)`, lamp left border, width fit-content); `.scene-label` uses `color: var(--cf-text)` on `rgba(12,11,10,0.88)`. Both keep at least 4.5:1 contrast even over the lightest page colour #F3EADF.
- `showToast(text, id)` stores the hint id in `data-hint`; `startHints()` passes `cur.id`.
- `relabelToasts()` rewrites the kicker (Hint or Pista) of every toast in `#toasts` and its text from the hint with the same id in the current `caseData.hints`; a toast with an unknown id keeps its text. It never adds or removes toasts. `setLang()` calls it after the case is reloaded in the new language.

## Web page: continue countdown (M2 game feel sprint 5)

- Markup: `#continue` (role group, labelled by `#continue-title`, hidden by default) with `#continue-num` (aria-hidden), `#continue-note` and the buttons `#continue-yes`, `#continue-no`, `#continue-close`; a visually hidden `#continue-live` (aria-live polite) outside it.
- State `contState` is 'off', 'run' or 'over'; `CONT_FROM = 9`. `accuse()` calls `startContinue()` only when the verdict is wrong, before `renderVerdict()`; on a wrong verdict the verdict and the credits do not take the focus. `startContinue()` shows 9, announces once, ticks every 1000 ms (pulse class `tick`), focuses Try again; after 0 it calls `endContinue()` (GAME OVER, `renderVerdict(false)`, announce, focus Close). While 'run', `renderVerdict()` leaves out the culprit and solution lines.
- `continueGame()` (Try again) runs only while 'run': `stopContinue()` then `restartGame(true)` (no confirm). Give up and Escape call `endContinue()` while 'run'; Close and Escape while 'over' call `closeContinue()` (focus `#restart-btn`). `restartGame()`, `openPackFile()` stop it, `setLang()` relabels it with `renderContinue()`.
- `restartGame()` posts `{ case: openFile }` to `/api/session`; `init()` posts the `?case=` value. Before, both posted no case and the session played the default file.

## Web page: suspicion bars (M2 game feel sprint 6)

- Server: each session has `found` (a Set of clue ids). After a successful answer, POST /api/ask looks for the first clue of the asked suspect that is not found yet and whose keyword appears in the question (lower case on both sides); it is added to `found` and returned as `clue: { id, implicates, clears }`, otherwise `clue: null`.
- Markup: two `.suspicion` sections (`#suspicion-talk` after `#questions-used`, `#suspicion-accuse` before `#accuse-section`), each with `h3.sus-title` and `ul.sus-list`; one visually hidden `#suspicion-live` (aria-live polite) at the top of `#play`.
- State `suspicion` maps a suspect id to `{ hits, cleared, flash }`; `SUS_MAX = 3`. `applyClue(clue)` (called by `askQuestion()` with `data.clue`) adds a hit to `implicates`, marks `clears` as cleared, flags the changed rows, renders and announces "New lead: points to {name}" / "New lead: clears {name}" (PT "Nova pista: aponta para / inocenta {name}").
- `renderSuspicion()` (called by `renderCase()`, so also on a language switch) fills every `.sus-list`: per suspect a li (`is-hot` at two or more hits, `is-cleared`, `flash` once) with `.sus-name`, `.sus-bar` (role meter, aria-valuenow 0 to 3, 0 when cleared, aria-valuetext and aria-label "Suspicion on {name}") holding three `.sus-pip` (`on` when filled) and `.sus-note` ("No leads", "1 lead", "2 leads · prime suspect", "Cleared"; PT "Sem pistas", "1 pista", "2 pistas · principal suspeito", "Inocentado"). `restartGame()` and `openPackFile()` reset `suspicion` and the live line.

## Web page: quick accusations (M2 game feel sprint 7)

- Markup: `label#ask-confirm-row.ask-confirm[for=ask-confirm]` right after `#accuse-buttons`, holding `input#ask-confirm` (checkbox, `checked` in the markup) and `span#ask-confirm-text` (EN "Confirm before accusing" / PT "Confirmar antes de acusar").
- `confirmOn()` is false only when localStorage `cf-confirm-accuse` is `off` (no storage or a storage error means on). `setConfirmOn(on)` removes the key when on, stores `off` when off, then `renderConfirmToggle()` sets the checkbox and the label in the current language. The checkbox `change` listener calls `setConfirmOn(checked)`; `renderConfirmToggle()` runs at load and in `setLang()`. Start over does not touch the choice.
- An accuse button does nothing after the verdict; otherwise it calls `accuse(id)` when `!confirmOn()` or the native confirm returns true.
- Suspicion fixes: `renderSuspicion()` adds `flash` only to a `.sus-list` whose `offsetParent` is not null (on screen), so a hidden panel never replays it. `applyClue()` keeps the last announced clue in `susLast` and writes `susSaid(clue)`; an empty clue changes nothing. `relabelSuspicionLive()` (called by `setLang()`) rewrites a non-empty live line in the current language.
- CSS: `.ask-confirm` inline-flex, min-height `var(--touch-min)`; the checkbox is 20px with a 3px `var(--cf-focus)` focus ring.

## Web page: talking portraits (M2 game feel sprint 8)

- `renderConversation(animateLast)` writes, per question, `p` "Q: ..." / "Pergunta: ..." and `p.answer` holding `span.portrait.speaker` (aria-hidden, initials until the sheet loads), `span.sr-only` with the full line and `span.answer-text` (aria-hidden) with the visible line ("A: ..." / "Resposta: ..."). It calls `stopTalk()` first. Only `askQuestion()` passes `true`, and then only the last answer talks.
- `speakerFace(id)` loads `/assets/characters/<case>-<id>-talk.png` with `whenArt()` and sets `--talk-sheet` plus `has-art has-talk`.
- `startTalk(face, shown)` empties the visible copy, adds `is-talking` and every `TALK_STEP_MS` (30) adds `TALK_CHARS` (2) characters; at the end `stopTalk()` writes the full line and removes `is-talking`. With `prefers-reduced-motion: reduce` it does nothing (line already full). A click on `#log` calls `stopTalk()` while a line is in progress.
- CSS: `#log p.answer` flex row; `#log .speaker` 48px (56px on desktop); `.has-talk` uses the sheet at `background-size: 200% 100%`; `.is-talking` runs `cf-talk` 240ms `steps(1, end)` infinite (frame 1 at 0 0, frame 2 at 100% 0); reduced motion sets `animation: none`.
- Assets: `scripts/assets/talk_frames.py` (CPU, no network) reads each `<case>-<id>-neutral.png` (128px), finds the lip line near a hand measured mouth centre and writes the 256x128 sheet: left the neutral frame unchanged, right the same frame with a small dark open mouth.

## Web page: wrong verdict aftermath (M2 game feel sprint 9)
- Content: each case file has `aftermath[suspectId] = { en: { headline, body }, pt: { headline, body } }` for every innocent suspect (none for the culprit). Headline up to 9 words, body 40 to 75 words naming the accused and the real culprit and no other suspect, no dashes or semicolons. `publicCase()` never includes it.
- API: `POST /api/accuse` also returns `accusedName` and `aftermath` (both languages of the accused suspect's story on a wrong verdict, `null` on a correct one).
- `renderVerdict()` appends `div.aftermath` (`p.aftermath-kicker` "The next morning's paper" / "Jornal da manhã seguinte", `p.aftermath-headline`, `p.aftermath-body`) only when the verdict is wrong and the CONTINUE? countdown is not running (`contState !== 'run'`), so after Give up, Escape, timeout or Close. The first render animates; later renders (language switch) add `is-static`. `endContinue()` announces "GAME OVER. <headline>. The culprit got away...".
- CSS: newspaper clipping (paper #e9dfc8, ink #1d1a16, Georgia serif, rotate(-1.2deg)), `cf-paper` slide-in 700ms, none with reduced motion. `.continue.is-over` docks at the bottom (16px, or 12px above `--dock-h` on phones) so it does not cover the clipping.

## Web page: culprit in handcuffs (M2 game feel sprint 10)
- Art: `public/assets/characters/<case>-<culpritId>-arrest.png` (128 px) and `@2x.png` (256 px), generated through the Cup key and keyed by scripts/assets; listed in `public/assets/manifest.json` with their receipt ids.
- API: `POST /api/accuse` returns `culprit` from the session case (not the default case) and `solutions` (`{ en, pt }`).
- `renderVerdict()` on a correct verdict appends `div.arrest` holding the stamp (`aria-hidden`) and `p.arrest-caption` ("Case closed: <name> is led away in handcuffs." / "Caso encerrado: <name> sai com as mãos algemadas."). When the sprite of `artCase()` and a safe culprit id loads, `img.arrest-sprite` (alt empty, 224 px, srcset 2x) goes before the stamp and the block gets `has-art`, which puts the stamp on top of the sprite. The first render animates (`cf-arrest`, then the stamp after 420ms); later renders add `is-static`. The Solution line uses `solutions[lang]` when present.
- CSS: pixelated sprite, stamp absolute over it with a dark plate, no animation with reduced motion.

## Web page: closing screen

When the verdict is shown and the scoreboard loads, a closing screen (`#credits`) is rendered:
- **Content**: An `<h2\>` for the title, a `<ul>` for backer names, and a small note if `example` is true.
- **Language**: Re-renders title/note on language switch without moving focus.
- **Focus**: After rendering, keyboard focus moves to `#credits` (the verdict is announced first via `role=status`).
- **Data**: `data/credits.json` holds example names ("Backer 1".."Backer 3", example: true) to be replaced with real backer names before release.

## Upstream (`src/proxy.js`)

The proxy communicates with the FullCup API:
- **Endpoint**: `{baseUrl}/chat/completions`
- **Method**: `POST`
- **Headers**:
  - `Authorization: Bearer <key>`
  - `Content-Type: application/json`
  - `X-FullCup-Workload: case-files:play`
- **Payload**: `{ model, messages, max_tokens: 300 }`
- **Default Model**: `@cf/meta/llama-4-scout-17b-16e-instruct`

### Error Mapping
- `401` / `403` $\rightarrow$ `bad_key`
- `402` $\rightarrow$ `no_capacity`
- `429` (if body contains `capacity:empty`) $\rightarrow$ `no_capacity`
- `429` (otherwise) $\rightarrow$ `rate_limited`
- All other non-200 $\rightarrow$ `upstream`

## Testing

Run the full test suite via npm:
`npm test`

This executes:
1. `node test/e2e.mjs` (End-to-end flows)
2. `node test/proxy.mjs` (Upstream communication)
3. `node test/consistency.mjs` (Case consistency)
4. `node test/capacity.mjs` (Capacity messages)
5. `node test/scoreboard.mjs` (Scoreboard, personal best, version check)
6. `node test/night-train.mjs` (Night Train case file: fair play with 4 suspects, timeline, privacy; not the default case)
7. `node test/case-select.mjs` (load a case by id behind a flag: registry, rejected ids, server caseId, CLI --case, no picker in the page, friendly one line error and exit code 2 for an unknown id in the server and the CLI)
8. `node test/icons.mjs` (icon sprite ids and no 404 on referenced icon paths, including rotate-ccw)
9. `node test/budget.mjs` (per-case call cap per playthrough, friendly call_cap message, failed calls count, fresh cap per session, worst-case spend under the ceiling for every case, hand-computed formula check)
10. `node test/progress.mjs` (Case progress tracker in the desktop rail (never hidden, six steps in order, ticks and counter, safe without its list, visits recorded), CASE CLOSED stamp text and animation, readable suspect roles, reduced motion)
11. `node test/scene.mjs` (scene backdrop: markup, driven by the room list, first room and caption, crossfade and no new fade for the same room, Portuguese caption, cleared on reset, dimmed backdrop with fade and reduced motion, CASE CLOSED stamp below the score)
12. `node test/hints.mjs` (hint toasts: markup, hints in both case files, localised in the public case, one timer per hint, English toast, current language at fire time, none after the verdict, restart clears pending hints, at most two toasts, fade then removal, started on every new game with toast CSS, pins follow the language)
13. `node test/legibility.mjs` (board heading and scene caption on an ink plate with AA contrast, toast remembers its hint id, open toast switches language and back, unknown toast keeps its text, language switch relabels open toasts)
14. `node test/continue.mjs` (continue countdown: markup, 9 to 0 then GAME OVER, pulse, Portuguese labels, verdict reveal, Try again without confirm, Close focus, only after a wrong verdict, culprit hidden while counting, stop on Start over and new file, sessions carry the case id, Escape, reduced motion, language switch)
15. `node test/suspicion.mjs` (suspicion bars: server clue found once per game by the asked suspect, keywords ignore case, Night Train; page rows in both panels, one lead, prime suspect, cleared, Portuguese, three pip cap, no clue, wiring and reduced motion)
16. `node test/quick-accuse.mjs` (quick accusations: on by default, stored off, back on, reload and Portuguese label, accuse with and without the dialog, nothing after the verdict, markup and focus style, suspicion flash only on screen, live line language)
17. `node test/talk.mjs` (talking portraits: speaker avatar with screen reader and visible copies, talk sheet of the open case, reveal and mouth frames, re-render finishes the line, click to finish, reduced motion, only new answers talk, CSS frames, sheet pixels, script coverage)
18. `node test/aftermath.mjs` (wrong verdict aftermath: a story for every innocent and none for the culprit, sizes and punctuation, names, no leak in the public case, accuse response for both cases, shown only after GAME OVER, language switch without replay, announcement, styles and docking)
19. `node test/arrest.mjs` (culprit in handcuffs: generated sprites and receipts, accuse response for both cases, sprite before the stamp, alt text and caption, Portuguese and no replay, no request for a wrong verdict or an unsafe id, Solution follows the language, styles and reduced motion)
20. `node test/keyboard.mjs` (Manual/Keyboard interaction, including Escape twice on the continue box after a wrong verdict)

Total checks: 234 (suite: e2e 42, proxy 12, consistency 4, capacity 6, scoreboard 20, night-train 8, case-select 11, icons 4, budget 8, progress 8, scene 8, hints 12, legibility 8, continue 15, suspicion 15, quick-accuse 9, talk 10, aftermath 14, arrest 7, keyboard 13).

### Play budget (`src/budget.js`, M2 sprint 4)
- `maxCallsFor(c)`: Returns a `maxCalls` value between 1 and 100 for a case, or the default of 20.
- Cap in `/api/ask`: Every question that reaches the model counts toward the cap even if the call fails; if reached, the server returns a 429 with `call_cap` and no model call is made, but the player can still accuse or start a new session.
- `worstCaseSpend({ calls, maxTokens, systemChars })`: Calculates the highest possible cost by assuming each call uses `maxTokens` of 300 and resends the system prompt and full history at the `llama-4-scout` price to ensure it remains under the `PLAYTHROUGH_CEILING_USD` of US$0.10.

### Case engine (`src/case.js`, M2)
- `hints`: optional array in a case JSON of `{id, after, text{en,pt}}` timed hint events; `publicCase` passes them on localised (an empty array when missing).
- `CASES` and `caseFileFor(id)`: frozen registry containing violin (content/case.json) and night-train (content/cases/night-train.json) that throws unknown_case for any other IDs.
- Flag: createServer({ caseId }), CASE_ID for node src/server.js and --case for the CLI, default The Vanishing Violin, not exposed in the page.
- `unknownCaseLine(id)`: returns the one line message naming the id and the valid ids, and node src/server.js and the CLI print it to stderr and exit with code 2 instead of a stack trace when the id is unknown.
- `fairPlay(c, { suspects = 3 } = {})`: same rules as before with the expected suspect count as an option (The Night Train uses 4).
- `timelineCheck(c)`: `c.timeline` is a non-empty array of stops `{id, time "HH:MM", stop{en,pt}, event{en,pt}, who[], crime?}`; ids unique, times strictly increasing (one midnight wrap allowed), every `who` entry a suspect id, exactly one `crime: true` stop whose `who` includes the culprit. Reasons: timeline_missing, timeline_bad_id, timeline_bad_time, timeline_missing_text, timeline_unknown_suspect, timeline_out_of_order, timeline_crime_count, timeline_culprit_absent.
