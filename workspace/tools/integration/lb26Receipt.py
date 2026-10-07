#!/usr/bin/env python3
"""lb26 compact receipt. usage: lb26Receipt.py <dense pass1> <dense pass2> <probe a> <probe b> <out.json> [move-prefix ...]
Per fixture: both dense passes (2 renders each), and whether the two fresh bodies probes (a, b) agree on window + frame digest."""
import hashlib, json, sys
from pathlib import Path
R = Path(__file__).resolve().parents[2]; fx = R / "tools/integration/fixtures/later-bodies-lb26"; rows = {}
d1, d2, pa, pb, outp = sys.argv[1:6]; pre = sys.argv[6:]
def pdig(d):
    o = json.loads((Path(d) / "out.json").read_text())
    return o["bodyWindows"], hashlib.sha256(json.dumps(o["frames"], sort_keys=True).encode()).hexdigest()[:16]
for f in sorted(fx.glob("*.json")):
    t = f.stem
    if pre and not t.startswith(tuple(pre)): continue
    fixture = json.loads(f.read_text()); runs = []
    for d in (d1, d2):
        o = Path(d) / f"{t}.out"
        if o.exists() and o.read_text().strip(): runs += [{"exactRows": r["exactRows"], "rows": r["rows"], "residualPixels": r["residualPixels"], "digest": r["digest"]} for r in json.loads(o.read_text())]
    if not runs: continue
    wa, da = pdig(Path(pa) / t); wb, db = pdig(Path(pb) / t)
    rows[t] = {"move": fixture["move"], "attackerSide": fixture["attacker"]["geometry"]["side"], "denseWindow": fixture["denseWindow"],
               "precedingBodies": [(u["moveId"], u["side"]) for u in fixture["precedingBodies"]], "rows": runs[0]["rows"], "exactRows": runs[0]["exactRows"],
               "renders": len(runs), "identical": len({(r["exactRows"], r["residualPixels"], r["digest"]) for r in runs}) == 1,
               "probesIdentical": wa == wb and da == db, "probeFrameDigest": da, "residualPixels": sum(r["residualPixels"] for r in runs), "renderDigest": runs[0]["digest"]}
json.dump({"schema": "later-bodies-lb26-receipt/v1", "fixtures": rows}, open(outp, "w"), indent=1); open(outp, "a").write("\n")
print(len(rows), "fixtures", sum(r["residualPixels"] for r in rows.values()), "residual px; renders identical:", all(r["identical"] for r in rows.values()), "; probes identical:", all(r["probesIdentical"] for r in rows.values()))
