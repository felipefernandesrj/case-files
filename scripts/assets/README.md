# Case Files asset post-process (local infra)

This folder is **pipeline infrastructure**, not game content. It does not call the FullCup API, flux, or any paid model. Generated plates (once INV-04 v2 is live on QA) are produced through the Cup key; this CLI only chromakeys, optionally runs rembg, trims, and pixel-snaps the results on the box.

- CLI: `process_assets.py`
- Fixtures: `make_fixtures.py`
- Test: `test_process_assets.py`
- Plan, prompts, cost table: `/workspace/casefiles-qa/run26/icon-pipeline.md`

Default rembg model is `u2net` (Apache-2.0). Do not use rembg's default `bria-rmbg` (CC BY-NC 4.0).

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
.venv/bin/python make_fixtures.py --out /tmp/cf-in
.venv/bin/python process_assets.py --input /tmp/cf-in --output /tmp/cf-out --mode auto --rembg-model u2net
.venv/bin/python test_process_assets.py
```
