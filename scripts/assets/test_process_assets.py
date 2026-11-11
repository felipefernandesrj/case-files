#!/usr/bin/env python3
"""Local tests for the unpaid bg-removal pipeline. No paid API calls."""

from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parents[1]
MAKE = ROOT / "make_fixtures.py"
CLI = ROOT / "process_assets.py"


def run(cmd, cwd=None):
    proc = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if proc.returncode != 0:
        raise AssertionError(f"$ {' '.join(map(str, cmd))}\n{proc.stdout}\n{proc.stderr}")
    return proc


def palette_ok(im: Image.Image) -> bool:
    from process_assets import NOIR_PALETTE

    allowed = {v for v in NOIR_PALETTE.values()}
    pix = list(im.convert("RGBA").get_flattened_data())
    for r, g, b, a in pix:
        if a == 0:
            continue
        if (r, g, b) not in allowed:
            return False
    return True


def corners_transparent(im: Image.Image) -> bool:
    arr = im.convert("RGBA")
    w, h = arr.size
    for x, y in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        if arr.getpixel((x, y))[3] > 16:
            return False
    return True


def main() -> int:
    sys.path.insert(0, str(ROOT))
    with tempfile.TemporaryDirectory(prefix="cf-bg-") as tmp:
        tmp = Path(tmp)
        fixtures = tmp / "in"
        out = tmp / "out"
        run([sys.executable, str(MAKE), "--out", str(fixtures), "--repo", str(REPO)])
        for name in ("pixel-seal.png", "soft-lamp.png", "lamp-svg.png"):
            assert (fixtures / name).exists(), name
        # Chromakey-only first (fast, no model), then auto with rembg fallback.
        run(
            [
                sys.executable,
                str(CLI),
                "--input",
                str(fixtures),
                "--output",
                str(out / "chroma"),
                "--mode",
                "chromakey",
                "--no-rembg",
                "--grid",
                "64",
            ]
        )
        run(
            [
                sys.executable,
                str(CLI),
                "--input",
                str(fixtures),
                "--output",
                str(out / "auto"),
                "--mode",
                "auto",
                "--rembg-model",
                "u2net",
                "--grid",
                "64",
            ]
        )
        manifest = json.loads((out / "auto" / "manifest.json").read_text())
        assert manifest["rembg_model"] == "u2net"
        assert (out / "auto" / "atlas" / "icons-64.png").exists()
        assert (out / "auto" / "contact-sheet.png").exists()
        for rec in manifest["assets"]:
            stem = rec["id"]
            im64 = Image.open(rec["paths"]["png_64"])
            im128 = Image.open(rec["paths"]["png_128"])
            im32 = Image.open(rec["paths"]["png_32"])
            assert im64.size == (64, 64), stem
            assert im128.size == (128, 128), stem
            assert im32.size == (32, 32), stem
            assert im64.mode == "RGBA"
            assert corners_transparent(im64), f"corners not clear: {stem}"
            assert rec["residual_green"] <= 0.03, rec
            # Pixel-art finish should snap to the noir palette.
            assert palette_ok(im64), f"non-palette colour in {stem}"
            # 128 must be an integer upscale of 64 (every 2x2 block uniform).
            a64 = a128 = None  # integer-upscale checked via getpixel below
            # spot-check a few opaque pixels
            for y in range(0, 64, 8):
                for x in range(0, 64, 8):
                    c = im64.getpixel((x, y))
                    assert im128.getpixel((x * 2, y * 2)) == c
                    assert im128.getpixel((x * 2 + 1, y * 2 + 1)) == c
        # The pixel seal must survive chromakey (subject present).
        seal = next(r for r in manifest["assets"] if r["id"] == "pixel-seal")
        assert seal["ok"], seal
        assert seal["opaque_ratio"] > 0.15
        print("test_process_assets: PASS")
        print(json.dumps({r["id"]: {"method": r["method"], "ok": r["ok"], "green": r["residual_green"], "opaque": r["opaque_ratio"]} for r in manifest["assets"]}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
