# Fix (sprint 5): your last edit to src/case.js does not load

```
file:///workspace/case-files/src/case.js:62
  let prompt = `${intro}\n\nYou are role‑playing as ${suspect.name ?? ''}. ${persona}`;
      ^

```
Your edit re-declared `let prompt` and repeated the glossary block a second time inside systemPrompt. Keep the first declaration and the first glossary block; remove the second copy (from the second `let prompt = ...` line through the end of the second glossary if-block). Everything you added after that (private facts, clues, cast, consistency rules) stays.

Current function (written by you):
<<<FILE src/case.js (excerpt)>>>
export function systemPrompt(c, suspectId, lang) {
  const l = lang === 'pt' ? 'pt' : 'en';
  const suspect = (c.suspects ?? []).find(s => s.id === suspectId) || {};
  const intro = c.intro?.[l] ?? '';
  const persona = suspect.persona?.[l] ?? '';
  let prompt = `${intro}\n\nYou are role‑playing as ${suspect.name ?? ''}. ${persona}`;

  // Glossary is added for PT prompts. Include all glossary entries except any that contain the term "violonista".
  if (l === 'pt' && Array.isArray(c.glossary)) {
    const lines = c.glossary
      .map(g => `${g.en}: ${g[l]}`)
      .filter(line => !/violonista/i.test(line))
      .join('\n');
    if (lines) {
      prompt += `\nUse these exact PT‑BR terms:\n${lines}`;
    }
  }

  let prompt = `${intro}\n\nYou are role‑playing as ${suspect.name ?? ''}. ${persona}`;

  // Glossary is added for PT prompts. Include all glossary entries except any that contain the term "violonista".
  if (l === 'pt' && Array.isArray(c.glossary)) {
    const lines = c.glossary
      .map(g => `${g.en}: ${g[l]}`)
      .filter(line => !/violonista/i.test(line))
      .join('\n');
    if (lines) {
      prompt += `\nUse these exact PT‑BR terms:\n${lines}`;
    }
  }

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

Output ONLY one literal edit block for src/case.js: exact old text (the duplicated lines, copied exactly), a line =====, the new text (may be empty), then <<<END>>>. No prose. Start directly with <<<REPLACE src/case.js>>>.
