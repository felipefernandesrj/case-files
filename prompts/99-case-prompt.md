# Task (sprint 5): make suspects consistent and stop invented characters
Live play (llama-4-scout) showed two problems: (1) Maya Santos said she noticed nothing unusual about the lock, although her private facts say she saw a faint scratch on it; (2) Carlos invented a "Joe the janitor" who is not in the case.
Root cause: `systemPrompt(c, suspectId, lang)` in src/case.js never sends the suspect's private `facts` nor that suspect's clues to the model, and it never says who exists in the case.

Case data shape (content/case.json): suspects:[{id,name,role{en,pt},persona{en,pt},facts:string (English private role-play instructions)}], clues:[{id,from:suspectId,ask,keywords,implicates,clears,text{en,pt}}], glossary:[{en,pt}].

Requirements for the new systemPrompt (keep the same signature and export; keep everything it does today: intro, "You are role-playing as <name>", persona, the PT glossary block starting with "Use these exact PT‑BR terms:" only for PT and still filtering "violonista", the 3 sentences / under 60 words rule, never reveal AI, reply language):
1. Add a section "Your private facts (fixed, never contradict them):" followed by suspect.facts.
2. Add a section "Things you know and say when asked about them:" with one line "- " + clue.text[lang] for every clue whose from === suspectId.
3. Add a cast section: "The only people in this case are:" followed by one line per suspect "- <name> (<role in lang>)". Then the rule: "Never invent or name any other person (no other staff, guests, witnesses or relatives by name). If asked about someone else, say you only know these people."
4. Add consistency rules: "Stay consistent with everything you said earlier in this conversation and with your private facts. Do not change your story between questions. You may lie only where your facts say you lie or hide something."
5. Do not include c.culprit, c.solution or any other suspect's facts in the prompt.

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

  prompt += `\n\nRespond in character. Use at most 3 short sentences and stay under 60 words. Never reveal you are an AI. Respond in ${l === 'pt' ? 'Portuguese' : 'English'}.`;

  return prompt;
}
<<<END>>>

Output ONLY literal edit blocks for src/case.js (exact old text copied from the excerpt, a line =====, the new text, then <<<END>>>):
<<<REPLACE src/case.js>>>
old
=====
new
<<<END>>>
Use one block that replaces the line `  prompt += \`\n\nRespond in character.` ... through `  return prompt;` with the new sections followed by that same Respond line and return. No prose. Start directly with <<<REPLACE.
