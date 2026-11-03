# Task (sprint 6): one-line fix in test/capacity.mjs
The game server answers a failed ask with a flat body {error: 'no_capacity', message: '<friendly text>'}. Your check compares the error CODE with the friendly text, so it fails. It must compare `res1.body.message`.
Current line (8-space indent, exact):
        if (res1.body.error !== friendly('no_capacity', lang)) throw new Error('wrong error message');
Output ONLY one literal edit block: <<<REPLACE test/capacity.mjs>>> newline, that exact line, newline, =====, newline, the fixed line (same indent, also checks `res1.body.error === 'no_capacity'`), newline, <<<END>>>. No prose.
