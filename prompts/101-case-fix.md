# Fix (sprint 5): systemPrompt in src/case.js still fails
```
file:///workspace/case-files/src/case.js:51
  prompt += `\n\nYour private facts (fixed, never contradict them):\n${suspect.facts ?? ''}`;
  ^

ReferenceError: prompt is not defined
```
Your last edit removed BOTH copies of the prompt declaration and the PT glossary block, so `prompt` is never declared. Restore exactly ONE copy right after the line `  const persona = suspect.persona?.[l] ?? '';`: the `let prompt = \`${intro}\n\nYou are role‑playing as ...` line and the PT glossary if-block ("Use these exact PT‑BR terms:", filtering violonista), as before.

Current function (written by you):
<<<FILE src/case.js (excerpt)>>>
export function systemPrompt(c, suspectId, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  const suspect = (c.suspects ?? []).find(s => s.id === suspectId) || {};
  const intro = c.intro?.[l] ?? '';
  const persona = suspect.persona?.[l] ?? '';


  prompt += `\n\nYour private facts (fixed, never contradict them):\n${suspect.facts ?? ''}`;

  const myClues = (c.clues ?? []).filter(clue => clue.from === suspectId);
  if (myClues.length > 0) {
    prompt += `\n\nThings you know and say when asked about them:\n${myClues.map(clue => `- ${clue.text[l]}`).join('\n')}`;
  }

  if (c.suspects && c.suspects.length > 0) {
    const cast = c.suspects
      .map(s => `- ${s.name} (${s.role[l]})`)
      .join('\n');
    prompt += `\n\nThe only people in this case are:\n${cast}\nNever invent or name any other person (no other staff, guests, witnesses or relatives by name). If asked about someone else, say you only know these people.`;
  }

  prompt += `\n\nStay consistent with everything you said earlier in this conversation and with your private facts. Do not change your story between questions. You may lie only where your facts say you lie or hide something.\n\nRespond in character. Use at most 3 short sentences and stay under 60 words. Never reveal you are an AI. Respond in ${l === 'pt' ? 'Portuguese' : 'English'}.`;

  return prompt;
}
<<<END>>>

Output ONLY one literal edit block. The old text must be exactly the single line:
  const persona = suspect.persona?.[l] ?? '';
and the new text is that same line followed by the restored declaration and glossary block. Format: <<<REPLACE src/case.js>>> newline, old line, newline, =====, newline, new text, newline, <<<END>>>. No prose.
