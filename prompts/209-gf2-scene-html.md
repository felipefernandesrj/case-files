Patch public/index.html only. Output exactly three REPLACE blocks, then stop. Each block uses this format, with exactly three < characters at the start, then the old text copied exactly (character for character), then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no markdown fences.

<<<REPLACE public/index.html>>>
old text
=====
new text
<<<END>>>

Context: a gothic-noir pixel-art detective game (one HTML page with an inline script). Requirement from the product owner: the location the player opens must stay on screen as the scene. Today the room art only shows on the room buttons of the Places panel and disappears as soon as the player goes to another step (Ask, People, Board). Wanted: the art of the last opened room becomes a dimmed backdrop of the whole play area (#play), stays while questioning, and crossfades when another room is opened. A small caption names the scene in the current language. Existing globals you can use: `currentRoom` (room id or null), `caseData.rooms` (array of {id, name}, names already in the current language), `lang` ('en' or 'pt'), `locArt(roomId)` (returns the image url or null), `whenArt(url, apply)` (calls apply(url) once the image has loaded). Start over and opening another file already set currentRoom = null and then call renderCase(), which calls renderRooms(); inspectRoom(r) sets currentRoom and calls renderRooms(); a language switch also ends in renderRooms(). So renderRooms() is the single hook.

Block 1. Old text (exact):
    <main id="play">
New text: that same line, then on the next two lines (4 more spaces of indent than main):
      <div id="scene" aria-hidden="true"><div class="scene-layer"></div><div class="scene-layer"></div></div>
      <p id="scene-label" class="scene-label" hidden></p>

Block 2. Old text (exact):
function locArt(roomId) { const c = artCase(); return c ? `/assets/loc/${c}-${LOC_ART_ROOM[roomId] || roomId}.png` : null; }
New text: keep that line unchanged, then add new top-level code at column 0:
- `let sceneRoom = null;` and `let sceneFront = 0;`
- `function syncScene() { ... }` that does, in order:
  1. get #scene; if missing, return. layers = the two .scene-layer elements inside it (querySelectorAll). label = #scene-label. play = #play.
  2. room = the entry of (caseData && caseData.rooms) || [] whose id equals currentRoom (undefined when currentRoom is null).
  3. If there is no room: sceneRoom = null; remove class is-on from every layer; if label, set textContent '' and hidden = true; if play, remove class has-scene; return.
  4. If label: textContent = (lang === 'pt' ? 'Cena: ' : 'Scene: ') + room.name and hidden = false. If play, add class has-scene.
  5. If room.id === sceneRoom, return (same room: no new fade, only the caption language may change).
  6. sceneRoom = room.id; const want = room.id; whenArt(locArt(room.id), (url) => { if (sceneRoom !== want) return; sceneFront = 1 - sceneFront; const next = layers[sceneFront]; const prev = layers[1 - sceneFront]; next.style.backgroundImage = `url(${url})`; next.classList.add('is-on'); if (prev) prev.classList.remove('is-on'); }).

Block 3. Old text (exact, three lines):
    wrap.appendChild(btn);
  });
}
New text: the same three lines, except that a new line `  syncScene();` (2 spaces of indent) goes right before the final closing brace.
