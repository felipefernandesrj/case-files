# Task (sprint 7): serve the new browser module public/best.js
src/server.js (written by you) only serves public/index.html at GET /. The page will now import '/best.js'. Add a route GET /best.js that sends public/best.js with header Content-Type: text/javascript; charset=utf-8 (status 200). Keep everything else unchanged.

Current exact lines (4-space and 6-space indent):
Line A:
  const indexPath = resolve(__dirname, '..', 'public', 'index.html');
Line B:
      if (req.method === 'GET' && pathname === '/') {

Output ONLY two literal edit blocks, nothing else:
1. <<<REPLACE src/server.js>>> newline, line A exactly, newline, =====, newline, line A exactly, newline, a line `  const bestPath = resolve(__dirname, '..', 'public', 'best.js');`, newline, <<<END>>>
2. <<<REPLACE src/server.js>>> newline, line B exactly, newline, =====, newline, the new route (3 to 5 lines, 6-space indent, writeHead 200 with the content type, then sendFile(res, bestPath), return), newline, line B exactly, newline, <<<END>>>
Separator is exactly five = characters on its own line. No prose, no fences.
