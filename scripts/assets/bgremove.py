"""Background removal for Case Files plates (local pipeline infrastructure, unpaid).

Two stages, chosen by benchmark (casefiles-qa/run26/bgremoval/benchmark.md):

1. ``flood_key``: border-sampled chroma key with edge flood-fill, enclosed-pocket
   clearing, halo peel and hard alpha. This is the approach pixel-art tools such as
   pixfix, Sprite Lab and Aseprite's magic wand use. Original code in this repo.
   Used first whenever the plate background is clean (uniform border).
2. A segmentation model as fallback when the border is not clean or the key fails
   the acceptance check. Default: ToonOut (BiRefNet fine-tuned for anime / illustrated
   characters, MIT code + weights). Alternative: BiRefNet general via rembg (MIT).
   The model mask is then re-keyed so leftover chroma never survives.

Weights are downloaded on first use into the user cache and verified by SHA-256.
Never use rembg's default ``bria-rmbg`` (CC BY-NC 4.0). See THIRD_PARTY_NOTICES.md.
"""
from __future__ import annotations

import hashlib
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

# Pinned model sources (see THIRD_PARTY_NOTICES.md)
TOONOUT_REPO = "joelseytre/toonout"
TOONOUT_REVISION = "cbf720eca394edcde66b861a8a8c20fbabe9c748"
TOONOUT_FILE = "birefnet_finetuned_toonout.pth"
TOONOUT_SHA256 = "8c7f8a0bc24400f4caade76622f75ff22ca1e93e169add9d2b70093e2487fbe5"
BIREFNET_CODE_REPO = "ZhengPeng7/BiRefNet"
BIREFNET_CODE_REVISION = "e2bf8e4460fc8fa32bba5ea4d94b3233d367b0e4"
REMBG_VERSION = "2.0.87"
REMBG_ALLOWED = ("birefnet-general", "birefnet-general-lite", "u2net")
FALLBACK_MODELS = ("toonout",) + REMBG_ALLOWED
DEFAULT_FALLBACK = "toonout"


def border_color(rgb: np.ndarray, ring: int = 8):
    b = np.concatenate([rgb[:ring].reshape(-1, 3), rgb[-ring:].reshape(-1, 3),
                        rgb[:, :ring].reshape(-1, 3), rgb[:, -ring:].reshape(-1, 3)])
    return np.median(b, axis=0), b


def bg_stats(im: Image.Image) -> dict:
    """Is the plate background clean enough for a key? Uniform border and green (we ask for #00FF00)."""
    rgb = np.asarray(im.convert("RGB"), np.float32)
    bg, border = border_color(rgb)
    bd = np.linalg.norm(border - bg, axis=1)
    p95 = float(np.percentile(bd, 95))
    r, g, b = bg
    return {
        "bg_rgb": [int(round(x)) for x in bg],
        "border_p95": round(p95, 1),
        "greenish": bool(g > r + 30 and g > b + 30),
        "clean": bool(p95 < 30.0 and float((bd < 40).mean()) > 0.97 and g > r + 30 and g > b + 30),
    }


def flood_key(im: Image.Image, peel: int = 2, hole_area: float = 0.0004) -> np.ndarray:
    """Return a hard alpha (0/255). Sample the border colour, flood from the edges with a
    tolerance learned from the border noise, clear enclosed pockets of the same colour,
    peel blended halo rings, never produce semi-transparent pixels."""
    rgb = np.asarray(im.convert("RGB"), np.float32)
    bg, border = border_color(rgb)
    d = np.linalg.norm(rgb - bg, axis=2)
    tol = max(18.0, float(np.percentile(np.linalg.norm(border - bg, axis=1), 99.5)) * 1.6)
    lab, _ = ndi.label(d < tol)
    edge_ids = np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))
    bgmask = np.isin(lab, edge_ids[edge_ids > 0])
    lab2, n2 = ndi.label((d < tol * 0.75) & ~bgmask)
    if n2:
        areas = ndi.sum(np.ones_like(d), lab2, index=np.arange(1, n2 + 1))
        bgmask |= np.isin(lab2, np.where(areas >= hole_area * d.size)[0] + 1)
    if bg[1] > bg[0] + 30 and bg[1] > bg[2] + 30:
        # green-screen plates: an enclosed pocket of clearly chroma-green hue is background
        # even when its shade differs from the border (shackle holes, gaps between keys).
        hue = (rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])) > 50
        lab3, n3 = ndi.label(hue & ~bgmask)
        if n3:
            areas = ndi.sum(np.ones_like(d), lab3, index=np.arange(1, n3 + 1))
            bgmask |= np.isin(lab3, np.where(areas >= 0.00005 * d.size)[0] + 1)
    for _ in range(peel):
        ring = ndi.binary_dilation(bgmask) & ~bgmask
        bgmask |= ring & (d < tol * 2.6)
    return np.where(bgmask, 0, 255).astype(np.uint8)


def despill(rgb: np.ndarray, alpha: np.ndarray, bg_rgb, width: int = 3) -> np.ndarray:
    """On the outer ring of the subject, pull the background hue back out."""
    out = rgb.astype(np.float32).copy()
    fg = alpha > 0
    ring = fg & ~ndi.binary_erosion(fg, iterations=width)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    br, bgc, bb = bg_rgb
    if bgc > br + 30 and bgc > bb + 30:  # green screen: clamp green to max(r, b)
        lim = np.maximum(r, b)
        g[ring] = np.minimum(g[ring], lim[ring] + 6)
    return np.clip(out, 0, 255).astype(np.uint8)


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


_toonout = None


def _load_toonout():
    global _toonout
    if _toonout is not None:
        return _toonout
    import re
    import torch
    from huggingface_hub import hf_hub_download, snapshot_download
    from transformers import AutoConfig, AutoModelForImageSegmentation

    code = snapshot_download(BIREFNET_CODE_REPO, revision=BIREFNET_CODE_REVISION,
                             allow_patterns=["*.py", "*.json"])
    w = Path(hf_hub_download(TOONOUT_REPO, TOONOUT_FILE, revision=TOONOUT_REVISION))
    if _sha256(w) != TOONOUT_SHA256:
        raise RuntimeError("ToonOut weights do not match the pinned SHA-256")
    cfg = AutoConfig.from_pretrained(code, trust_remote_code=True)
    model = AutoModelForImageSegmentation.from_config(cfg, trust_remote_code=True)
    sd = torch.load(w, map_location="cpu", weights_only=True)
    def rename(k: str) -> str:  # checkpoint saved from a compiled / DataParallel model
        k = k.replace("_orig_mod.", "")
        k = k[7:] if k.startswith("module.") else k
        return re.sub(r"^squeeze_(\d+)\.", r"squeeze_module.\1.", k)
    sd = {rename(k): v for k, v in sd.items()}
    missing, unexpected = model.load_state_dict(sd, strict=False)
    if missing or unexpected:
        raise RuntimeError(f"ToonOut state dict mismatch: {len(missing)} missing, {len(unexpected)} unexpected")
    model.eval()
    _toonout = model
    return model


def toonout_matte(im: Image.Image) -> np.ndarray:
    import torch
    from torchvision import transforms

    model = _load_toonout()
    tf = transforms.Compose([transforms.Resize((1024, 1024)), transforms.ToTensor(),
                             transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])])
    rgb = im.convert("RGB")
    with torch.no_grad():
        pred = model(tf(rgb).unsqueeze(0))[-1].sigmoid()[0, 0].numpy()
    return np.array(Image.fromarray((pred * 255).astype(np.uint8)).resize(rgb.size, Image.BILINEAR))


_rembg = {}


def rembg_matte(im: Image.Image, model: str) -> np.ndarray:
    if model not in REMBG_ALLOWED:
        raise ValueError(f"refusing rembg model {model!r}; allowed {REMBG_ALLOWED} (never bria-rmbg)")
    import onnxruntime as ort
    from rembg import new_session, remove

    if model not in _rembg:
        o = ort.SessionOptions()
        o.enable_cpu_mem_arena = False  # birefnet-general otherwise needs >11 GB on CPU
        o.enable_mem_pattern = False
        o.inter_op_num_threads = 1
        o.execution_mode = ort.ExecutionMode.ORT_SEQUENTIAL
        _rembg[model] = new_session(model, sess_opts=o)
    return np.array(remove(im.convert("RGB"), session=_rembg[model], post_process_mask=False))[..., 3]


def model_matte(im: Image.Image, model: str = DEFAULT_FALLBACK) -> np.ndarray:
    if model == "toonout":
        return toonout_matte(im)
    return rembg_matte(im, model)


def remove_background(im: Image.Image, *, model: str = DEFAULT_FALLBACK, allow_model: bool = True,
                      accept=None) -> tuple[Image.Image, dict]:
    """Key first when the background is clean, model fallback otherwise. Hard alpha out."""
    stats = bg_stats(im)
    rgb = np.asarray(im.convert("RGB"))
    info = {"bg": stats, "method": None, "notes": []}
    alpha = None
    if stats["clean"]:
        alpha = flood_key(im)
        info["method"] = "flood-key"
        if accept is not None:
            cand = Image.fromarray(np.dstack([despill(rgb, alpha, stats["bg_rgb"]), alpha]), "RGBA")
            ok, why = accept(cand)
            if not ok:
                info["notes"].append(f"flood-key rejected: {why}")
                alpha = None
    else:
        info["notes"].append(f"border not clean (p95={stats['border_p95']})")
    if alpha is None:
        if not allow_model:
            alpha = flood_key(im)
            info["method"] = "flood-key (forced, model disabled)"
        else:
            m = model_matte(im, model)
            fk = flood_key(im)
            # model mask, then drop any pixel the key still calls background (leftover chroma)
            alpha = np.where((m >= 128) & (fk > 0) if stats["clean"] else (m >= 128), 255, 0).astype(np.uint8)
            info["method"] = f"model:{model}" + ("+flood-key" if stats["clean"] else "")
    out = np.dstack([despill(rgb, alpha, stats["bg_rgb"]), alpha])
    out[alpha == 0, :3] = 0
    return Image.fromarray(out.astype(np.uint8), "RGBA"), info
