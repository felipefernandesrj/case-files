test/pack-m4.mjs check 8 fails with: ReferenceError: listen is not defined. My last instruction said "await listen(0)", which I meant as: start the server on a free port and wait until it listens. Fix the line (old text exactly, 4 spaces) with one edit block (old line, a line =====, new line; no labels):
    await listen(0);
Use: await new Promise(r => ps.listen(0, r));
Shape:
<<<REPLACE test/example.mjs>>>
  const total = a + b;
=====
  const total = Number(a) + Number(b);
<<<END>>>
Start your reply directly with <<<REPLACE. No analysis text.
