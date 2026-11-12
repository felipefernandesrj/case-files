#!/usr/bin/env python3
"""Local post-process for Case Files generated art.

Pipeline infrastructure only: takes already-generated PNGs (chroma-key green
or transparent), removes the background, trims, optionally quantizes to the
gothic-noir pixel palette, and writes 128/64/32 PNG + WebP plus a sprite atlas
and a manifest.

This script does not call FullCup, flux, or any paid API. Game UI and image
prompts still go through the Cup key; this is the free local finishing step.

Auto mode: border-sampled flood key first, ToonOut (MIT) segmentation fallback, see
bgremove.py and THIRD_PARTY_NOTICES.md. Never use rembg's default bria-rmbg
(CC BY-NC 4.0 / paid commercial agreement).
"""

from __future__ import annotations

import argparse
import json
import math
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

# Design-system tokens (design-system.md §3). Chroma green is never a paint colour.
NOIR_PALETTE = {
    "ink": (12, 11, 10),
    "ink-soft": (26, 23, 20),
    "night": (18, 24, 28),
    "teal": (26, 42, 50),
    "blotter": (36, 31, 26),
    "folder-dark": (140, 111, 74),
    "folder": (196, 168, 130),
    "paper": (232, 220, 200),
    "paper-bright": (243, 234, 223),
    "text-dim": (201, 191, 174),
    "lamp": (232, 184, 109),
    "lamp-dim": (184, 137, 74),
    "seal": (140, 47, 43),
    "seal-bright": (181, 71, 65),
    "steel": (110, 122, 128),
    "fog": (138, 134, 128),
    "success": (201, 212, 168),
    "violin": (201, 160, 106),
    "train": (143, 164, 176),
}

CHROMA_GREEN = (0, 255, 0)
DEFAULT_SIZES = (128, 64, 32)
DEFAULT_GRID = 64
REMBG_SAFE_MODELS = (
    "toonout",  # MIT (BiRefNet fine-tune); default fallback via bgremove.py
    "u2net",  # Apache-2.0 (U-2-Net)
    "u2netp",
    "silueta",
    "birefnet-general-lite",  # MIT (code + weights), heavier RAM
    "birefnet-general",
)
# isnet-general-use is documented Apache-2.0 for code; weight licence is less
# explicit upstream (DIS#150), so it is not the default.


def _now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def palette_array() -> np.ndarray:
    return np.array(list(NOIR_PALETTE.values()), dtype=np.int16)


def load_rgba(path: Path) -> Image.Image:
    return Image.open(path).convert("RGBA")


def chroma_key(
    im: Image.Image,
    key: tuple[int, int, int] = CHROMA_GREEN,
    t_lo: float = 0.10,
    t_hi: float = 0.22,
    despill: bool = True,
) -> Image.Image:
    """Soft chroma key in RGB + green-excess, with green despill on edges."""
    arr = np.array(im.convert("RGBA"), dtype=np.float32)
    rgb = arr[..., :3]
    src_a = arr[..., 3] / 255.0
    key_v = np.array(key, dtype=np.float32)
    dist = np.linalg.norm(rgb - key_v, axis=2) / (255.0 * math.sqrt(3.0))
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    green_excess = np.clip((g - np.maximum(r, b)) / 255.0, 0.0, 1.0)
    # Background score: close to the key, or clearly more green than red/blue.
    bg = np.clip(np.maximum((t_hi - dist) / max(t_hi, 1e-6), green_excess / 0.45), 0.0, 1.0)
    # Map bg score through softness ramp (t_lo..t_hi in dist space, mirrored).
    alpha = np.clip((dist - t_lo) / max(t_hi - t_lo, 1e-6), 0.0, 1.0)
    alpha = np.minimum(alpha, 1.0 - np.clip((green_excess - 0.18) / 0.35, 0.0, 1.0))
    alpha = np.minimum(alpha, src_a)

    if despill:
        spill = np.clip((g - np.maximum(r, b)) / 255.0, 0.0, 1.0)
        # Stronger despill where the pixel is still partly background.
        weight = spill * (1.0 - alpha * 0.5)
        mid = (r + b) / 2.0
        rgb[..., 1] = g * (1.0 - weight) + mid * weight
        # Nudge leftover tint toward the red/blue average so seals do not go lime.
        rgb[..., 0] = np.clip(rgb[..., 0] + weight * 4.0, 0, 255)
        rgb[..., 2] = np.clip(rgb[..., 2] + weight * 2.0, 0, 255)

    out = np.empty_like(arr)
    out[..., :3] = np.clip(rgb, 0, 255)
    out[..., 3] = np.clip(alpha * 255.0, 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def ffmpeg_colorkey(
    src: Path,
    dest: Path,
    key: tuple[int, int, int] = CHROMA_GREEN,
    similarity: float = 0.15,
    blend: float = 0.08,
) -> Image.Image:
    """Optional ffmpeg colorkey + despill path, same contract as chroma_key."""
    hex_key = f"0x{key[0]:02X}{key[1]:02X}{key[2]:02X}"
    vf = f"colorkey={hex_key}:{similarity}:{blend},despill=type=green:mix=0.8"
    dest.parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y", "-i", str(src),
        "-vf", vf, "-pix_fmt", "rgba", str(dest),
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0 or not dest.exists():
        raise RuntimeError(f"ffmpeg colorkey failed: {proc.stderr[-800:]}")
    return load_rgba(dest)


def rembg_remove(im: Image.Image, model: str = "toonout") -> Image.Image:
    if model not in REMBG_SAFE_MODELS:
        raise ValueError(
            f"Refusing model {model!r}. Use one of {REMBG_SAFE_MODELS} "
            "(not bria-rmbg: non-commercial without a BRIA agreement)."
        )
    if model == "toonout":
        import bgremove

        a = bgremove.model_matte(im, "toonout")
        out = im.convert("RGBA")
        out.putalpha(Image.fromarray(a))
        return out
    from rembg import new_session, remove

    session = rembg_remove._sessions.get(model)
    if session is None:
        session = new_session(model)
        rembg_remove._sessions[model] = session
    out = remove(im, session=session)
    return out.convert("RGBA")


rembg_remove._sessions = {}


def residual_green_ratio(im: Image.Image, alpha_min: int = 24) -> float:
    arr = np.array(im.convert("RGBA"), dtype=np.int16)
    mask = arr[..., 3] >= alpha_min
    if not mask.any():
        return 1.0
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    greenish = mask & (g > r + 28) & (g > b + 28)
    return float(greenish.sum()) / float(mask.sum())


def opaque_ratio(im: Image.Image, alpha_min: int = 24) -> float:
    a = np.array(im.convert("RGBA"))[..., 3]
    return float((a >= alpha_min).sum()) / float(a.size)


def harden_alpha(im: Image.Image, threshold: int = 96) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    arr[..., 3] = np.where(arr[..., 3] >= threshold, 255, 0).astype(np.uint8)
    # Clear colour on fully transparent pixels so fringe does not resurface after resize.
    trans = arr[..., 3] == 0
    arr[trans, 0] = 0
    arr[trans, 1] = 0
    arr[trans, 2] = 0
    return Image.fromarray(arr, "RGBA")


def trim_and_pad(im: Image.Image, margin_ratio: float = 0.08) -> Image.Image:
    arr = np.array(im.convert("RGBA"))
    ys, xs = np.where(arr[..., 3] >= 16)
    if len(xs) == 0:
        return im
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    cropped = im.crop((x0, y0, x1, y1))
    side = max(cropped.size)
    pad = max(1, int(round(side * margin_ratio)))
    canvas = Image.new("RGBA", (side + pad * 2, side + pad * 2), (0, 0, 0, 0))
    ox = (canvas.size[0] - cropped.size[0]) // 2
    oy = (canvas.size[1] - cropped.size[1]) // 2
    canvas.paste(cropped, (ox, oy), cropped)
    return canvas


def quantize_palette(im: Image.Image, palette: np.ndarray | None = None) -> Image.Image:
    pal = palette if palette is not None else palette_array()
    arr = np.array(im.convert("RGBA"), dtype=np.int16)
    rgb = arr[..., :3]
    a = arr[..., 3]
    # Distance to each palette colour; keep transparency untouched.
    diff = rgb[:, :, None, :] - pal[None, None, :, :]
    dist = np.sqrt((diff.astype(np.int32) ** 2).sum(axis=3))
    idx = dist.argmin(axis=2)
    out = pal[idx].astype(np.uint8)
    rgba = np.dstack([out, a.astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def nearest_to_grid(im: Image.Image, grid: int) -> Image.Image:
    return im.resize((grid, grid), Image.Resampling.NEAREST)


def integer_upscale(im: Image.Image, size: int) -> Image.Image:
    w, h = im.size
    if w == size and h == size:
        return im
    # Scale by integer factor when possible, then nearest to the target.
    return im.resize((size, size), Image.Resampling.NEAREST)


def pixel_art_finish(im: Image.Image, grid: int = DEFAULT_GRID) -> Image.Image:
    hard = harden_alpha(im)
    trimmed = trim_and_pad(hard)
    native = nearest_to_grid(trimmed, grid)
    native = harden_alpha(native, threshold=128)
    return quantize_palette(native)


def export_sizes(
    im: Image.Image, dest_dir: Path, stem: str, sizes: tuple[int, ...] = DEFAULT_SIZES, webp: bool = True
) -> dict:
    dest_dir.mkdir(parents=True, exist_ok=True)
    paths = {}
    for size in sizes:
        scaled = integer_upscale(im, size) if im.size[0] <= size else nearest_to_grid(im, size)
        # If source grid is e.g. 64 and size is 32, nearest down; if 128, nearest up from grid.
        png_path = dest_dir / f"{stem}-{size}.png"
        scaled.save(png_path, "PNG", optimize=True)
        paths[f"png_{size}"] = str(png_path)
        if webp:
            webp_path = dest_dir / f"{stem}-{size}.webp"
            scaled.save(webp_path, "WEBP", lossless=True, quality=100)
            paths[f"webp_{size}"] = str(webp_path)
    # Also keep a native-grid copy under the stem.
    native = dest_dir / f"{stem}.png"
    im.save(native, "PNG", optimize=True)
    paths["native"] = str(native)
    return paths


def pack_atlas(images: list[tuple[str, Image.Image]], dest: Path, cell: int = 64) -> dict:
    n = len(images)
    if n == 0:
        return {}
    cols = math.ceil(math.sqrt(n))
    rows = math.ceil(n / cols)
    atlas = Image.new("RGBA", (cols * cell, rows * cell), (0, 0, 0, 0))
    frames = []
    for i, (name, im) in enumerate(images):
        tile = integer_upscale(im, cell) if im.size[0] != cell else im
        if tile.size != (cell, cell):
            tile = nearest_to_grid(tile, cell)
        x = (i % cols) * cell
        y = (i // cols) * cell
        atlas.paste(tile, (x, y), tile)
        frames.append({"id": name, "x": x, "y": y, "w": cell, "h": cell})
    dest.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(dest, "PNG", optimize=True)
    meta = {"image": dest.name, "cell": cell, "cols": cols, "rows": rows, "frames": frames}
    dest.with_suffix(".json").write_text(json.dumps(meta, indent=2) + "\n")
    return meta


def acceptable(im: Image.Image) -> tuple[bool, str]:
    opq = opaque_ratio(im)
    green = residual_green_ratio(im)
    if opq < 0.02:
        return False, f"subject too thin (opaque={opq:.3f})"
    if opq > 0.92:
        return False, f"background likely kept (opaque={opq:.3f})"
    if green > 0.03:
        return False, f"green spill remains ({green:.3f})"
    return True, "ok"


def process_one(
    path: Path,
    out_dir: Path,
    *,
    mode: str = "auto",
    key: tuple[int, int, int] = CHROMA_GREEN,
    t_lo: float = 0.10,
    t_hi: float = 0.22,
    despill: bool = True,
    rembg_model: str = "toonout",
    pixel_art: bool = True,
    grid: int = DEFAULT_GRID,
    sizes: tuple[int, ...] = DEFAULT_SIZES,
    webp: bool = True,
    allow_rembg: bool = True,
) -> dict:
    src = load_rgba(path)
    method = mode
    notes = []
    work = src

    def run_chroma(im: Image.Image) -> Image.Image:
        return chroma_key(im, key=key, t_lo=t_lo, t_hi=t_hi, despill=despill)

    if mode == "ffmpeg":
        tmp = out_dir / "_ffmpeg" / f"{path.stem}.png"
        work = ffmpeg_colorkey(path, tmp, key=key)
        method = "ffmpeg-colorkey"
    elif mode == "chromakey":
        work = run_chroma(src)
        method = "chromakey"
    elif mode == "rembg":
        if not allow_rembg:
            raise RuntimeError("rembg disabled")
        work = rembg_remove(src, rembg_model)
        work = run_chroma(work)  # drop leftover chroma if the plate used a green screen
        method = f"rembg:{rembg_model}+chromakey"
    else:
        # auto: key first when the border is a clean green, segmentation model as fallback
        # (bgremove.py; default ToonOut, MIT). Exact-#00FF00 chroma stays as a last resort
        # for synthetic fixtures whose key is pure green.
        import bgremove

        fallback = rembg_model if rembg_model in bgremove.FALLBACK_MODELS else bgremove.DEFAULT_FALLBACK
        work, info = bgremove.remove_background(src, model=fallback, allow_model=allow_rembg, accept=acceptable)
        method = info["method"]
        notes.extend(info["notes"])
        ok, why = acceptable(work)
        if not ok:
            alt = run_chroma(src)
            if acceptable(alt)[0]:
                notes.append(f"{method} rejected ({why}); exact chroma used")
                work, method = alt, "chromakey"

    work = trim_and_pad(work)
    if pixel_art:
        work = pixel_art_finish(work, grid=grid)
        notes.append(f"pixel-art grid {grid}px, noir palette, nearest-neighbor")

    ok, why = acceptable(work) if opaque_ratio(work) else (False, "empty")
    stem = path.stem
    asset_dir = out_dir / "icons" / stem
    paths = export_sizes(work, asset_dir, stem, sizes=sizes, webp=webp)
    rec = {
        "id": stem,
        "source": str(path),
        "method": method,
        "ok": ok,
        "quality": why,
        "opaque_ratio": round(opaque_ratio(work), 4),
        "residual_green": round(residual_green_ratio(work), 4),
        "grid": grid if pixel_art else None,
        "size_native": list(work.size),
        "paths": paths,
        "notes": notes,
    }
    return rec, work


def make_contact_sheet(
    rows: list[dict],
    dest: Path,
    backgrounds: tuple[tuple[str, tuple[int, int, int]], ...] = (
        ("night", (12, 11, 10)),
        ("parchment", (232, 220, 200)),
    ),
    preview: int = 128,
) -> Path:
    """One sheet: each asset as original / keyed / 64 / 128 on dark and parchment."""
    pad = 12
    label_h = 22
    col_w = preview + pad
    # columns: label + for each bg: source, processed 128, processed 64
    cols_per_bg = 3
    header = 48
    width = pad + 160 + len(backgrounds) * cols_per_bg * col_w + pad
    height = header + len(rows) * (preview + label_h + pad) + pad
    sheet = Image.new("RGB", (width, height), (26, 23, 20))
    draw = ImageDraw.Draw(sheet)
    draw.text((pad, 10), "Case Files bg-removal contact sheet (local, unpaid)", fill=(243, 234, 223))
    y = header
    for row in rows:
        x = pad
        draw.text((x, y), row["id"][:22], fill=(232, 184, 109))
        x = pad + 160
        src = load_rgba(Path(row["source"])) if row.get("source") else None
        proc128 = load_rgba(Path(row["paths"]["png_128"])) if row.get("paths") else row.get("image")
        proc64 = load_rgba(Path(row["paths"]["png_64"])) if row.get("paths") else None
        for bg_name, bg_rgb in backgrounds:
            for label, im, size in (
                ("src", src, preview),
                ("128", proc128, 128),
                ("64", proc64, 64),
            ):
                cell = Image.new("RGBA", (preview, preview), bg_rgb + (255,))
                if im is not None:
                    show = im.convert("RGBA")
                    show = show.resize((size, size), Image.Resampling.NEAREST)
                    ox = (preview - size) // 2
                    oy = (preview - size) // 2
                    cell.paste(show, (ox, oy), show)
                sheet.paste(cell.convert("RGB"), (x, y))
                draw.text((x, y + preview + 2), f"{bg_name}/{label}", fill=(201, 191, 174))
                x += col_w
        y += preview + label_h + pad
    dest.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(dest, "PNG", optimize=True)
    return dest


def iter_pngs(folder: Path) -> list[Path]:
    files = sorted(p for p in folder.iterdir() if p.suffix.lower() in {".png", ".webp", ".jpg", ".jpeg"})
    return files


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--input", required=True, type=Path, help="Folder of generated PNGs")
    p.add_argument("--output", required=True, type=Path, help="Output folder")
    p.add_argument("--mode", choices=["auto", "chromakey", "rembg", "ffmpeg"], default="auto")
    p.add_argument("--key", default="#00FF00")
    p.add_argument("--t-lo", type=float, default=0.10)
    p.add_argument("--t-hi", type=float, default=0.22)
    p.add_argument("--no-despill", action="store_true")
    p.add_argument("--rembg-model", "--fallback-model", dest="rembg_model", default="toonout", choices=REMBG_SAFE_MODELS)
    p.add_argument("--no-rembg", action="store_true")
    p.add_argument("--pixel-art", action=argparse.BooleanOptionalAction, default=True)
    p.add_argument("--grid", type=int, default=DEFAULT_GRID)
    p.add_argument("--sizes", default="128,64,32")
    p.add_argument("--no-webp", action="store_true")
    p.add_argument("--atlas", action=argparse.BooleanOptionalAction, default=True)
    p.add_argument("--contact-sheet", type=Path, default=None)
    return p


def parse_key(s: str) -> tuple[int, int, int]:
    s = s.strip().lstrip("#")
    if len(s) != 6:
        raise ValueError("key must be #RRGGBB")
    return tuple(int(s[i : i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    if not args.input.is_dir():
        print(f"input is not a folder: {args.input}", file=sys.stderr)
        return 2
    sizes = tuple(int(x) for x in args.sizes.split(",") if x)
    key = parse_key(args.key)
    args.output.mkdir(parents=True, exist_ok=True)
    records = []
    tiles = []
    for path in iter_pngs(args.input):
        rec, im = process_one(
            path,
            args.output,
            mode=args.mode,
            key=key,
            t_lo=args.t_lo,
            t_hi=args.t_hi,
            despill=not args.no_despill,
            rembg_model=args.rembg_model,
            pixel_art=args.pixel_art,
            grid=args.grid,
            sizes=sizes,
            webp=not args.no_webp,
            allow_rembg=not args.no_rembg,
        )
        records.append(rec)
        tiles.append((rec["id"], im))
        print(f"{rec['id']}: {rec['method']} ok={rec['ok']} {rec['quality']} green={rec['residual_green']}")

    manifest = {
        "generated_at": _now(),
        "pipeline": "case-files local bg-removal (infra, unpaid)",
        "mode": args.mode,
        "rembg_model": None if args.no_rembg else args.rembg_model,
        "pixel_art": args.pixel_art,
        "grid": args.grid if args.pixel_art else None,
        "sizes": list(sizes),
        "palette": {k: "#{:02X}{:02X}{:02X}".format(*v) for k, v in NOIR_PALETTE.items()},
        "assets": records,
    }
    if args.atlas and tiles:
        atlas_path = args.output / "atlas" / "icons-64.png"
        manifest["atlas"] = pack_atlas(tiles, atlas_path, cell=min(64, args.grid if args.pixel_art else 64))
        manifest["atlas"]["path"] = str(atlas_path)
    man_path = args.output / "manifest.json"
    man_path.write_text(json.dumps(manifest, indent=2) + "\n")
    sheet = args.contact_sheet or (args.output / "contact-sheet.png")
    make_contact_sheet(records, sheet)
    print(f"manifest {man_path}")
    print(f"contact sheet {sheet}")
    failed = [r for r in records if not r["ok"]]
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
