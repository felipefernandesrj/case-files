#!/usr/bin/env python3
"""Run 38 (gf10): handcuffed culprit plates via the Cup key (flux-1-schnell). Never prints the key. Hard cap US$0.50."""
import base64, json, sys, time
from datetime import datetime, timezone, timedelta
from pathlib import Path
sys.path.insert(0, "/workspace/casefiles-qa/run26/samples")
from generate_samples import request, load_key, redact, BASE, MODEL  # noqa
OUT = Path(__file__).resolve().parent; BRT = timezone(timedelta(hours=-3))
CAP_MICRO = 500_000; EXPECTED = 1901
STYLE = ("1990s Capcom CPS-2 beat-em-up arcade pixel art, Cadillacs and Dinosaurs era, gothic-noir detective mystery game, "
         "chunky pixels, bold 1-2 pixel ink-black outline, hard edges, no anti-aliasing, limited palette of ink black, "
         "cream parchment, lamp gold, wax-seal red, steel blue-grey{ACC}, ordered dithering")
ACC = {"violin": ", warm wood varnish gold", "train": ", cool steel grey"}
LOOKS = {
 "violin-carlos": ("violin", "man in his late fifties, weathered brown skin, short dark grey hair, cream work jacket over a dark red shirt, stern face"),
 "night-train-ines": ("train", "woman in her late thirties, warm brown skin, dark hair tied up, clean white chef's jacket, defeated look"),
}
def prompt(look, acc):
    return (STYLE.format(ACC=ACC[acc]) + ", arrested culprit sprite, single centered figure from the waist up, "
            f"{look}, head bowed, both wrists locked together in shiny steel handcuffs with a short chain, cuffed hands held low in front of the waist and clearly visible, "
            "same costume as the fighter-select portrait, lighting from the upper left, whole figure visible with an empty margin, "
            "no other people, no text, pure flat solid #00FF00 chroma-key green background filling the whole frame.")
def spent():
    return sum((json.loads(f.read_text()).get("cost_micro_usd") or EXPECTED) for f in (OUT / "meta").glob("*.json"))
def call(cid, seed, key):
    stem = f"arrest__{cid}.s{seed}"; mp = OUT / "meta" / f"{stem}.json"
    if mp.exists(): print("SKIP", stem); return
    if spent() + EXPECTED > CAP_MICRO: print("STOP cap"); sys.exit(3)
    acc, look = LOOKS[cid]
    body = {"model": MODEL, "prompt": prompt(look, acc), "n": 1, "steps": 4, "seed": seed, "response_format": "b64_json"}
    t0 = time.time(); st, hd, raw = request(f"{BASE}/images/generations", key, method="POST", body=body, timeout=180)
    rid = next((v for k, v in hd.items() if k.lower() == "x-fullcup-receipt"), None)
    rec = {"id": cid, "seed": seed, "model": MODEL, "steps": 4, "prompt": body["prompt"], "http_status": st, "receipt_id": rid,
           "created_brt": datetime.now(BRT).strftime("%Y-%m-%d %H:%M:%S"), "secs": round(time.time() - t0, 1),
           "seal_by": "2026-11-18 00:05Z"}
    try: p = json.loads(raw.decode())
    except Exception: p = {"error": redact(raw.decode("utf-8", "replace")[:300])}
    b64 = p.get("data", [{}])[0].get("b64_json") if isinstance(p, dict) and p.get("data") else None
    if not b64:
        rec["error"] = json.loads(redact(json.dumps(p))); print("FAIL", stem, st, str(rec["error"])[:300])
        if rid: rec["cost_micro_usd_assumed"] = EXPECTED; mp.write_text(json.dumps(rec, indent=2))
        else: (OUT / "meta" / f"{stem}.unbilled.err").write_text(json.dumps(rec, indent=2))
        return
    img = base64.b64decode(b64); ext = "png" if img[:4] == b"\x89PNG" else "jpg"
    rp = OUT / "raw" / f"{stem}.{ext}"; rp.write_bytes(img); rec["raw_path"] = str(rp)
    if rid:
        s2, h2, r2 = request(f"https://qa-api.fullcup.ai/api/receipts/{rid}", key, timeout=30)
        try:
            sig = json.loads(r2.decode()).get("receipt") or {}
            if isinstance(sig.get("cost_micro_usd"), int): rec["cost_micro_usd"] = sig["cost_micro_usd"]; rec["price_source"] = sig.get("price_source")
        except Exception: pass
    mp.write_text(json.dumps(rec, indent=2))
    print(f"OK {stem} {rid} {rec.get('cost_micro_usd','assumed')} total_usd={spent()/1e6:.6f}", flush=True)
if __name__ == "__main__":
    key = load_key()
    for a in sys.argv[1:]:
        cid, seed = a.split(":"); call(cid, int(seed), key); time.sleep(6.5)
    print(f"DONE total_usd={spent()/1e6:.6f}")
