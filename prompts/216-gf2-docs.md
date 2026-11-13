Patch docs. Output exactly seven REPLACE blocks, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>> (it would overwrite the whole file). No commentary, no fences. Plain English sentences, no shorthand, no arrows, no em dashes, bullets start with "- ".

<<<REPLACE path>>>
old text
=====
new text
<<<END>>>

Facts for version 0.4.11 (M2 game feel, sprint 2):
- The room the player opens now stays on screen as the scene. Its pixel-art plate becomes a dimmed backdrop of the whole play area and stays there while the player questions suspects, reads the dossier, checks the board or accuses. Opening another room crossfades to the new plate. A small caption names the scene (Scene: Instrument room, or Cena: Sala de instrumentos in Portuguese) and follows the language switch. The fade is skipped when the player asks for reduced motion. Start over and opening another case file clear the scene. The conversation panel is see-through while a scene is shown so the room shows behind it. Checked at 1280 and 390 wide.
- On desktop the CASE CLOSED stamp no longer overlaps the Score line; it now sits on its own line below the score.
- New test/scene.mjs with 8 checks (scene markup, the room list drives the scene, first room shows with its caption, crossfade to a second room and no new fade for the same room, Portuguese caption, scene cleared on reset, dimmed backdrop with fade and reduced motion, stamp below the score). The automated suite now has 144 checks.

Block 1 (CHANGELOG.md). Old text:
# Changelog

New text: the same heading line and blank line, then a new section "## 0.4.11 (M2 game feel, sprint 2: the room stays as the scene)" with one bullet per fact above, then a blank line.

Block 2 (package.json). Old text:
  "version": "0.4.10",
New text:
  "version": "0.4.11",

Block 3 (README.md). Old text:
**M2 in progress (v0.4.10, game feel sprint 1).**
New text:
**M2 in progress (v0.4.11, game feel sprint 2).**

Block 4 (README.md). Old text:
Suspicion bars and a continue countdown come in the next sprints.
New text:
The room the player opens now stays behind the play area as a dimmed scene and crossfades when another room is opened. Suspicion bars and a continue countdown come in the next sprints.

Block 5 (README.md). Old text:
136 automated checks.
New text:
144 automated checks.

Block 6 (docs/BUILD_LOG.md). Old text:
- Details and receipts: qa/rework.md (M2 game feel sprint 1).
New text: that same line, then a blank line, then a new section:
## M2 game feel sprint 2 (v0.4.11)

- Scope: the opened room stays as a dimmed scene behind the play area (crossfade between rooms, EN/PT caption, reduced motion respected, cleared on Start over and on opening another file); the CASE CLOSED stamp no longer overlaps the Score line on desktop.
- Calls 209-217 through the Cup key (`@cf/google/gemma-4-26b-a4b-it`, thinking off). No live play smoke (page-only change, checked in mock mode with headless Chrome screenshots at 1280 and 390).
- Result: npm test 144/144 (was 136), new test/scene.mjs 8 checks.
- Details and receipts: qa/rework.md (M2 game feel sprint 2).

Block 7 (docs/SPEC.md). Old text:
## Web page: closing screen
New text: a new section first, then a blank line, then keep that heading:
## Web page: scene backdrop (M2 game feel sprint 2)

- Markup: the first children of `#play` are `#scene` (aria-hidden, two `.scene-layer` divs) and `#scene-label`.
- `syncScene()` runs at the end of `renderRooms()`, so opening a room, Start over, opening another file and switching language all update it. With a current room it sets the caption to `Scene: <room name>` or `Cena: <room name>`, adds `has-scene` to `#play` and, only when the room changed, loads the plate with `locArt` and fades it in on the other layer while the old layer fades out. With no current room it clears both layers and hides the caption.
- CSS: `.scene-layer` fades opacity over 700ms to 0.35 (a dimmed backdrop under a dark vignette); reduced motion removes the fade; the conversation panel and log are see-through while `has-scene` is set.
- The CASE CLOSED stamp is a centred block below the Score line (margin 32px above), so its rotation never covers the score.
