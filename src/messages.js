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
