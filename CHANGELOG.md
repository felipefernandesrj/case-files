# Changelog

## 0.4.18 (M2 game feel, sprint 9: a story for a wrong verdict)
- A wrong verdict now has consequences. When the CONTINUE? countdown ends (Give up, Escape or the count reaching 0), the verdict shows a newspaper clipping from the next morning: what happened to the innocent suspect you accused, and how the real culprit got away. Every innocent suspect of both cases has their own story in English and Portuguese (5 stories, 10 texts).
- The stories live in each case file under `aftermath` and are only sent by the server with the answer to a wrong accusation, never with the case itself. They are not shown during the countdown, so Try again stays a real second chance.
- The clipping slides in once. A language switch shows the other language without replaying it, and with reduced motion it simply appears. The GAME OVER announcement for screen readers now reads the headline too.
- The GAME OVER box now sits at the bottom of the screen (above the bottom bar on phones) instead of the centre, so it no longer covers the verdict.
- New test/aftermath.mjs with 14 checks (a story for every innocent and none for the culprit, sizes and clean punctuation, names, no leak in the public case, accuse response for both cases, shown only after GAME OVER, language switch without replay, announcement, styles and docking). The automated suite now has 227 checks.

## 0.4.17 (M2 game feel, sprint 8: talking portraits)
- Every answer in the Conversation log now has the suspect's portrait next to it as a speaker avatar (56px on desktop, 48px on phone). While a new answer is revealed, a few characters at a time (about 1.2 seconds for a two line answer), the portrait's mouth opens and closes; when the line is complete the face is still again.
- The mouth frames are local sprite sheets, not new model calls: scripts/assets/talk_frames.py (CPU only) takes the neutral portrait of each suspect and writes <case>-<id>-talk.png, a two frame sheet (neutral, then the same face with the mouth open). The page swaps the two frames with a CSS steps() animation. Nothing extra is called while you play.
- Only the newest answer talks. Older answers, a suspect switch and a language switch show the lines at once. A click on the conversation finishes the line in progress.
- Accessibility: screen readers get the full answer at once from a hidden copy (the typed copy is aria-hidden), so the log is not read letter by letter. With reduced motion the answer appears at once and the face does not move.
- New test/talk.mjs with 10 checks (avatar and copies, talk sheet of the open case, reveal and mouth, re-render finishes the line, click to finish, reduced motion, only new answers talk, CSS frames, sheet pixels, script coverage). The automated suite now has 213 checks.

## 0.4.16 (M2 game feel, sprint 7: quicker accusations)
- Backer feedback: the accuse confirmation slowed down quick players. A checkbox "Confirm before accusing" ("Confirmar antes de acusar") now sits under the accuse buttons. It is checked by default, so nothing changes unless you uncheck it; unchecked, an accuse button accuses at once with no dialog. The choice is remembered in this browser (localStorage key cf-confirm-accuse), survives Start over and a reload, and checking the box again brings the confirmation back. It is a normal labelled checkbox (Tab to reach it, Space to toggle, visible focus ring, 44px tall touch target).
- Fix: the one-time flash of a suspicion row no longer replays when you open the Accuse step later. The flash is only added to a Suspicion panel that is on screen when the lead is found.
- Fix: after a language switch, the screen reader line of the last lead is rewritten in the new language ("New lead: points to Carlos Mendes" becomes "Nova pista: aponta para Carlos Mendes"). It stays empty after Start over.
- New test/quick-accuse.mjs with 9 checks (default on, stored off, turning it back on, reload and language, accuse with and without the dialog, no accusation after the verdict, markup and focus style, flash only on screen, live line language). The automated suite now has 203 checks.

## 0.4.15 (M2 game feel, sprint 6: suspicion bars)
- A Suspicion panel (Suspeita in Portuguese) now sits under the conversation and above the accuse buttons, at 1280 and 390. Each suspect has a row with a three pip meter. When a question finds a clue, the pips of the suspect it points to fill up (1 lead, 2 leads; 1 pista, 2 pistas), two or more leads mark the prime suspect (red edge), and a clue that clears someone marks that row Cleared (Inocentado) in green with the name struck through. The row that changed flashes once.
- The server now says which clue a question found: POST /api/ask returns `clue` ({ id, implicates, clears } or null). A question finds a clue when it contains one of the clue keywords of the suspect being asked, ignoring case, and each clue counts once per game.
- Screen readers get a meter per suspect (value 0 to 3 with a text such as "2 leads · prime suspect") and one polite line per new lead ("New lead: points to Carlos Mendes" / "Nova pista: aponta para Carlos Mendes"). Reduced motion turns off the flash. Start over and opening another case file reset the bars; a language switch keeps them and relabels them.
- New test/suspicion.mjs with 15 checks (server: finds the clue, once per game, nothing without a keyword, clearing clue, only the suspect who holds it, new game and any case, Night Train; page: rows in both panels, one lead, prime suspect, cleared, Portuguese, three pip cap, no clue, wiring). The automated suite now has 194 checks.

## 0.4.14 (M2 game feel, sprint 5: continue countdown after a wrong verdict)
- A wrong accusation now opens an arcade style CONTINUE? box (CONTINUAR? in Portuguese) in the middle of the screen with a big number that counts down from 9 to 0, one step per second, with a short pulse on every step. Try again (Tentar de novo) has the focus, so Enter or Space starts the same case file again right away, without the Start over question. Give up (Desistir) or Escape ends the countdown.
- While the countdown runs, the verdict only says Wrong! and the score; the culprit and the solution stay hidden so a retry is still a real retry. When the count passes 0, or the player gives up, the box turns into GAME OVER (FIM DE JOGO) with "The culprit got away. Use Start over to reopen the case.", the culprit and solution appear in the verdict, and a Close button (Escape also closes) puts the focus back on Start over.
- Screen readers hear one polite announcement when the box opens ("Continue? You have 10 seconds. Enter tries the case again, Escape gives up.") and one at GAME OVER, not every number. With reduced motion the pulse is off and the countdown still runs. A correct accusation never shows the box, and Start over, opening another case file and a language switch keep it right (cleared or relabelled).
- Fix: Start over and a link with ?case= created the game session without the case id, so the server played the default file while the page showed another one (accusing a Night Train suspect after Start over failed with "unknown suspect"). Both now send the case id.
- New test/continue.mjs with 15 checks (markup and live region, starts at 9 with focus on Try again, counts down to 0 then GAME OVER, pulse on every tick, Portuguese labels, game over reveals the verdict, Try again restarts the same case without asking, Close returns focus, only a wrong verdict starts it, culprit hidden while counting, Start over and new file stop it, sessions carry the case id, Escape gives up then closes, reduced motion drops only the pulse, language switch relabels it). The keyboard test now walks the wrong verdict with Escape twice. The automated suite now has 179 checks.

## 0.4.13 (M2 game feel, sprint 4: readable board heading and caption, toasts follow the language)
- The Evidence board heading (Quadro de evidências in Portuguese) and the scene caption (Scene: Instrument room, or Cena: Sala de instrumentos) were light text on the light cork texture and hard to read (measured contrast 1.68:1 and 2.15:1). Both now sit on a dark ink plate with light text, about 13.7:1, well above the WCAG AA 4.5:1 minimum, checked at 1280 and 390 wide in English and Portuguese. The heading plate is only as wide as its text and keeps a small lamp-coloured edge.
- A hint toast that is already on screen now switches language when the player switches EN/PT (before, only the next toast used the new language). Each toast remembers which hint it shows, and after the switch its label (Hint or Pista) and its text are rewritten in the new language. A toast whose hint is not in the case keeps its text.
- New test/legibility.mjs with 8 checks (heading on an ink plate, light caption text, heading contrast AA, caption contrast AA, toast remembers its hint id, open toast switches language and back, unknown toast keeps its text, language switch relabels open toasts). The automated suite now has 164 checks.

## 0.4.12 (M2 game feel, sprint 3: timed hint toasts)
- Timed hint events now appear as on-screen toasts while the player works the case. Each case file has three hints (for example "A silhouette pushing a cart passed the instrument room window." in The Vanishing Violin, or "A silhouette in a white apron passed the luggage car window." in The Night Train) that show up 45, 100 and 160 seconds into a game. A toast carries a Hint label (Pista in Portuguese), slides in at the bottom of the screen above the phone dock, stays for 8 seconds and fades out; at most two are on screen. Toasts are announced politely to screen readers and do not move when the player asks for reduced motion.
- Hints follow the language of the moment they appear, stop after the verdict, and start again from zero on Start over and when another case file is opened.
- Pins now follow the language: a room pinned in English shows its Portuguese name on the board and in the rail after a switch to Portuguese, and back.
- New test/hints.mjs with 12 checks (toast markup, hints in both case files, hints in the public case per language, one timer per hint, English toast, current language at fire time, no hint after the verdict, restart clears pending hints, at most two toasts, fade then removal, hints start on every new game with toast CSS, pins follow the language). The automated suite now has 156 checks.

## 0.4.11 (M2 game feel, sprint 2: the room stays as the scene)
- The room the player opens now stays on screen as the scene. Its pixel-art plate becomes a dimmed backdrop of the whole play area and stays there while the player questions suspects, reads the dossier, checks the board or accuses. Opening another room crossfades to the new plate. A small caption names the scene (Scene: Instrument room, or Cena: Sala de instrumentos in Portuguese) and follows the language switch. The fade is skipped when the player asks for reduced motion. Start over and opening another case file clear the scene. The conversation panel is see-through while a scene is shown so the room shows behind it. Checked at 1280 and 390 wide.
- On desktop the CASE CLOSED stamp no longer overlaps the Score line; it now sits on its own line below the score.
- New test/scene.mjs with 8 checks (scene markup, the room list drives the scene, first room shows with its caption, crossfade to a second room and no new fade for the same room, Portuguese caption, scene cleared on reset, dimmed backdrop with fade and reduced motion, stamp below the score). The automated suite now has 144 checks.

## 0.4.10 (M2 game feel, sprint 1: case progress tracker and CASE CLOSED stamp)
- The desktop right column is never empty any more. It shows a Case progress tracker with the six case steps (Brief, Places, People, Ask, Board, Accuse). A step is ticked with a short slide-in the first time the player opens it, the current step is highlighted, and a counter shows how many of the six are done (for example 3/6). It follows EN/PT and resets on Start over or when another case file is opened. Below it the Pins list shows a hint until the first clue is pinned.
- A correct accusation now lands a red CASE CLOSED rubber stamp (CASO ENCERRADO in Portuguese) on the verdict with a stamp-down animation; it is skipped when the player asks for reduced motion.
- Suspect roles on the light paper cards are now dark red and bold instead of light grey, so they are readable.
- On desktop the verdict box no longer collapses inside the accuse stage.
- New test/progress.mjs with 8 checks (rail never hidden, tracker ids, step order, tracker rendering, tracker safe without its list, visit recorded on step change, stamp text and animation, readable roles and reduced motion). The automated suite now has 136 checks.

## 0.4.9 (M1 art via the Cup key: pixel-art icons, portraits, locations)
- The game now ships generated pixel art. All of it was produced through the Cup key with `flux-1-schnell` (98 billed images, US$ 0.186298, receipts in the run notes) and finished locally by `scripts/assets`:
  - 46 icons at 32, 64 and 128 px in PNG and WebP, plus an atlas;
  - four moods (neutral, speaking, guarded, charged) for each of the 7 suspects;
  - 8 evidence cutouts;
  - 10 location plates;
  - the two case covers for the file cabinet;
  - verdict, cork, desk and paper textures;
  - two 4-panel cutscenes.
  - `public/assets/manifest.json` (v2) lists every file with its FullCup receipt id.
- Where the art appears:
  - Suspect portraits show the character art.
  - Location buttons show the room plate under a dark scrim, so labels stay readable.
  - The file cabinet shows each case's cover.
  - The verdict stage and the evidence board get textures.
  - Icons render as pixel art through `public/css/pixel-icons.css`, which is generated from the manifest. The SVG sprite stays as the forced-colours fallback.
  - An image is applied only after it loads, so a case without art keeps the old look.
  - The server now serves `.webp`.
- Background removal is now `scripts/assets/bgremove.py`:
  - flood-key on clean plates;
  - ToonOut (MIT) as the model fallback;
  - pinned requirements and `THIRD_PARTY_NOTICES.md`;
  - a new `test_bgremove.py` with 13 checks.
- `test/icons.mjs` gains a manifest check: every listed file exists and has a receipt, every sprite icon has a PNG, and every suspect, room and cover for both cases is served as `image/png`. The automated suite now has 128 checks.

## 0.4.8 (M2 sprint 4, per-case call cap and worst-case spend test)
- Each playthrough now has a cap on model calls which can be set per case via `maxCalls` from 1 to 100 or defaults to 20 via `DEFAULT_MAX_CALLS` in `src/budget.js`, where every question that reaches the model counts even if the call fails, and once the cap is reached the server returns a 429 with error `call_cap` and the message `You have used all the questions for this case in this game. Make your accusation, or press Start over for a new game.`, though the player can still accuse or start a new game to get a fresh cap.
- The new `worstCaseSpend` function computes the worst-case cost of one playthrough by assuming every call uses the full `max_tokens` of 300 and resends the longest system prompt plus the full history (one token per character) at the `llama-4-scout` price of US$0.27 per million input tokens and US$0.85 per million output tokens, ensuring the cost stays under the `PLAYTHROUGH_CEILING_USD` of US$0.10; current worst cases are about US$0.061 for `The Vanishing Violin` and US$0.060 for `The Night Train`, and this is verified by 8 new checks in `test/budget.mjs` bringing the total to 127 checks.

## 0.4.7 (visual V4, gothic-noir polish of the one-viewport layout)
- The player chrome keeps the V3 one-viewport step layout and restores the gothic-noir atmosphere: parchment texture on cards and inputs, ink-dark blotter panels with a lamp-amber glow, wax-seal red accents, and a subtle grain and vignette on the page. The interrogate stage is an ink blotter with a growing conversation well and parchment slips, not a flat beige box. On a 390-wide phone the title sits on its own row and the EN, PT, Start over and Files controls are 44px tools on a second row, so they no longer overlap the title or the Locations toggle. Desktop and tablet stages fill the remaining height: the conversation log grows and the question box stays at the bottom; short briefing and accuse steps center with a CSS parchment placeholder. The Night Train timetable uses a vertical rail with the time and the station event in separate columns at every width. On desktop the briefing stamp is hidden so only the sidebar stamp remains. Sidebar suspect rows put the name above the role at a 44px portrait. The questions counter uses a single hourglass icon. Desktop and tablet step controls are styled as folder tabs.
- This pass is layout polish only. Game mechanics, motion, and generated art are scheduled in run26/milestones-visual.md, not in this version. The icon sprite, HTML/JS hooks and CSS were produced through the Cup text key. The automated suite still has 119 checks.

## 0.4.6 (visual V3, one-viewport game layout, key-produced UI)
- On a 1280 by 800 desktop the open case is a three-column desk: a left file summary with compact suspect portraits and the step tabs, one center stage that shows a single step (Briefing, Locations, Suspects, Interrogate, Board, or Accuse), and an optional right rail of evidence pins. The personal best sits in a small header item and again on the verdict/accuse stage, not in a floating box. The same step model is used on every width, so a 768 by 1024 tablet keeps two columns where they fit and puts the step tabs under the stage, and a 390-wide phone uses short HUD labels (Brief/Places/People/Ask/Board/Accuse, and Caso/Locais/Pessoas/Interrogar/Quadro/Acusar in Portuguese) with Files as a cabinet icon in the header and enough bottom padding that content does not sit under the dock.
- The Night Train Locations step opens on the timetable, drawn as a vertical railway line with stations at 768 and 1280, and a Time/Rooms toggle is available when a case has a timeline.
- The gothic-noir chrome that shipped in this version (the icon sprite, the layout CSS, the page shell, and the layout JavaScript) was generated through the Cup text key. The earlier visual V1 and V2 commits were written by hand; their substantive UI was regenerated through the key in this pass so the shipped player is key-produced. Receipts and neuron cost are logged in the run notes. The automated suite still has 119 checks.

## 0.4.5 (visual V2, layout fix and gothic-noir icon set)
- The header, main stage and dock share one centered 1120px shell, so the 1280 desktop chrome lines up with the content. On a 390-wide phone the case plays as one step at a time with a sticky bottom HUD (Briefing, Locations, Suspects, Interrogate, Board, Accuse). Tablet (768) uses two columns; desktop uses a sidebar plus stage.
- The cabinet header shows the pack title "Case Files"; the case title appears only after a file is open. Location labels keep light type on a dark scrim so they stay WCAG AA, including the selected room.
- A self-made SVG icon sprite (public/assets/icons.svg, also inlined in the page) covers navigation, roles, rooms, evidence types, timeline marks, verdict and status. Icons sit next to visible text labels and are aria-hidden. test/icons.mjs checks that every referenced icon id exists in the sprite and that referenced icon paths do not 404 (including a guard for rotate-ccw).

## 0.4.4 (visual V1, gothic-noir player with case picker)
- The web player uses a gothic-noir skin (ink, paper, lamp amber) with 44px targets, a visible focus ring, and reduced-motion support. Portraits, rooms and title cards are CSS placeholders; generated art is not in this sprint.
- The page can open The Vanishing Violin or The Night Train without restarting the server: GET /api/cases, GET /api/case?case=, and POST /api/session { case }. The process CASE_ID flag remains the default case for /api/status and for clients that omit the query.
- New screens wrap the existing routes: field-office folder picker, briefing, location strip, dossiers, interrogation, evidence board, accusation and verdict. EN/PT, keyboard behaviour, scoreboard and credits are unchanged.
- public/assets/manifest.json lists the 27 planned images as placeholders, to be filled after the Cup scope is extended.
- Two new checks in test/case-select.mjs cover the pack list and a session that opens The Night Train without a process flag (suite 116 checks).


## 0.4.3 (M2 sprint 3, friendly error for an unknown case id)
- Starting the game server or the CLI with an unknown case id used to crash with a long stack trace, but now they print a single line like `Unknown case "nope". Valid case ids: violin, night-train.` and then exit with code 2.
- This error message is generated by the new unknownCaseLine(id) function in src/case.js and other startup errors are not hidden.
- Two new checks in test/case-select.mjs were added so that the file has 9 checks and the total suite has 114 checks instead of 112.
- The web page still opens The Vanishing Violin and has no case picker yet, so M2 is not delivered.

## 0.4.2 (M2 sprint 2, load a case by id behind a flag)
- The CASES registry is frozen and caseFileFor(id) throws an unknown_case error for any invalid or path-like IDs.
- The server now supports selecting a case via the caseId option, the CASE_ID environment variable, or the --case CLI flag, while defaulting to The Vanishing Violin.
- A new test suite in test/case-select.mjs adds seven checks and renames the night-train check, bringing the total to 112 checks.
- Case selection is not yet available on the web page as M2 is not delivered.

## 0.4.1 (M2 sprint 1, Night Train case file)
- M2 "Case 2: The Night Train" is in progress. New case file content/cases/night-train.json: 4 suspects (Helena, Victor, Tomás, Inês) with EN and PT role, persona and alibi, a 5 stop timeline that crosses midnight, 5 clues, glossary and solution.
- Shared case engine, step 1: fairPlay(c, { suspects }) takes the expected suspect count (default 3, so The Vanishing Violin is unchanged) and the new timelineCheck(c) checks stop order, EN and PT text, known suspects and one crime stop with the culprit.
- Added test/night-train.mjs (8 checks): fair play with 4 suspects, timeline checks and broken timelines, public text never names the culprit, PT prompts keep other suspects' facts private, and the case is not wired into the game yet.
- Not playable yet: the server and the page still load only The Vanishing Violin. M2 is not delivered.

## 0.4.0 (M1 delivered, 2026-11-09)
- M1 "The Vanishing Violin, polished" declared delivered: public case in English and Portuguese, scoreboard and personal best, friendly capacity-out messages, keyboard and screen reader support, credits screen.
- Acceptance re-checked on 2026-11-09: npm test 97/97 and a live EN + PT smoke through the Cup key (EN correct accusation score 100, PT answers in Portuguese, wrong accusation saves no best).
- Docs: README roadmap marks M1 Delivered, PRD M1 scope matches what shipped, docs/M1_DELIVERY.md lists the acceptance checks, cost totals and receipts.
- No product code change in this release.

## 0.3.6 (M1 sprint 17, clear stale hint)
- Choosing a suspect clears the "Choose a suspect first." hint (EN/PT) from #best-status; other status messages such as the game-over line are left alone.
- Added check that selectSuspect clears the pickSuspect hint in both languages.

## 0.3.5 (M1 sprint 16, Ask hints)
- Ask shows a hint in #best-status when no suspect is selected (EN "Choose a suspect first." / PT "Escolha um suspeito primeiro.") instead of returning silently.
- An empty question shows a hint (EN "Type a question first." / PT "Digite uma pergunta primeiro.") and focuses #q.
- Added check that pickSuspect/emptyQuestion EN+PT and the askQuestion hints are present.

## 0.3.4 (M1 sprint 15, lock Ask/Accuse after verdict)
- After a successful accusation, Ask and Accuse stay locked and #best-status shows the game-over line (EN/PT).
- Start over / Nova partida clears the lock and re-enables Ask and Accuse.
- Added check that gameOver/setGameOver and LABELS.gameOver EN+PT are present and guarded.

## 0.3.3 (M1 sprint 14, Escape clears question)
- Escape while the question box is focused clears #q and keeps focus there.
- Does not cancel accuse or restart confirms (native confirm already handles Escape).
- Added check that index.html has an Escape keydown that clears and refocuses #q.

## 0.3.2 (M1 sprint 13, Start over / Nova partida)
- Start over / Nova partida button begins a fresh session without reloading (native confirm EN/PT).
- Cancel keeps the current questions; Confirm posts a new session, clears histories and closed UI, and keeps personal best.
- While Ask is in flight, the restart button is disabled with the same busy lock as Accuse.
- Added check that restart cancel leaves state and confirm creates a new session.

## 0.3.1 (M1 sprint 12, ask busy state)
- While a question is in flight, the question box and Accuse buttons are disabled and #ask-form sets aria-busy.
- Thinking line uses LABELS (EN/PT); on success or error controls reopen, aria-busy clears, leftover thinking is removed, and focus returns to #q.
- Added check that askQuestion disables controls, sets aria-busy, then restores focus.

## 0.3.0 (M1 sprint 11, accuse confirmation)
- Accuse buttons ask for confirmation before the irreversible accusation (native confirm, EN/PT).
- Cancel keeps the game open; Confirm is the only path that calls /api/accuse.
- Added check that the Accuse click path confirms first.
- Player guide notes the one-accusation confirm step.

## 0.2.9 (M1 sprint 10, tidy-up)
- Scoreboard code indentation fixed (no behaviour change).
- package.json version now follows this changelog (was 1.0.0).
- Added check that package.json and the latest changelog entry share the same version.
- SPEC testing section lists all six test files and the real check count.

## 0.2.8 (M1 sprint 9, scoreboard names as plain text)
- Scoreboard player names are shown as plain text, never as HTML.
- Added check that runs the scoreboard with an HTML-looking name.
- Removed extra empty lines at the top of this file and in the README.

## 0.2.7 (M1 sprint 8, best line wording + new best announcement)
- Personal best lines now match the UI language.
- New personal best announced via role=status for screen readers.
- Removed unused variable in tests.
- Added check for localized best lines.

## 0.2.6 (M1 sprint 7, personal scoreboard)
- Added personal best tracking per language in browser localStorage.
- Implemented "Your best / Seu recorde" display and reset functionality.
- Added live question counter under the question box.
- Increased automated tests to 87.

## 0.2.5 (M1 sprint 6, player guide + fair capacity messages)
- Added new player guides in English and Portuguese including scoring and accessibility tips
- Improved error messages and fixed incorrect Portuguese translations for Cup
- Failed questions due to capacity or errors no longer penalize score or affect memory
- Added new capacity tests and increased total test count to 77


## 0.2.4 (M1 sprint 5, consistent suspects)
- Suspects now receive private facts and specific clues in their role-play prompts
- Added rules to prevent suspects from inventing people and to maintain story consistency
- Server now keeps each question with its answer per suspect, so suspects remember what they were asked
- Improved consistency through new offline and live smoke tests

## 0.2.3 (M1 sprint 4, Portuguese wording + backer credits)
- Completed full PT-BR wording pass for the case and UI
- Added "Thanks to the backers" screen using credits from the API
- Fixed language switching to ensure the case reloads in the correct language
- Increased automated checks to 67

## 0.2.2 (M1 sprint 3, wording + keyboard access)
- Portuguese suspects now say "sujas de fuligem" (soot-stained) instead of the stiff "fuliginosas".
- The web player works fully from the keyboard: Tab reaches every control with a visible focus ring, Enter asks a question, choosing a suspect jumps to the question box, and the language toggle reports its state.
- Screen readers get labelled inputs and announced answers and verdicts.
- New real-browser keyboard tests (headless Chrome); 25/25 tests pass.

## 0.2.1 (M1 sprint 2, PT-BR polish)
- Live interrogations in Portuguese now follow a fixed glossary (fogão, sala do fogão, taverna, lampião), so no English words or wrong rooms slip in.
- New test for the PT system prompt (18/18).

## 0.2.0 — M1 polish
- EN and PT-BR for case text, mock suspects, errors and UI (language toggle).
- Scoreboard with per-session question count and one accusation per session.
- Fair-play clue check: culprit provable from 2+ clues, every innocent cleared.
- Friendly bilingual messages for no capacity, rate limit and rejected key.
- Terminal player (src/cli.js); e2e plays the case to a solution in both languages.
## 0.1.0 — M1
- Playable case "The Lighthouse Ledger", 3 suspects, verdict.
- Node server proxy to FullCup, mock mode, capacity error messages, e2e test.
