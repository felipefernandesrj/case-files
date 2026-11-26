# Difficulty report (82 LLM bot games, brain gemma-4-26b, suspects llama-4-scout via the Cup key)

Scores use the v1.0.0 rule (100 up to 3 questions, minus 5 per extra question, floor 10, wrong = 0). Hints were all given to the brain at the start (real players see them at 45/100/160 s), so win rates are an upper bound.

## Per case and language
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| Lapa (gen) EN | 9 | 89% | 66.7 | 65 | 52 | 88 | 7.4 | 44% | 72.8 s |
| Lapa (gen) PT | 9 | 100% | 80 | 75 | 69 | 100 | 7 | 11% | 71 s |
| Night Train EN | 12 | 75% | 51.3 | 65 | 0 | 70 | 8 | 50% | 68 s |
| Night Train PT | 9 | 89% | 70.6 | 70 | 56 | 100 | 7 | 0% | 66.1 s |
| Samba (gen) EN | 9 | 89% | 68.9 | 70 | 52 | 100 | 7.3 | 33% | 67.6 s |
| Samba (gen) PT | 9 | 100% | 81.1 | 85 | 65 | 100 | 6.8 | 22% | 54 s |
| Violin EN | 13 | 92% | 74.6 | 75 | 75 | 90 | 6.5 | 46% | 59.3 s |
| Violin PT | 12 | 100% | 84.2 | 80 | 75.5 | 99 | 6.2 | 17% | 55 s |

## Per case
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| Violin | 25 | 96% | 79.2 | 80 | 75 | 96 | 6.4 | 32% | 57.2 s |
| Night Train | 21 | 81% | 59.5 | 70 | 0 | 85 | 7.6 | 29% | 67.2 s |
| Lapa (gen) | 18 | 94% | 73.3 | 70 | 65 | 100 | 7.2 | 28% | 71.9 s |
| Samba (gen) | 18 | 94% | 75 | 70 | 65 | 100 | 7.1 | 28% | 60.8 s |

## Per skill persona (r1 = brain chose freely; r2/r3 = harness cap: careless 3 questions, average 60% of budget, methodical whole budget)
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| average capped | 16 | 81% | 70.3 | 85 | 0 | 90 | 5.8 | 0% | 57.4 s |
| average free | 12 | 100% | 72.9 | 70 | 70 | 80 | 8.4 | 25% | 64.4 s |
| careless capped | 16 | 75% | 75 | 100 | 0 | 100 | 3 | 0% | 36.1 s |
| careless free | 11 | 100% | 74.1 | 70 | 65 | 80 | 8.2 | 27% | 72.9 s |
| methodical capped | 16 | 100% | 69.7 | 67.5 | 65 | 77.5 | 9.1 | 63% | 83.8 s |
| methodical free | 11 | 100% | 70 | 70 | 65 | 75 | 9 | 73% | 74.5 s |

## Per language
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| EN | 43 | 86% | 65.2 | 70 | 0 | 90 | 7.3 | 44% | 66.3 s |
| PT | 39 | 97% | 79.4 | 80 | 69 | 100 | 6.7 | 13% | 61 s |

## Wrong accusations (who confused the bots)
| case | lang | persona | questions | accused | culprit | clues found |
|---|---|---|---|---|---|---|
| Violin | en | careless | 3 | lorenzo | carlos | 1 |
| Night Train | en | careless | 3 | tomas | ines | 0 |
| Night Train | pt | average | 6 | helena | ines | 0 |
| Lapa (gen) | en | careless | 3 | suspect-4 | suspect-2 | 0 |
| Night Train | en | careless | 3 | victor | ines | 0 |
| Night Train | en | average | 6 | tomas | ines | 0 |
| Samba (gen) | en | average | 6 | lucas-the-manager | marta-the-dancer | 0 |

## Expected score by strategy (v1.0.0 rule vs pre-launch rule: hunch 25 under 2 questions, free questions = fair minimum)
| strategy | old rule | new rule |
|---|---|---|
| careless (capped runs, n=16) | 75 | 75 |
| average (capped runs, n=16) | 70.3 | 77.2 |
| methodical (capped runs, n=16) | 69.7 | 78.4 |
| blind guess, 0 questions (Violin 1 in 3, others 1 in 4) | 27.1 expected, 100 on a lucky try | 6.8 expected, 25 max |

## Clues detected by the server per game (keyword match)
mean 1; winners with no clue against the culprit detected: 42 of 75
