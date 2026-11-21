Your previous output for the Case Files M4 task has these errors. Fix them with REPLACE blocks only (OLD copied exactly from the current files shown, then a line of =====, then NEW):
<<<REPLACE path>>>
OLD
=====
NEW
<<<END>>>

Error 1. `node src/costs.js` crashes:
Error: ENOENT: no such file or directory, open '/workspace/case-files/violin'
    at loadCase (src/case.js:13:21)
    at writeCostLog (src/costs.js:165:18)
CASES maps a case key to its case FILE path; loadCase takes the file path. Current code in src/costs.js:
    cases[key] = loadCase(key);

Error 2. src/scoreboard.js packTop must group players by the name trimmed AND lowercased (so "Ana" and " ana " are one player) and must skip names whose trimmed lowercased text is '' or 'anon' (" Anon " is skipped too). Current code:
      const nameRaw = entry.player;
      if (!nameRaw || nameRaw.trim() === '' || nameRaw.toLowerCase() === 'anon') continue;
      const name = nameRaw.trim();
      
      if (!playersMap.has(name)) {
        playersMap.set(name, { name, entries: [] });
      }
      playersMap.get(name).entries.push(entry);
(the display name stays the trimmed text of the newest entry, as the code below it already does).

Error 3. src/server.js /costs must send `Content-Type: text/html; charset=utf-8` (it sends none), and /api/costs must resolve a relative costFile against the project root (resolve(__dirname, '..', costFile)), not the process working directory; an absolute costFile is used as is. Current code:
      if (req.method === 'GET' && pathname === '/costs') {
        return sendFile(res, resolve(__dirname, '..', 'public', 'costs.html'));
      }
and
          const absPath = resolve(costFile);
Start your reply directly with <<<REPLACE. No analysis text.
