/**
 * Friendly messages for client‑facing errors.
 * @param {'no_capacity'|'rate_limited'|'bad_key'|'upstream'|'call_cap'|'bad_request'|'unknown_suspect'|'unknown_session'|'empty_question'|'question_too_long'|'already_accused'|'out_of_questions'} code
 * @param {'en'|'pt'} lang
 * @returns {string}
 */
export function friendly(code, lang) {
  const msgs = {
    no_capacity: {
      en: 'This case is out of play capacity for now. Backers can refill it on FullCup. Your questions so far are kept and nothing was counted for this one. Try again later.',
      pt: 'Este caso está sem capacidade de jogo por enquanto. Os apoiadores podem reabastecer no FullCup. Suas perguntas foram salvas e nada foi contabilizado nesta. Tente novamente mais tarde.',
    },
    rate_limited: {
      en: 'There are too many questions at once. Please wait a few seconds and ask again.',
      pt: 'Há muitas perguntas ao mesmo tempo. Por favor, aguarde alguns segundos e tente novamente.',
    },
    bad_key: {
      en: 'The game is not connected to its Cup right now. The creator has to fix it; it is not your fault.',
      pt: 'O jogo não está conectado ao seu Cup agora. O criador precisa consertar isso; não é culpa sua.',
    },
    upstream: {
      en: 'The suspects could not answer right now, please ask again in a moment. Your question was not counted.',
      pt: 'Os suspeitos não puderam responder agora, por favor tente novamente em um momento. Sua pergunta não foi contabilizada.',
    },
    call_cap: {
      en: 'You have used all the questions for this case in this game. Make your accusation, or press Start over for a new game.',
      pt: 'Você usou todas as perguntas deste caso nesta partida. Faça sua acusação ou toque em Nova partida para jogar de novo.',
    },
    bad_request: {
      en: 'The question could not be read, please type it again.',
      pt: 'A pergunta não pôde ser lida, por favor digite-a novamente.',
    },
    unknown_suspect: {
      en: 'That suspect is not in this case file. Pick someone from People and ask again.',
      pt: 'Esse suspeito não está neste dossiê. Escolha alguém em Pessoas e pergunte de novo.',
    },
    unknown_session: {
      en: 'This game has expired. Press Start over to open a new one; your best score is kept.',
      pt: 'Esta partida expirou. Toque em Nova partida para abrir outra; seu recorde continua salvo.',
    },
    empty_question: {
      en: 'Type a question first.',
      pt: 'Digite uma pergunta primeiro.',
    },
    question_too_long: {
      en: 'That question is too long. Keep it under 500 characters.',
      pt: 'Essa pergunta é longa demais. Use menos de 500 caracteres.',
    },
    already_accused: {
      en: 'You already named a culprit in this game. Press Start over to play again.',
      pt: 'Você já apontou um culpado nesta partida. Toque em Nova partida para jogar de novo.',
    },
    out_of_questions: {
      en: 'No questions left in this game. Name the culprit in Accuse, or press Start over for a new game.',
      pt: 'Acabaram as perguntas desta partida. Aponte o culpado em Acusar ou toque em Nova partida para jogar de novo.',
    },
  };

  const entry = msgs[code];
  if (!entry) return '';
  return lang === 'pt' ? entry.pt : entry.en;
}
