#!/usr/bin/env python3
"""prep48: compact receipt of the r1 / r2 direct-mGBA probe runs (prep48Probe.py outputs; no RGB).

usage: prep48Probes.py <r1-dir> <r2-dir> <out.json>
Per scenario: sha256 of the r1 and r2 JSON (same = the two fresh processes agree byte for byte) and the body list with the history state
at each activation: label, attacker, window, monbg-relevant registers (dispcnt, bg1cnt, bg2cnt, win0h/v, bldcnt, bldalpha, winout), the
scanline header (state, srcBuffer) + per-bank count of the 160 displayed lines that differ from S0, matrix bitmap, battler sprite x2/y2.
"""
import hashlib, json, sys
from pathlib import Path

r1, r2, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
S0B0 = [2] * 80 + [-2] * 80
rows = []
for a in sorted(r1.glob("*.json")):
    b = r2 / a.name
    ra, rb = a.read_bytes(), b.read_bytes() if b.exists() else b""
    d = json.loads(ra)
    bodies = []
    for x in d["bodies"]:
        at = x["at"]; r = at["registers"]; sc = at["scanline"]
        bodies.append({"label": x["label"], "attacker": x["attacker"], "window": [x["startFrame"], x.get("endFrame")],
                       "regs": {k: r[k] for k in ("dispcnt", "bg1cnt", "bg2cnt", "win0h", "win0v", "bldcnt", "bldalpha", "winout")},
                       "scanline": [sc["state"], sc["srcBuffer"], sum(v != S0B0[i] for i, v in enumerate(sc["banks"][0][:160])),
                                    sum(v != 0 for v in sc["banks"][1][:160])],
                       "matrixBitmap": at["matrixBitmap"], "x2": [[s["x2"], s["y2"]] for s in at["battlerSprites"]]})
    rows.append({"scenario": a.stem, "r1": hashlib.sha256(ra).hexdigest()[:16], "r2": hashlib.sha256(rb).hexdigest()[:16],
                 "same": ra == rb, "bodies": bodies})
out.write_text(json.dumps({"schema": "prep48-probes/v1", "scenarios": len(rows), "allSame": all(r["same"] for r in rows), "rows": rows},
                          indent=0, separators=(",", ":")) + "\n")
print(f"{len(rows)} scenarios, r1 == r2: {sum(r['same'] for r in rows)}")
