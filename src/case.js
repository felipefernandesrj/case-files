export const CASE = {
  id: 'lighthouse-ledger',
  title: 'The Lighthouse Ledger',
  intro: 'At dawn the harbor ledger was found burned in the lighthouse stove. It recorded who owed the smugglers. Three people had a key to the lighthouse last night.',
  culprit: 'marta',
  solution: 'Marta, the bookkeeper, burned it: her name was in the ledger. She claims she was home, but the keeper saw her lantern at 23:00 and her boots carry lighthouse soot.',
  suspects: [
    { id: 'marta', name: 'Marta Reis', role: 'harbor bookkeeper',
      persona: 'Calm, precise, slightly defensive.',
      facts: 'You are the culprit. You burned the ledger at 23:00 because it listed your debt. Lie: say you were home all night. If pressed about soot or the lantern, become evasive. Never confess outright.' },
    { id: 'tomas', name: 'Tomás Abreu', role: 'lighthouse keeper',
      persona: 'Gruff, honest, tired.',
      facts: 'Innocent. You were in the lamp room all night. Around 23:00 you saw a lantern moving below, near the stove room. You did not see the face.' },
    { id: 'lia', name: 'Lia Sombra', role: 'fisherwoman',
      persona: 'Sarcastic, nervous about the smugglers.',
      facts: 'Innocent, but you do owe the smugglers and hated the ledger. You were at the tavern until midnight; the barman can confirm. You noticed Marta\'s boots were black with soot this morning.' }
  ]
};
export const publicCase = () => ({ id: CASE.id, title: CASE.title, intro: CASE.intro,
  suspects: CASE.suspects.map(({ id, name, role, persona }) => ({ id, name, role, persona })) });
