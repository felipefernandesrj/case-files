// Per-case generation cap and worst-case spend for one playthrough (M2 sprint 4).

/** Model used for suspect answers (src/proxy.js default) and its Workers AI price in USD per 1M tokens. */
export const PLAY_MODEL = '@cf/meta/llama-4-scout-17b-16e-instruct';
export const PLAY_PRICE = Object.freeze({ inPerM: 0.27, outPerM: 0.85 });

/** Model calls allowed in one playthrough (one session) when a case sets no maxCalls. */
export const DEFAULT_MAX_CALLS = 20;

/** Documented ceiling for the worst-case spend of one playthrough of any case, in USD. */
export const PLAYTHROUGH_CEILING_USD = 0.1;

/** Calls allowed in one playthrough of case c: its maxCalls (whole number 1 to 100) or DEFAULT_MAX_CALLS. */
export function maxCallsFor(c) {
  const n = c && c.maxCalls;
  return Number.isInteger(n) && n >= 1 && n <= 100 ? n : DEFAULT_MAX_CALLS;
}

/**
 * Worst-case USD for one playthrough: every call answers with maxTokens and resends the system
 * prompt plus the whole history so far. One token is counted per character, an upper bound.
 */
export function worstCaseSpend({ calls, maxTokens, systemChars, questionChars = 500, price = PLAY_PRICE }) {
  let usd = 0;
  for (let k = 0; k < calls; k++) {
    const input = systemChars + k * (questionChars + maxTokens) + questionChars;
    usd += (input * price.inPerM + maxTokens * price.outPerM) / 1e6;
  }
  return usd;
}
