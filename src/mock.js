// Deterministic offline suspects (MOCK mode). Patterns match EN and PT questions.
const R = {
  marta: [[/where|night|23|home|alibi|onde|noite|casa|álibi/i, { en: 'I was home all night, going over accounts.', pt: 'Fiquei em casa a noite toda, revisando contas.' }],
    [/soot|boot|lantern|fuligem|bota|lanterna/i, { en: 'Soot? It is a harbor town. I... do not see why that matters.', pt: 'Fuligem? É uma cidade portuária. Eu... não vejo por que isso importa.' }],
    [/ledger|debt|owe|livro|dívida|deve/i, { en: 'The ledger was harbor business. I kept it tidy, nothing more.', pt: 'O livro era assunto do porto. Eu só o mantinha em ordem.' }]],
  tomas: [[/saw|see|lantern|23|viu|ver|lanterna/i, { en: 'Around eleven I saw a lantern below, by the stove room. No face.', pt: 'Por volta das onze vi uma lanterna lá embaixo, perto do fogão. Sem rosto.' }],
    [/where|night|alibi|onde|noite|álibi/i, { en: 'Lamp room, all night. Someone has to keep the light.', pt: 'Na sala da lâmpada, a noite toda. Alguém tem que manter a luz.' }],
    [/ledger|livro/i, { en: 'Never read the thing. Not my business.', pt: 'Nunca li aquilo. Não é da minha conta.' }]],
  lia: [[/soot|boot|marta|fuligem|bota/i, { en: "Funny you ask. Marta's boots were black with soot this morning.", pt: 'Engraçado você perguntar. As botas da Marta estavam pretas de fuligem hoje cedo.' }],
    [/where|night|alibi|onde|noite|álibi/i, { en: 'Tavern until midnight. Ask the barman.', pt: 'Na taverna até meia-noite. Pergunte ao taberneiro.' }],
    [/ledger|debt|owe|livro|dívida|deve/i, { en: "Sure, I owed them. Half the harbor did. I didn't burn it.", pt: 'Claro, eu devia. Meio porto devia. Não fui eu que queimei.' }]]
};
export function mockAnswer(id, q, lang = 'en') {
  for (const [re, a] of R[id] || []) if (re.test(q)) return a[lang] || a.en;
  return lang === 'pt' ? 'Não tenho mais nada a dizer sobre isso.' : 'I have nothing more to say about that.';
}
