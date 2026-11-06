# Changelog

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
