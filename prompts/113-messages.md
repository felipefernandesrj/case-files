# Task (sprint 6): clearer player messages when the game cannot answer
File src/messages.js (written by you) exports friendly(code, lang) with short EN/PT texts. Players see these texts in the page error box and the terminal player. Current texts are too terse, and PT translates the brand "Cup" as "Copo", which is wrong (FullCup and Cup are product names and stay in English).

Requirements for the new texts (plain, friendly, full sentences ending with a period, no em-dashes, no technical words like "upstream", "capacity class", "402"):
- no_capacity: say this case has run out of play capacity for now; backers can refill it on FullCup; your questions so far are kept and nothing was counted for this one; try again later. EN must contain "out of play capacity", "backers" and "FullCup". PT must contain "sem capacidade de jogo", "apoiadores" and "FullCup" (natural PT-BR, with accents).
- rate_limited: too many questions at once, wait a few seconds and ask again. PT natural.
- bad_key: the game is not connected to its Cup right now, the creator has to fix it; it is not your fault.
- upstream: the suspects could not answer right now, please ask again in a moment; your question was not counted.
- bad_request: the question could not be read, please type it again.
- Keep the same function signature, JSDoc, codes and behaviour: unknown code returns '', lang 'pt' gets PT, anything else gets EN.
- Keep each text under 200 characters.

Current file:
<<<FILE src/messages.js>>>
/**
 * Friendly messages for client‑facing errors.
 * @param {'no_capacity'|'rate_limited'|'bad_key'|'upstream'|'bad_request'} code
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function friendly(code, lang) {
  const msgs = {
    no_capacity: {
      en: 'this Cup is out of capacity, backers can refill it',
      pt: 'este Copo está sem capacidade, os apoiadores podem reabastecê-lo',
    },
    rate_limited: {
      en: 'try again in a moment',
      pt: 'tente novamente em um momento',
    },
    bad_key: {
      en: 'game key not configured or invalid, the creator was notified',
      pt: 'chave do jogo não configurada ou inválida, o criador foi notificado',
    },
    upstream: {
      en: 'upstream service error, please try later',
      pt: 'erro no serviço upstream, tente novamente mais tarde',
    },
    bad_request: {
      en: 'bad request',
      pt: 'requisição inválida',
    },
  };

  const entry = msgs[code];
  if (!entry) return '';
  return lang === 'pt' ? entry.pt : entry.en;
}
<<<END>>>

Output ONLY the full new file as <<<FILE src/messages.js>>> ... <<<END>>>. No prose.
