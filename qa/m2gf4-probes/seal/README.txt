Seal check, run 32. Signed out curl https://qa.fullcup.ai/receipts/<id> on 2026-11-14 00:20Z (21:20 BRT 2026-11-13), script qa/m2gf4-probes/seal/sealcheck.sh (same as qa/m2gf2-probes/seal, output path changed; results in all.txt, format: group id HTTP | verdict | seal | exact cost | root | model).
Scope: 9 game-feel-2 receipts (run 30, calls 209-217) and 10 game-feel-3 receipts (run 31, calls 218-227), seal-by 2026-11-14 00:05Z.
Result: 19/19 HTTP 200, Genuine receipt, Sealed at 2026-11-14 00:05:37 UTC, one of 19 in the signed root of 2026-11-13. Exact cost sums: gf2 $0.002640, gf3 $0.003449, matching qa/build-log.json neurons (240.03 and 313.57 x $0.011/1000). Not sealed / not genuine: 0. No bug.
One snip per id: seal-<id>.snip.txt.
