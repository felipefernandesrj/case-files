Seal check of receipts 252-265 (gf8 calls 252-255, gf9 calls 256-265), signed out curl of https://qa.fullcup.ai/receipts/<id>, script sealcheck.sh, ids in ids.txt.
- 2026-11-16 20:57 BRT (23:57Z, before the 00:05Z cut): all 14 HTTP 200 "Recorded, waiting for the daily seal" (pre-cut.txt, expected, not due yet).
- 2026-11-16 21:08 BRT (00:08Z): all 14 HTTP 200 Genuine receipt, Sealed at 2026-11-17 00:05:25 UTC, one of 14 in the signed root of 2026-11-16 (all.txt). Models: gemma-4-26b-a4b-it x11, gpt-oss-120b x3 (258-260).
- Per receipt exact cost vs build-log neurons x $0.011/1000: costs.txt, all 14 equal to the microdollar. Sums gf8 $0.003740 (log $0.003740), gf9 $0.009540 (log $0.009541, rounding). 0 not sealed, no bug.
