# Task (sprint 5): offline test for suspect consistency and no invented characters
Write a new file test/consistency.mjs and update package.json so `npm test` also runs it. Node 20+, ES modules, ZERO npm deps, no network (all upstream calls use a fake fetch).

Project facts you need:
- src/case.js exports loadCase(file='content/case.json') (path relative to project root), systemPrompt(c, suspectId, lang).
- content/case.json shape: {id,title{en,pt},intro{en,pt},culprit,suspects:[{id,name,role{en,pt},persona{en,pt},facts:string}],clues:[{id,from,ask,keywords,implicates,clears,text{en,pt}}],glossary:[{en,pt}],solution{en,pt}}. Suspect ids: lorenzo, maya, carlos. Maya's facts (English) contain "scratch"; her PT clue text contains "arranhão".
- src/server.js exports createServer({caseFile, scoreFile, key, baseUrl, fetchImpl, mock}) -> http.Server (not listening). Use caseFile 'content/case.json', scoreFile null, mock false, key 'test-key', baseUrl 'http://upstream.test/v1', fetchImpl = your fake.
- The server calls fetchImpl(url, {method, headers, body}) where body is JSON {model, messages, max_tokens}. A fake success response: { ok: true, status: 200, json: async () => ({ choices: [{ message: { role: 'assistant', content: '...' } }] }), text: async () => '' }. A fake failure: { ok: false, status: 502, json: async () => ({ error: 'workers_ai_unavailable' }), text: async () => '' }.
- Routes: POST /api/session -> {sessionId}; POST /api/ask {sessionId, suspectId, question, lang} -> 200 {answer, questions} or error status.
- systemPrompt now contains: "Your private facts (fixed, never contradict them):" + facts; "Things you know and say when asked about them:" + "- " + text[lang] of each clue whose from is that suspect; "The only people in this case are:" + "- <name> (<role[lang]>)" per suspect; "Never invent or name any other person"; "Stay consistent with everything you said earlier".

Tests to write (same style as the rest of the project: a tiny `test(name, fn)` registry, run sequentially, print `PASS name` / `FAIL name: msg`, then `N passed, M failed`, exit 1 on any failure; start the server with listen(0) and close it in finally):
1. For every suspect and both langs: prompt includes that suspect's facts, each of that suspect's clue texts in that lang, all 3 suspect names, "Never invent", "Stay consistent".
2. For every suspect: prompt does NOT include any other suspect's facts, nor c.solution.en, nor c.solution.pt.
3. Maya lock is locked in: EN prompt for maya includes "scratch"; PT prompt for maya includes "arranhão".
4. History holds questions and answers: ask maya "Did you see the lock?" then "Was the lock normal?" (fake answers "A1", "A2"); the 2nd upstream request's messages are exactly [system, {user,'Did you see the lock?'}, {assistant,'A1'}, {user,'Was the lock normal?'}] (compare role+content).
5. History is per suspect: after test 4 style questions to maya, a question to carlos in the same session sends only [system, user].
6. Failed upstream call adds nothing: 1st ask to maya gets the fake 502 (server answers 502), 2nd ask succeeds; the 2nd upstream request has only [system, user].
7. No invented people in the prompt: a helper `namesIn(text)` returning capitalised words; check that every capitalised word in the "The only people in this case are:" section (up to the next blank line) is part of a suspect name or role.

package.json currently:
{
  "name": "fullcup-mystery",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "test": "node test/e2e.mjs && node test/proxy.mjs && node test/keyboard.mjs"
  },
  "dependencies": {}
}
Add `&& node test/consistency.mjs` to the test script after proxy.mjs (before keyboard.mjs). Keep everything else.

Output ONLY two files, each as <<<FILE path>>> ... <<<END>>>: test/consistency.mjs and package.json. No prose, no markdown fences.
