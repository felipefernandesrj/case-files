# Task (sprint 7): fix your /best.js route in src/server.js
Your route calls `fs.sendFile`, which does not exist (the helper is the plain function `sendFile(res, filePath)` in the same file), and it calls res.writeHead before sendFile, so on any error the server crashes with ERR_HTTP_HEADERS_SENT. Fix: set the header with res.setHeader instead of writeHead, then call the local sendFile.

Current exact lines:
        res.writeHead(200, { 'Content-Type': 'text/javascript; charset=utf-8' });
        return fs.sendFile(res, bestPath);

Output ONLY one literal edit block: <<<REPLACE src/server.js>>> newline, the two current lines exactly, newline, =====, newline, the two fixed lines (8-space indent), newline, <<<END>>>. Separator is exactly five = characters. No prose, no fences.
