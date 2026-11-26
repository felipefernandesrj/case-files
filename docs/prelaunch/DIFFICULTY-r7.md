# Difficulty report (16 LLM bot games, brain gemma-4-26b, suspects llama-4-scout via the Cup key)

Scores use the v1.0.0 rule (100 up to 3 questions, minus 5 per extra question, floor 10, wrong = 0). Hints were all given to the brain at the start (real players see them at 45/100/160 s), so win rates are an upper bound.

## Per case and language
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| Lapa (gen) EN | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 48.5 s |
| Lapa (gen) PT | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 52.5 s |
| Night Train EN | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 51.5 s |
| Night Train PT | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 47.5 s |
| Samba (gen) EN | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 44.5 s |
| Samba (gen) PT | 2 | 100% | 92.5 | 92.5 | 86.5 | 98.5 | 4.5 | 0% | 53.5 s |
| Violin EN | 2 | 100% | 95 | 95 | 91 | 99 | 4 | 0% | 43.5 s |
| Violin PT | 2 | 100% | 95 | 95 | 91 | 99 | 4 | 0% | 39.5 s |

## Per case
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| Samba (gen) | 4 | 100% | 92.5 | 92.5 | 85 | 100 | 4.5 | 0% | 49 s |
| Lapa (gen) | 4 | 100% | 92.5 | 92.5 | 85 | 100 | 4.5 | 0% | 50.5 s |
| Night Train | 4 | 100% | 92.5 | 92.5 | 85 | 100 | 4.5 | 0% | 49.5 s |
| Violin | 4 | 100% | 95 | 95 | 90 | 100 | 4 | 0% | 41.5 s |

## Per skill persona (r1 = brain chose freely; r2/r3 = harness cap: careless 3 questions, average 60% of budget, methodical whole budget)
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| average capped | 8 | 100% | 86.3 | 85 | 85 | 90 | 5.8 | 0% | 60.1 s |
| careless capped | 8 | 100% | 100 | 100 | 100 | 100 | 3 | 0% | 35.1 s |

## Per language
| group | games | win | mean score | median | p10 | p90 | mean questions | used whole budget | mean time |
|---|---|---|---|---|---|---|---|---|---|
| EN | 8 | 100% | 93.1 | 95 | 85 | 100 | 4.4 | 0% | 47 s |
| PT | 8 | 100% | 93.1 | 95 | 85 | 100 | 4.4 | 0% | 48.3 s |

## Wrong accusations (who confused the bots)
| case | lang | persona | questions | accused | culprit | clues found |
|---|---|---|---|---|---|---|

## Expected score by strategy (v1.0.0 rule vs pre-launch rule: hunch 25 under 2 questions, free questions = fair minimum)
| strategy | old rule | new rule |
|---|---|---|
| careless (capped runs, n=8) | 100 | 100 |
| average (capped runs, n=8) | 86.3 | 95 |
| methodical (capped runs, n=0) | - | - |
| blind guess, 0 questions (Violin 1 in 3, others 1 in 4) | 27.1 expected, 100 on a lucky try | 6.8 expected, 25 max |

## Clues detected by the server per game (keyword match)
mean 0.9; winners with no clue against the culprit detected: 8 of 16
