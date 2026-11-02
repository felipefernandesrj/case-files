# Product: Case Files, a bilingual (EN / PT-BR) browser detective game. Players interrogate 3 AI-played suspects and accuse one. The case data below was written by you.

<<<FILE content/case.json>>>
{
  "id": "case-violin-001",
  "title": {
    "en": "The Vanishing Violin",
    "pt": "O Violino Desaparecido"
  },
  "intro": {
    "en": "During a rehearsal at the Aurora Music Academy, the priceless Stradivarius violin disappears from the instrument room. Three people were present that night: the charismatic conductor, a nervous violin prodigy, and the longtime janitor. Who took the priceless instrument?",
    "pt": "Durante um ensaio na Academia de Música Aurora, o valioso violino Stradivarius desaparece da sala de instrumentos. Três pessoas estavam presentes naquela noite: o carismático maestro, a prodígio violinista nervosa e o zelador de longa data. Quem levou o precioso instrumento?"
  },
  "culprit": "carlos",
  "suspects": [
    {
      "id": "lorenzo",
      "name": "Lorenzo Moretti",
      "role": {
        "en": "Conductor",
        "pt": "Maestro"
      },
      "persona": {
        "en": "A passionate, slightly flamboyant conductor who prides himself on precision and reputation. He often stays late to perfect the orchestra’s sound.",
        "pt": "Um maestro apaixonado, um pouco flamboyant, que se orgulha da precisão e da reputação. Ele costuma ficar até tarde para aperfeiçoar o som da orquestra."
      },
      "facts": "You are Lorenzo Moretti. You were in the instrument room at 9:30 pm to retrieve the Stradivarius for the final piece. You noticed the lock on the case was slightly ajar, but you assumed it was an oversight. Later, you saw a janitor (Carlos) pushing a cart near the room, but you dismissed it as routine. You want to protect the academy’s image, so you will downplay any negligence and subtly shift suspicion toward the student if pressed. You never admit seeing the lock tampered."
    },
    {
      "id": "maya",
      "name": "Maya Santos",
      "role": {
        "en": "Violinist",
        "pt": "Violinista"
      },
      "persona": {
        "en": "A talented but anxious student who dreams of soloing at the upcoming recital. She is meticulous about her instrument and worries about her performance.",
        "pt": "Uma estudante talentosa, porém ansiosa, que sonha em fazer solo no recital que se aproxima. Ela é meticulosa com seu violino e se preocupa com sua performance."
      },
      "facts": "You are Maya Santos. You rehearsed in the main hall all evening and planned to borrow the Stradivarius for the finale. You entered the instrument room at 9:45 pm and saw the case slightly open, with a faint scratch on the lock—evidence of tampering. You also noticed the janitor’s cart had a wooden compartment that seemed out of place. You are afraid to accuse anyone without proof, but you will mention the odd cart and the disturbed lock. You also hide the fact that you previously borrowed the violin for private practice, fearing it might look suspicious."
    },
    {
      "id": "carlos",
      "name": "Carlos Mendes",
      "role": {
        "en": "Janitor",
        "pt": "Zelador"
      },
      "persona": {
        "en": "A friendly, long‑time staff member who knows every corner of the academy. He is proud of his work but financially strained.",
        "pt": "Um funcionário amigável e de longa data que conhece cada canto da academia. Ele tem orgulho do seu trabalho, mas está com dificuldades financeiras."
      },
      "facts": "You are Carlos Mendes. You have been cleaning the academy for years and have access to all rooms. You stole the Stradivarius because you need money to pay for your daughter's surgery. You hid the violin in the back of your cart, planning to sell it later. You will claim you were only sweeping the hallway at the time and that you saw Lorenzo lingering near the case, implying he might have left it unattended. You will never directly admit the theft; you will deflect, lie about your whereabouts, and try to shift blame onto Lorenzo."
    }
  ],
  "clues": [
    {
      "id": "c1",
      "from": "lorenzo",
      "ask": "Did you notice the condition of the violin case lock?",
      "keywords": ["lock", "fechadura"],
      "implicates": "carlos",
      "clears": null,
      "text": {
        "en": "I saw the case lock slightly ajar, but I thought it was just an oversight.",
        "pt": "Vi a fechadura da caixa um pouco aberta, mas achei que fosse só um descuido."
      }
    },
    {
      "id": "c2",
      "from": "maya",
      "ask": "What did you see about the lock and the cart?",
      "keywords": ["scratch", "arranhão", "cart", "carrinho"],
      "implicates": "carlos",
      "clears": null,
      "text": {
        "en": "The lock had a faint scratch, and I noticed the janitor's cart had a hidden wooden compartment.",
        "pt": "A fechadura tinha um arranhão leve, e notei que o carrinho do zelador tinha um compartimento de madeira escondido."
      }
    },
    {
      "id": "c3",
      "from": "maya",
      "ask": "Did you see Lorenzo near the case after you entered?",
      "keywords": ["lorenzo", "maestro", "lorenzo near", "lorenzo perto"],
      "implicates": null,
      "clears": "lorenzo",
      "text": {
        "en": "I saw Lorenzo arrive earlier, but after I entered the room he was already away, not near the case.",
        "pt": "Vi o Lorenzo chegar mais cedo, mas depois que entrei na sala ele já tinha saído, não estava perto da caixa."
      }
    },
    {
      "id": "c4",
      "from": "lorenzo",
      "ask": "Did you notice anything about Maya's behavior?",
      "keywords": ["maya", "violinist", "violinista", "nervous", "nervosa"],
      "implicates": null,
      "clears": "maya",
      "text": {
        "en": "Maya seemed focused on her practice and had no reason to steal the instrument.",
        "pt": "Maya parecia concentrada em sua prática e não tinha motivo para roubar o instrumento."
      }
    },
    {
      "id": "c5",
      "from": "lorenzo",
      "ask": "Where were you after retrieving the violin?",
      "keywords": ["after", "depois", "room", "sala"],
      "implicates": null,
      "clears": "lorenzo",
      "text": {
        "en": "After I got the violin, I went straight to the rehearsal hall and stayed there.",
        "pt": "Depois que peguei o violino, fui direto para a sala de ensaio e fiquei lá."
      }
    },
    {
      "id": "c6",
      "from": "carlos",
      "ask": "Why were you in the hallway that night?",
      "keywords": ["hallway", "corredor", "surgery", "filho", "dinheiro"],
      "implicates": "carlos",
      "clears": null,
      "text": {
        "en": "I was sweeping the hallway, but I needed money for my daughter's surgery.",
        "pt": "Eu estava varrendo o corredor, mas precisava de dinheiro para a cirurgia da minha filha."
      }
    }
  ],
  "glossary": [
    { "en": "violin", "pt": "violino" },
    { "en": "case", "pt": "caixa" },
    { "en": "lock", "pt": "fechadura" },
    { "en": "cart", "pt": "carrinho" },
    { "en": "janitor", "pt": "zelador" },
    { "en": "conductor", "pt": "maestro" },
    { "en": "student", "pt": "estudante" },
    { "en": "surgery", "pt": "cirurgia" },
    { "en": "money", "pt": "dinheiro" },
    { "en": "rehearsal", "pt": "ensaio" }
  ],
  "solution": {
    "en": "The culprit is Carlos Mendes, the janitor. He stole the Stradivarius to fund his daughter's surgery, hiding it in his cart. Lorenzo saw the open lock but thought it was an oversight, while Maya noticed the tampered lock and the odd cart, providing the clues that point to Carlos.",
    "pt": "O culpado é Carlos Mendes, o zelador. Ele roubou o Stradivarius para pagar a cirurgia da filha, escondendo‑o no fundo do seu carrinho. Lorenzo viu a fechadura aberta, mas assumiu que foi um descuido, enquanto Maya notou a fechadura violada e o carrinho estranho, fornecendo as pistas que apontam para Carlos."
  }
}
<<<END>>>

# Task: PT-BR wording pass on content/case.json (native Brazilian Portuguese editor)
- Change ONLY Portuguese text (values of "pt" keys, and Portuguese words inside "keywords" arrays). Never change English text, ids, names, culprit, facts, implicates/clears, or the meaning of any clue. Facts and clues must stay identical in meaning.
- Known issue: the intro says "a prodígio violinista nervosa", which is unnatural. Note: violin = violino, violinist = violinista; "violonista" means guitarist and must never appear. Rewrite it naturally (e.g. "uma jovem violinista prodígio, nervosa").
- Remove English words left in PT text (e.g. "flamboyant"), and prefer natural PT-BR over anglicisms (e.g. "performance" -> "desempenho" or "apresentação"). Keep the glossary terms (violino, caixa, fechadura, carrinho, zelador, maestro, estudante, cirurgia, dinheiro, ensaio).
- Check gender/number agreement. Clue c6 is about the daughter (filha): its PT keyword list says "filho"; make it "filha" (keep "dinheiro", add nothing else).
- Output format: ONLY literal edits, one block per change:
<<<REPLACE content/case.json>>>
exact old text (a unique substring of the file, copied exactly)
=====
new text
<<<END>>>
No prose. Start directly with <<<REPLACE.
