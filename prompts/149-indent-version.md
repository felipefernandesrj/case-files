# Task (sprint 10): fix an indentation nit, align package.json version, add test 13
Output ONLY these 3 edit blocks, in this order. No prose, no fences, no comments that think aloud, no em-dashes.

Block 1, public/index.html, as one unified-diff hunk inside a REPLACE block (`-` removed line, `+` added line, a leading space marks an unchanged context line). In loadScores the inner forEach body is indented 8 spaces; the file style is 6. Re-indent those 3 lines to 6 spaces, change nothing else. Output exactly:
<<<REPLACE public/index.html>>>
@@
     [i + 1, row.player, row.score, row.questions].forEach(value => {
-        const td = document.createElement('td');
-        td.textContent = String(value);
-        tr.appendChild(td);
+      const td = document.createElement('td');
+      td.textContent = String(value);
+      tr.appendChild(td);
     });
<<<END>>>
(Each context line starts with one space and then the original 4-space indentation. Removed lines have 8 spaces after `-`, added lines have 6 spaces after `+`.)

Block 2, package.json, literal edit. Format: <<<REPLACE path>>> newline, OLD, newline, ===== (exactly five =) on its own line, newline, NEW, newline, <<<END>>>. The line right after ===== is the first line of NEW.
OLD is exactly this 1 line:
  "version": "1.0.0",
NEW is exactly this 1 line:
  "version": "0.2.9",

Block 3, test/scoreboard.mjs, literal edit in the same ===== format. OLD is exactly this 1 line:
  const passed = results.filter(r => r.ok).length;
NEW: a new test 13, then an empty line, then that same original line. Test 13, same style as the others (the file's own `test(name, fn)` and `assert(cond, msg)`; fs is already imported, 2-space indentation, 4 spaces inside the test body):
  // 13. package.json version matches the latest CHANGELOG entry
  results.push(await test("package.json version matches CHANGELOG", async () => {
    ...
  }));
Inside the test, in this order:
1. const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
2. const top = fs.readFileSync('./CHANGELOG.md', 'utf8').match(/^## (\d+\.\d+\.\d+)/m);
3. assert(top, "no CHANGELOG version heading");
4. assert(pkg.version === top[1], `package.json ${pkg.version} vs CHANGELOG ${top[1]}`);
