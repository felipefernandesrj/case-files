#!/usr/bin/env python3
"""Synthesize unpaid local fixtures for the bg-removal pipeline.

No FullCup / flux calls. Creates:
- a 90s arcade-noir pixel wax-seal sprite on #00FF00 (hard edges)
- a soft-edged gothic lamp with a green fringe (spill test)
- a raster of public/icons/lamp.svg painted onto #00FF00
"""

from __future__ import annotations

import argparse
import io
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

CHROMA = (0, 255, 0)
INK = (12, 11, 10)
SEAL = (140, 47, 43)
SEAL_B = (181, 71, 65)
LAMP = (232, 184, 109)
LAMP_DIM = (184, 137, 74)
PAPER = (243, 234, 223)
NIGHT = (18, 24, 28)
FOLDER = (196, 168, 130)


def _px(draw, x, y, color, s=1):
    draw.rectangle([x, y, x + s - 1, y + s - 1], fill=color)


def pixel_seal_native(grid: int = 64) -> Image.Image:
    """Chunky Cadillacs-and-Dinosaurs-era wax seal with a lamp emblem. No text."""
    im = Image.new("RGB", (grid, grid), CHROMA)
    d = ImageDraw.Draw(im)
    cx, cy, r = 31, 32, 22
    # Dithered shadow disc
    for y in range(grid):
        for x in range(grid):
            dx, dy = x - cx, y - cy
            dist = (dx * dx + dy * dy) ** 0.5
            if dist <= r:
                # Light from upper-left (lamp)
                shade = dx * 0.4 + dy * 0.5
                dither = (x + y * 2) % 3 == 0
                if dist > r - 1.2:
                    im.putpixel((x, y), INK)  # bold outline
                elif shade < -4:
                    im.putpixel((x, y), SEAL if not dither else INK)
                elif shade < 6:
                    im.putpixel((x, y), SEAL)
                else:
                    im.putpixel((x, y), SEAL_B)
    # Inner ring
    d.ellipse([cx - 14, cy - 14, cx + 14, cy + 14], outline=INK, width=2)
    # Chunky hanging lamp inside the seal
    d.rectangle([29, 22, 33, 24], fill=INK)
    d.ellipse([25, 24, 38, 36], fill=LAMP, outline=INK)
    d.rectangle([28, 35, 35, 37], fill=LAMP_DIM)
    d.rectangle([27, 37, 36, 39], fill=INK)
    # Highlight pixel
    im.putpixel((27, 26), PAPER)
    return im


def pixel_seal_512() -> Image.Image:
    native = pixel_seal_native(64)
    return native.resize((512, 512), Image.Resampling.NEAREST)


def soft_lamp_512() -> Image.Image:
    """Anti-aliased lamp on chroma green with a soft fringe, to test despill."""
    im = Image.new("RGBA", (512, 512), CHROMA + (255,))
    d = ImageDraw.Draw(im, "RGBA")
    # Soft green-tinted halo first (the bad fringe flux may leave)
    d.ellipse([150, 110, 362, 430], fill=(40, 230, 40, 255))
    d.ellipse([168, 128, 344, 412], fill=CHROMA + (255,))
    # Lamp body
    d.polygon([(256, 90), (310, 230), (202, 230)], fill=(232, 184, 109, 255))
    d.ellipse([196, 200, 316, 330], fill=(184, 137, 74, 255))
    d.rectangle([236, 330, 276, 400], fill=(26, 23, 20, 255))
    d.rectangle([220, 400, 292, 424], fill=(12, 11, 10, 255))
    # Feather the existing edge into the green so chromakey has work to do
    arr = np.array(im, dtype=np.float32)
    yy, xx = np.mgrid[0:512, 0:512]
    # already drawn; add a 6px gaussian-ish mix toward chroma at yellow/brown edges
    rgb = arr[..., :3]
    key = np.array(CHROMA, dtype=np.float32)
    is_subj = np.linalg.norm(rgb - key, axis=2) > 40
    # Dilate-ish mix: blur subject mask
    from PIL import ImageFilter

    mask = Image.fromarray((is_subj * 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(radius=3.5))
    m = np.array(mask, dtype=np.float32) / 255.0
    # Where mask is partial, blend toward chroma (creates spill)
    blend = (m > 0.05) & (m < 0.95)
    for c in range(3):
        rgb[..., c] = np.where(blend, rgb[..., c] * m + key[c] * (1 - m), rgb[..., c])
    arr[..., :3] = rgb
    arr[..., 3] = 255
    return Image.fromarray(arr.astype(np.uint8), "RGBA")


def rasterize_svg_on_green(svg_path: Path, size: int = 512, padding: int = 64) -> Image.Image:
    import cairosvg

    inner = size - padding * 2
    png_bytes = cairosvg.svg2png(
        url=str(svg_path),
        output_width=inner,
        output_height=inner,
    )
    icon = Image.open(io.BytesIO(png_bytes)).convert("RGBA")
    # Paint strokes in lamp gold; SVG uses currentColor (often black).
    arr = np.array(icon)
    vis = arr[..., 3] > 16
    arr[vis, 0] = LAMP[0]
    arr[vis, 1] = LAMP[1]
    arr[vis, 2] = LAMP[2]
    icon = Image.fromarray(arr, "RGBA")
    canvas = Image.new("RGBA", (size, size), CHROMA + (255,))
    canvas.paste(icon, (padding, padding), icon)
    return canvas


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--out", type=Path, required=True)
    p.add_argument("--repo", type=Path, default=Path("/workspace/case-files"))
    args = p.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    pixel_seal_512().save(args.out / "pixel-seal.png")
    soft_lamp_512().save(args.out / "soft-lamp.png")
    svg = args.repo / "public/icons/lamp.svg"
    if svg.exists():
        rasterize_svg_on_green(svg).save(args.out / "lamp-svg.png")
    print(f"fixtures in {args.out}")


if __name__ == "__main__":
    main()
