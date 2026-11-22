Conserve as many tokens as possible and be fast (merge commands in few calls).
Bug seen in Chrome at 390 px (EN, Night Train, Lapa, Samba): after opening a room, the label "SCENE: BACK OFFICE" (p#scene-label.scene-label, position absolute, top 8px, right 12px inside main#play) sits on top of the "Locations" sub-tab button (label box 102-120 px from the top, tab 94-138). Fix with CSS only: under 768 px the label leaves absolute positioning and flows as a small block above the panel, aligned right. Desktop unchanged.

One edit block (old text copied exactly, a line =====, new text; no labels), public/css/game.css, old text (a whole line):
.scene-label[hidden] { display: none; }
new text: that line, then a new line:
@media (max-width: 767px) { .scene-label { position: static; display: block; width: fit-content; max-width: 100%; margin: 0 0 8px auto; } }

Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
