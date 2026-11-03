# Task (sprint 6): docs/SPEC.md, document the new counting rule
Exact old line in docs/SPEC.md (2-space indent):
  - Returns: `{ answer: string, questions: number }`.
New text: that same line, then a new line with the same indent: `  - Only a successful answer counts: `questions` and the suspect's history change only on 200. A failed ask (402, 429, 502, 503) changes nothing in the session, and `message` is a friendly EN/PT sentence from src/messages.js.`
Output ONLY one literal edit block: <<<REPLACE docs/SPEC.md>>> newline, exact old line, newline, ===== (five =), newline, new text (two lines), newline, <<<END>>>. No prose.
