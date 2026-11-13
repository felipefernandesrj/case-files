Seal check, run 30. Signed out curl https://qa.fullcup.ai/receipts/<id> on 2026-11-13 00:23Z (21:23 BRT 2026-11-12), script qa/m2gf2-probes/seal/sealcheck.sh (results in all.txt, format: group id HTTP | verdict | seal | exact cost | root | model).
Scope: 6 M2s4 receipts (run 28), 10 game-feel-1 receipts (run 29, calls 199-208), all 116 ids of /workspace/casefiles-qa/run26/receipts.md (the 99 that were "Recorded, waiting for the daily seal" in run 29 plus 17 already sealed).
Result: 132/132 HTTP 200, Genuine receipt, Sealed. 115 in the signed root of 2026-11-12 (sealed 2026-11-13 00:05:22 UTC), 17 in the root of 2026-11-11 (sealed 2026-11-12 00:05:23 UTC, unchanged). Not sealed / not genuine: 0. No bug.
One snip per id: seal-<id>.snip.txt.
