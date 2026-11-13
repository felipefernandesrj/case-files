Patch test/scene.mjs only. Output exactly four REPLACE blocks, then stop. Format: exactly three < characters at the start, then the old text copied exactly, then a line of exactly five equals signs, then the new text, then <<<END>>>. Do not write the words OLD or NEW inside a block. NEVER emit <<<FILE>>>. No commentary, no fences.

<<<REPLACE test/scene.mjs>>>
old text
=====
new text
<<<END>>>

Output of running your test: "FAIL first room shows: not one layer on", "FAIL crossfade and same room: not one layer on", "FAIL Portuguese caption: expected Cena: Cellar, got ". Cause: in the product, currentRoom holds a room id string (syncScene does `.find(r => r.id === currentRoom)`), but your getRoom() returns the room object, so no room matches. getRoom must return the id (or null).

Block 1. Old text (exact):
  const getRoom = () => caseData.rooms.find(r => r.id === 'a');
New text:
  const getRoom = () => 'a';

Block 2. Old text (exact):
  const getRoom = () => caseData.rooms.find(r => r.id === currentRoomId);
New text:
  const getRoom = () => currentRoomId;

Block 3. Old text (exact):
  const getRoom = () => caseData.rooms.find(r => r.id === 'b');
New text:
  const getRoom = () => 'b';

Block 4. Old text (exact):
  const getRoom = () => currentRoomId ? caseData.rooms.find(r => r.id === currentRoomId) : null;
New text:
  const getRoom = () => currentRoomId || null;
