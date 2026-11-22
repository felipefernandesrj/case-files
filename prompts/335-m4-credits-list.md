Conserve as many tokens as possible and be fast (merge commands in few calls).
Bug seen in Chrome at 1280 px: the credits list after a verdict sits in a centered box (text-align center), but the list keeps its default outside disc bullets, so every bullet stands about 96 px left of its centered name. Fix with plain CSS: no bullets and no left padding for the credits list, names stay centered on desktop and left aligned on mobile as today. Also add one test check.

Two edit blocks (old text copied exactly, a line =====, new text; no labels):

1. public/css/game.css, old text (end of line 795):
#credits-others { color: var(--cf-text-dim); font-style: italic; }
new text: the same rule, then on the same line:  #credits-list { list-style: none; padding-left: 0; margin: 8px 0; } #credits-list li { margin: 2px 0; }

2. test/pack-m4.mjs, old text:
    assert(!cos.includes('https://fullcup.ai'), 'cos2');
new text: that line, then a new line (4 spaces) that reads public/css/game.css with await readFile(..., 'utf8') into const css and asserts /#credits-list\s*\{[^}]*list-style:\s*none/.test(css) with message 'css1'.

Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
