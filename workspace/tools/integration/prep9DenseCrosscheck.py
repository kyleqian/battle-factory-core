#!/usr/bin/env python3
"""prep9: cross-check the prep9 probe (fresh direct-mGBA run) against the retained accepted dense evidence tools/compare/evidence/<move>-<side>-dense-state.json.gz:
(1) the activation-frame unfaded/faded/hardware palette buffers (512 words each) equal; (2) over every dense row, the per-bank faded and unfaded hashes of the probe series equal the dense rows' (same frame numbers).
usage (workspace root): python3 tools/integration/prep9DenseCrosscheck.py [run=r1] > tools/integration/fixtures/prep9-dense-crosscheck.json"""
import json, gzip, hashlib, sys
RUN = sys.argv[1] if len(sys.argv) > 1 else "r1"
H = lambda w: hashlib.md5(bytes(x & 255 for x in w) + bytes(x >> 8 for x in w)).hexdigest()[:10]
out = {"run": RUN, "cases": []}
for mv in ("giga-drain", "mega-drain", "dream-eater", "sunny-day"):
    for side in ("player", "opponent"):
        dense = json.load(gzip.open(f"tools/compare/evidence/{mv}-{side}-dense-state.json.gz"))["frames"]
        p = json.load(open(f"tools/integration/fixtures/prep9-probes/{RUN}/{mv}-{side}-accepted.json")); snap = p["snapshots"]["act"]; S = p["series"]
        f0 = dense[0]
        act_eq = {k: f0[k + "Palette"] == snap[k] for k in ("unfaded", "faded", "hardware")}
        rows = mism = 0; first = None
        for r in dense:
            s = S.get(str(r["frame"]))
            if s is None: continue
            rows += 1
            ok = s["faded"] == [H(r["fadedPalette"][i * 16:i * 16 + 16]) for i in range(32)] and s["unfaded"] == [H(r["unfadedPalette"][i * 16:i * 16 + 16]) for i in range(32)] and s["hwEqFaded"] == (r["hardwarePalette"] == r["fadedPalette"])
            if not ok: mism += 1; first = first if first is not None else r["frame"] - dense[0]["frame"]
        out["cases"].append({"move": mv, "side": side, "activationFrame": f0["frame"], "probeActivation": p["activation"], "activationBuffersEqual": act_eq, "denseRows": len(dense), "rowsCompared": rows, "rowsMismatching": mism, "firstMismatchAge": first})
print(json.dumps(out, indent=1))
