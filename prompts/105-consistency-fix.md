# Fix (sprint 5): test/consistency.mjs (written by you) does not start
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/workspace/case-files/src/server.mjs' imported from /workspace/case-files/test/consistency.mjs
```
The files are src/server.js and src/case.js (.js, not .mjs). Current import lines:
import { createServer } from '../src/server.mjs';
import { loadCase, systemPrompt } from '../src/case.mjs';
import http from 'node:http';

Output ONLY literal edit blocks for test/consistency.mjs: <<<REPLACE test/consistency.mjs>>> newline, exact old line, newline, =====, newline, new line, newline, <<<END>>>. One block per wrong line. No prose.
