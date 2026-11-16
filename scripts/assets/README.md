# Case Files asset post-process (local infra)

This folder is **pipeline infrastructure**, not game content. Nothing here calls the FullCup API, flux, or any paid model; it runs on CPU on the box. Plates are generated through the Cup key, and these scripts key the background, trim, snap to the pixel grid, quantise the palette, and export the files the game loads.

- Background removal: `bgremove.py`.
  - It runs the flood-key first when the plate border is a clean, uniform green. It samples the border, flood-fills from the edges, clears enclosed pockets, peels the halo and writes hard alpha.
  - Otherwise it falls back to **ToonOut** (MIT BiRefNet fine-tune, pinned revision and SHA-256), combined with the key mask when the border is clean.
  - Allowed alternatives: `--model birefnet-general | birefnet-general-lite | u2net` through rembg.
  - `bria-rmbg` (CC BY-NC) and other non-commercial models are refused.
- Batch build: `build_batch.py --raw <raw dir> --meta <meta dir> --pick pick.json --out <dir>` writes:
  - icons at 32, 64 and 128 px (PNG and WebP) plus the `icons-64` atlas;
  - character and evidence cells from the 2×2 sheets;
  - stills, location plates and cutscene panels at 1× and 2×;
  - `manifest.json` (v2, with the FullCup receipt id per asset).
- Icon CSS: `gen_icon_css.py` writes `public/css/pixel-icons.css` from the manifest. The SVG sprite stays as the fallback for forced-colours mode.
- Single-file CLI: `process_assets.py`. Fixtures: `make_fixtures.py`.
- Talking portraits: `talk_frames.py` writes `<case>-<id>-talk.png` (two frames, neutral and mouth open) from each neutral portrait for the Conversation log. Mouth centres are measured by hand in the script; rerun it after a portrait changes.
- Tests: `test_bgremove.py` and `test_process_assets.py`. Set `CF_TEST_MODEL=1` to also run ToonOut, which downloads about 885 MB once.
- Licences: `THIRD_PARTY_NOTICES.md`. Benchmark and forum research: `/workspace/casefiles-qa/run26/bgremoval/benchmark.md`.

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # see the torch CPU index note inside
.venv/bin/python test_bgremove.py && .venv/bin/python test_process_assets.py
.venv/bin/python build_batch.py --raw RAW --meta META --pick pick.json --out /tmp/cfbuild
cp -r /tmp/cfbuild/. ../../public/assets/ && .venv/bin/python gen_icon_css.py
```
