#!/usr/bin/env python3
"""Post-process the Case Files flux batch into player assets (local infra, unpaid).

Input: raw plates + per-call meta (receipt ids) from the Cup-key generation run.
Output (under --out, normally public/assets): icons 32/64/128 PNG+WebP and atlas,
character and evidence sheets sliced into named cells, location / title / texture /
cutscene stills with a pixel finish, and manifest.json (receipts, never shown to players).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

import bgremove
import process_assets as pa

CELLS = {"characters": ["neutral", "speaking", "guarded", "charged"],
         "evidence/violin-items": ["violin-lock-ajar", "violin-lock-scratch", "violin-cart-compartment", "violin-stradivarius-case"],
         "evidence/night-train-items": ["night-train-apron-door", "night-train-flour-safe", "night-train-necklace", "night-train-mailbags"]}


def adaptive_quantize(im: Image.Image, colors: int = 32) -> Image.Image:
    """Lock a per-plate palette (median cut, no dither) and keep alpha hard."""
    rgba = im.convert("RGBA")
    a = np.array(rgba)[..., 3]
    q = rgba.convert("RGB").quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    out = np.dstack([np.array(q), a])
    out[a == 0, :3] = 0
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def pixel_finish(im: Image.Image, grid: int, palette: str) -> Image.Image:
    """Hard alpha, nearest downscale to the native grid, palette snap."""
    w, h = im.size
    gw, gh = (grid, grid) if w == h else (grid, max(1, round(grid * h / w)))
    hard = pa.harden_alpha(im) if im.mode == "RGBA" else im.convert("RGBA")
    # BOX keeps the colour of each cell honest; alpha is re-hardened right after.
    small = hard.resize((gw, gh), Image.Resampling.BOX)
    small = pa.harden_alpha(small, threshold=128)
    return pa.quantize_palette(small) if palette == "noir" else adaptive_quantize(small)


def export(im: Image.Image, dest: Path, scales: tuple[int, ...]) -> dict:
    dest.parent.mkdir(parents=True, exist_ok=True)
    paths = {}
    for s in scales:
        big = im.resize((im.width * s, im.height * s), Image.Resampling.NEAREST) if s > 1 else im
        stem = dest.with_name(f"{dest.stem}{'' if s == 1 else f'@{s}x'}")
        big.save(stem.with_suffix(".png"), "PNG", optimize=True)
        big.save(stem.with_suffix(".webp"), "WEBP", lossless=True, quality=100)
        paths[f"x{s}"] = stem.with_suffix(".png").name
    return paths


def slice4(im: Image.Image, trim: int = 8) -> list[Image.Image]:
    w, h = im.size
    cw, ch = w // 2, h // 2
    return [im.crop((x * cw + trim, y * ch + trim, (x + 1) * cw - trim, (y + 1) * ch - trim)) for y in (0, 1) for x in (0, 1)]


def blob_cells(cut: Image.Image, n: int = 4) -> list[Image.Image] | None:
    """Find the n subjects on a keyed sheet (flux does not always respect the 2x2 grid)."""
    from scipy import ndimage as ndi
    a = np.array(cut)[..., 3] > 0
    lab, k = ndi.label(ndi.binary_closing(a, iterations=6))
    if k < n:
        return None
    areas = ndi.sum(a, lab, index=np.arange(1, k + 1))
    order = np.argsort(areas)[::-1][:n]
    if areas[order[-1]] < 0.02 * a.size:
        return None
    boxes = ndi.find_objects(lab)
    picks = [(boxes[i], i + 1) for i in order]
    cy = np.median([(b[0].start + b[0].stop) / 2 for b, _ in picks])
    picks.sort(key=lambda p: ((p[0][0].start + p[0][0].stop) / 2 > cy, (p[0][1].start + p[0][1].stop) / 2))
    out = []
    arr = np.array(cut)
    for (sy, sx), lid in picks:
        sub = arr[sy, sx].copy()
        sub[lab[sy, sx] != lid] = 0
        out.append(Image.fromarray(sub, "RGBA"))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--raw", type=Path, required=True)
    ap.add_argument("--meta", type=Path, required=True)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--pick", type=Path, help="JSON {asset id: 'r1' | 'orig'}; default prefers the retry")
    ap.add_argument("--model", default=bgremove.DEFAULT_FALLBACK, choices=bgremove.FALLBACK_MODELS)
    ap.add_argument("--only", default="")
    a = ap.parse_args()
    pick = json.loads(a.pick.read_text()) if a.pick else {}
    metas = {}
    for f in sorted(a.meta.glob("*.json")):
        d = json.loads(f.read_text())
        metas.setdefault(d["id"], {})["orig" if d.get("attempt", 1) == 1 else "r1"] = d
    only = set(filter(None, a.only.split(",")))
    manifest = {"version": 2, "placeholder": False, "generator": "flux-1-schnell via the Case Files Cup key (QA)",
                "bg_removal": {"primary": "flood-key (bgremove.py)", "fallback_model": a.model,
                               "notices": "scripts/assets/THIRD_PARTY_NOTICES.md"},
                "note": "Receipt ids are for the public cost log; never shown to players.", "items": []}
    icons = []
    for aid, att in sorted(metas.items()):
        if only and aid not in only:
            continue
        choice = pick.get(aid, "r1" if "r1" in att else "orig")
        m = att[choice]
        raw = Image.open(m["raw_path"]).convert("RGB")
        item = {"id": aid, "kind": m["kind"], "receipt_id": m["receipt_id"], "attempt": choice,
                "attempts": {k: v["receipt_id"] for k, v in att.items()}, "files": {}}
        if m["kind"] == "icon":
            cut, info = bgremove.remove_background(raw, model=a.model, accept=pa.acceptable)
            cut = pa.trim_and_pad(cut)
            fin = pixel_finish(cut, 64, "noir")
            ok, why = pa.acceptable(fin)
            for s in (32, 64, 128):
                img = fin if s == 64 else fin.resize((s, s), Image.Resampling.NEAREST)
                p = a.out / "icons" / f"{aid}-{s}.png"
                p.parent.mkdir(parents=True, exist_ok=True)
                img.save(p, "PNG", optimize=True); img.save(p.with_suffix(".webp"), "WEBP", lossless=True, quality=100)
                item["files"][f"png_{s}"] = f"assets/icons/{aid}-{s}.png"
            item.update(method=info["method"], notes=info["notes"], ok=ok, quality=why,
                        residual_green=round(pa.residual_green_ratio(fin), 4))
            icons.append((aid, fin))
        elif m["kind"] in ("sheet", "sheet-items"):
            names = CELLS["characters"] if aid.startswith("characters/") else CELLS[aid]
            cells_out, methods = [], []
            whole, winfo = bgremove.remove_background(raw, model=a.model, accept=pa.acceptable)
            blobs = blob_cells(whole)
            if blobs is not None:
                pairs = [(c, winfo) for c in blobs]
                item["slice"] = "subject blobs"
            else:
                pairs = [bgremove.remove_background(c, model=a.model, accept=pa.acceptable) for c in slice4(raw)]
                item["slice"] = "2x2 grid"
            for name, (cut, info) in zip(names, pairs):
                cut = pa.trim_and_pad(cut, margin_ratio=0.04)
                fin = pixel_finish(cut, 128, "adaptive")
                stem = f"{aid}-{name}" if aid.startswith("characters/") else f"evidence/{name}"
                export(fin, a.out / f"{stem}.png", (1, 2))
                item["files"][name] = f"assets/{stem}.png"
                cells_out.append(fin); methods.append(info["method"])
            sheet = Image.new("RGBA", (256, 256), (0, 0, 0, 0))
            for i, c in enumerate(cells_out):
                sheet.paste(c.resize((128, 128), Image.Resampling.NEAREST), ((i % 2) * 128, (i // 2) * 128))
            export(sheet, a.out / f"{aid}.png", (1,))
            item["files"]["sheet"] = f"assets/{aid}.png"
            item["method"] = sorted(set(methods))
        else:  # stills: no key, pixel finish at 256 native, 32 colours
            if aid.startswith("cutscene/"):
                for i, panel in enumerate(slice4(raw, trim=4), 1):
                    fin = pixel_finish(panel, 160, "adaptive")
                    export(fin, a.out / f"{aid}-{i}.png", (1, 2))
                    item["files"][f"panel_{i}"] = f"assets/{aid}-{i}.png"
            fin = pixel_finish(raw, 256, "adaptive")
            export(fin, a.out / f"{aid}.png", (1, 2))
            item["files"]["native"] = f"assets/{aid}.png"
            item["method"] = "pixel-finish (no key)"
        manifest["items"].append(item)
        print(aid, choice, item.get("method"), item.get("quality", ""), flush=True)
    if icons:
        meta = pa.pack_atlas(icons, a.out / "icons" / "icons-64.png", cell=64)
        manifest["atlas"] = {"image": "assets/icons/icons-64.png", "map": "assets/icons/icons-64.json",
                             "cell": meta["cell"], "count": len(meta["frames"])}
    if not only:
        (a.out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    return 0 if all(i.get("ok", True) for i in manifest["items"]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
