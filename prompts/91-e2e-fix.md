# Current test (written by you), excerpt from test/e2e.mjs
<<<FILE test/e2e.mjs (excerpt)>>>
test('case PT wording', async () => {
  const ptText = JSON.stringify(caseData).toLowerCase();
  const forbidden = ['violonista', 'flamboyant', 'performance'];
  for (const f of forbidden) {
    if (ptText.includes(f)) throw `found forbidden word: ${f}`;
  }
  // Check if intro contains 'violinista' (assuming it's a key test for requirement)
  if (!caseData.intro.pt.includes('violinista')) throw 'PT intro missing "violinista"';
  if (!fairPlay(caseData).ok) throw 'fairPlay failed';
});
<<<END>>>
content/case.json shape: {id,title{en,pt},intro{en,pt},culprit,suspects:[{id,name,role{en,pt},persona{en,pt},facts}],clues:[{...,text{en,pt}}],glossary:[{en,pt}],solution{en,pt}}

# Test output
FAIL credits default path independent of cwd: cwd changed path resolution
FAIL case PT wording: found forbidden word: flamboyant
40 passed, 2 failed

# Task
The 'case PT wording' test is wrong: it searches the whole JSON, so it finds the English word "flamboyant" in persona.en, which is allowed. The requirement is: no "pt" string value (collect every value under a key named "pt", recursively) contains "violonista", "flamboyant" or "performance". Fix only this test.
Output ONLY one literal edit block. Old text = the whole current test above, copied exactly:
<<<REPLACE test/e2e.mjs>>>
old text
=====
new text
<<<END>>>
No prose. Start directly with <<<REPLACE.

# Error from your previous attempt
You put your NEW test in both halves (old and new), so the old text was not found (0 occurrences, nothing applied). Above "=====" copy the CURRENT test exactly as shown in the excerpt (it starts with "test('case PT wording', async () => {" and its second line is "  const ptText = JSON.stringify(caseData).toLowerCase();"). Below "=====" put the fixed test.
