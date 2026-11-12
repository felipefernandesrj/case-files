#!/usr/bin/env python3
"""Tests for bgremove.py (key-first background removal). No paid calls, no network by default.
Set CF_TEST_MODEL=1 to also exercise the ToonOut fallback (downloads ~885 MB once)."""
from __future__ import annotations

import io
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bgremove  # noqa: E402
import build_batch  # noqa: E402
import process_assets as pa  # noqa: E402

FLUX_GREEN = (3, 77, 28)  # what flux actually paints when asked for #00FF00


def plate(bg=FLUX_GREEN, size=512, jpeg=True) -> tuple[Image.Image, np.ndarray]:
    """A key ring on a flux-like green: 1-px-at-grid outline, an enclosed hole, a thin wire."""
    n, s = 64, size // 64
    spr = Image.new("RGBA", (n, n), (0, 0, 0, 0))
    d = ImageDraw.Draw(spr)
    d.ellipse((14, 10, 50, 46), outline=(12, 11, 10, 255), width=3)            # ring -> hole inside
    d.ellipse((17, 13, 47, 43), outline=(110, 122, 128, 255), width=1)
    d.rectangle((28, 44, 34, 58), fill=(232, 184, 109, 255), outline=(12, 11, 10, 255))
    d.line([(6, 60), (58, 56)], fill=(12, 11, 10, 255), width=1)                 # thin wire
    big = spr.resize((size, size), Image.NEAREST)
    gt = np.array(big)[..., 3] > 127
    base = Image.new("RGB", (size, size), bg)
    base.paste(big, (0, 0), big)
    rgb = base.filter(ImageFilter.GaussianBlur(1.0))
    if jpeg:
        buf = io.BytesIO(); rgb.save(buf, "JPEG", quality=82); buf.seek(0); rgb = Image.open(buf).convert("RGB")
    return rgb, gt


def check(name, cond):
    if not cond:
        raise AssertionError(name)
    print("PASS", name)


def main() -> int:
    im, gt = plate()
    st = bgremove.bg_stats(im)
    check("flux dark green border is a clean key background", st["clean"] and st["greenish"])
    a = bgremove.flood_key(im)
    check("alpha is hard (only 0 and 255)", set(np.unique(a)) <= {0, 255})
    check("corners are transparent", all(a[y, x] == 0 for y, x in ((0, 0), (0, -1), (-1, 0), (-1, -1))))
    hole = (slice(220, 260), slice(220, 260))  # centre of the ring: enclosed background
    check("enclosed hole inside the ring is cleared", (a[hole] == 0).mean() > 0.98)
    iou = ((a > 0) & gt).sum() / ((a > 0) | gt).sum()
    check(f"flood-key IoU vs ground truth >= 0.85 (got {iou:.3f})", iou >= 0.85)
    wire = gt.copy(); wire[:440] = False
    check("thin 1-grid-px wire survives", (a[wire] > 0).mean() > 0.6)

    cut, info = bgremove.remove_background(im, accept=pa.acceptable, allow_model=False)
    check("clean plate uses the key, not the model", info["method"] == "flood-key")
    fin = build_batch.pixel_finish(pa.trim_and_pad(cut), 64, "noir")
    check("no residual green after the pixel finish", pa.residual_green_ratio(fin) == 0.0)
    pal = {tuple(v) for v in pa.NOIR_PALETTE.values()}
    arr = np.array(fin)
    check("opaque pixels are noir palette only", all(tuple(p[:3]) in pal for p in arr[arr[..., 3] == 255]))
    check("finished alpha is hard", set(np.unique(arr[..., 3])) <= {0, 255})

    grey, _ = plate(bg=(128, 128, 128))
    check("grey or white backgrounds are not keyed (model path)", not bgremove.bg_stats(grey)["clean"])
    try:
        bgremove.rembg_matte(im, "bria-rmbg")
        check("bria-rmbg refused", False)
    except ValueError:
        check("bria-rmbg (CC BY-NC) is refused", True)
    check("default fallback is the MIT ToonOut model", bgremove.DEFAULT_FALLBACK == "toonout")

    if os.environ.get("CF_TEST_MODEL") == "1":
        # a filled badge on mid-grey (no chroma): the key must refuse it, the model must cut it
        n = 64
        spr = Image.new("RGBA", (n, n), (0, 0, 0, 0))
        d = ImageDraw.Draw(spr)
        d.ellipse((12, 8, 52, 48), fill=(176, 58, 46, 255), outline=(12, 11, 10, 255), width=2)
        d.rectangle((26, 44, 38, 58), fill=(232, 184, 109, 255), outline=(12, 11, 10, 255))
        big = spr.resize((512, 512), Image.NEAREST)
        bgim = Image.new("RGBA", big.size, (128, 128, 128, 255))
        bgim.alpha_composite(big)
        cut, info = bgremove.remove_background(bgim.convert("RGB"), accept=pa.acceptable)
        gt = np.array(big)[..., 3] > 0
        al = np.array(cut)[..., 3] > 0
        iou = (al & gt).sum() / (al | gt).sum()
        check(f"ToonOut fallback on a grey badge IoU >= 0.9 (got {iou:.3f}, {info['method']})",
              iou >= 0.9 and info["method"].startswith("model:"))
    print("test_bgremove: PASS")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
