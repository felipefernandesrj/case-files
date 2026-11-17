#!/usr/bin/env python3
"""Run 38 (gf10) QA harness: key the two arrest plates with the integrated pipeline
(scripts/assets/bgremove.py flood-key + ToonOut fallback, process_assets trim, build_batch pixel finish
at the same 128 grid as the character cells) and add them to public/assets/manifest.json. CPU only."""
import json, sys
from pathlib import Path
from PIL import Image
REPO = Path("/workspace/case-files"); sys.path.insert(0, str(REPO / "scripts/assets"))
import bgremove, process_assets as pa, build_batch as bb  # noqa
ART = Path(__file__).resolve().parent
PICK = {"violin-carlos": "arrest__violin-carlos.s3811613", "night-train-ines": "arrest__night-train-ines.s3811603"}
man = json.loads((REPO / "public/assets/manifest.json").read_text())
man["items"] = [i for i in man["items"] if not i["id"].endswith("-arrest")]
for cid, stem in PICK.items():
    meta = json.loads((ART / "meta" / f"{stem}.json").read_text())
    raw = Image.open(meta["raw_path"]).convert("RGB")
    cut, info = bgremove.remove_background(raw, model=bgremove.DEFAULT_FALLBACK, accept=pa.acceptable)
    cut = pa.trim_and_pad(cut, margin_ratio=0.04)
    fin = bb.pixel_finish(cut, 128, "adaptive")
    files = bb.export(fin, REPO / f"public/assets/characters/{cid}-arrest.png", (1, 2))
    man["items"].append({"id": f"characters/{cid}-arrest", "kind": "sprite", "receipt_id": meta["receipt_id"], "attempt": "orig",
                         "files": {"arrest": f"assets/characters/{cid}-arrest.png"}, "method": info["method"],
                         "residual_green": round(pa.residual_green_ratio(fin), 4), "size": list(fin.size)})
    print(cid, info["method"], info.get("notes"), fin.size, files, "green", round(pa.residual_green_ratio(fin), 4))
(REPO / "public/assets/manifest.json").write_text(json.dumps(man, indent=2) + "\n")
