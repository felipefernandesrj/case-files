const R = {
  marta: [[/where|night|23|home|alibi/i,'I was home all night, going over accounts.'],[/soot|boot|lantern/i,'Soot? It is a harbor town. I... do not see why that matters.'],[/ledger|debt|owe/i,'The ledger was harbor business. I kept it tidy, nothing more.']],
  tomas: [[/where|night|alibi/i,'Lamp room, all night. Someone has to keep the light.'],[/saw|see|lantern|23/i,'Around eleven I saw a lantern below, by the stove room. No face.'],[/ledger/i,'Never read the thing. Not my business.']],
  lia: [[/where|night|alibi/i,'Tavern until midnight. Ask the barman.'],[/soot|boot|marta/i,'Funny you ask. Marta\'s boots were black with soot this morning.'],[/ledger|debt|owe/i,'Sure, I owed them. Half the harbor did. I didn\'t burn it.']]
};
export function mockAnswer(id, q) {
  for (const [re, a] of R[id] || []) if (re.test(q)) return a;
  return 'I have nothing more to say about that.';
}
