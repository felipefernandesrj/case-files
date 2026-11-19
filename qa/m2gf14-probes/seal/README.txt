Seal check of receipts 272-284 (gf12 code calls 272-279, gf13 code calls 280-284), signed out curl of https://qa.fullcup.ai/receipts/<id>, script sealcheck.sh (copy of the gf12 one), ids in ids.txt, post-cut loop postcut-loop.sh (wait to 21:06 BRT, retry every 5 min up to 21:40).
- 2026-11-18 20:51 BRT (23:51Z, before the 00:05Z cut): all 13 HTTP 200 "Recorded, waiting for the daily seal" (pre-cut.txt, expected, not due yet).
- 2026-11-18 21:06 BRT (00:06Z), first attempt: all 13 HTTP 200 Genuine receipt, Sealed at 2026-11-19 00:05:27 UTC (21:05:27 BRT), one of 13 in the signed root of 2026-11-18 (all.txt, attempts.txt). Models: gemma-4-26b-a4b-it x12, gpt-oss-120b x1 (273).
- Per receipt exact cost vs build-log neurons x $0.011/1000: costs.txt, all 13 equal to the microdollar. 0 not sealed, no bug.
- Sums: gf12 $0.013873, gf13 $0.003734 per receipt (notes said $0.003736 from total neurons, rounding), total $0.017607.
