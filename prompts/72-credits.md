# Sprint 4 feature spec: closing screen with backer credits
- New data file data/credits.json: {"example": true, "note": "Example data. Replace with real backer names before release.", "title": {"en": "Thanks to the backers", "pt": "Obrigado aos apoiadores"}, "backers": ["Backer 1", "Backer 2", "Backer 3"]}.
- src/server.js: new route GET /api/credits -> 200 JSON {title (string in lang, from ?lang, default en), backers:[string], example:boolean}. createServer gets a new option creditsFile (default 'data/credits.json', resolved from the project root like caseFile). If the file is missing or invalid JSON, return 200 {title (EN "Thanks to the backers" / PT "Obrigado aos apoiadores"), backers:[], example:false}; never crash. Everything else in server.js unchanged.
- public/index.html: after a verdict is shown (after the scoreboard loads), fetch GET /api/credits?lang=<lang> and show a closing screen: <section id="credits" aria-labelledby="credits-title" tabindex="-1"> containing <h2 id="credits-title"> with the title, a <ul id="credits-list"> with one <li> per backer, and, when example is true, a small note (EN "Example names", PT "Nomes de exemplo"). Keyboard focus moves to #credits after it renders (the verdict is still announced first because it is role=status aria-live=assertive). Switching language after the verdict re-renders the credits title/note in the new language. Hidden before the verdict.

# Task
Write data/credits.json exactly as specified (pretty-printed, 2-space indent). Output only that file:
<<<FILE data/credits.json>>>
...
<<<END>>>
