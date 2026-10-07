#!/usr/bin/env python3
"""prep27: compact E-relative summary of a prep27BatonProbe.py raw run. usage: prep27BatonSummary.py raw.json [out.json]"""
import json, sys
d = json.load(open(sys.argv[1])); E = d["E"]; R = {int(k): v for k, v in d["rows"].items()}
ks = sorted(R)
ev = []
def chg(name, get):
    prev = None
    for k in ks:
        v = get(R[k])
        if v != prev and prev is not None: ev.append([k - E, name, prev, v])
        prev = v
for b in (0, 1):
    chg(f"b{b}.slot", lambda r, b=b: r["b"][b][0]); chg(f"b{b}.invisible", lambda r, b=b: r["b"][b][5]); chg(f"b{b}.inuse", lambda r, b=b: r["b"][b][6])
    chg(f"h{b}.invisible", lambda r, b=b: r["h"][b][5]); chg(f"h{b}.inuse", lambda r, b=b: r["h"][b][6])
    chg(f"pidx{b}", lambda r, b=b: r["pidx"][b]); chg(f"species{b}", lambda r, b=b: r["species"][b]); chg(f"ctrl{b}", lambda r, b=b: r["ctrl"][b])
    chg(f"b{b}.x2", lambda r, b=b: r["b"][b][3] if r["b"][b][3] in (0,) else "moving")
chg("main", lambda r: r["main"]); chg("cb2", lambda r: r["cb2"]); chg("cb1", lambda r: r["cb1"]); chg("anim", lambda r: r["anim"])
chg("txtActive", lambda r: int(any(r["txt"][i:i+2] != "00" for i in range(0, len(r["txt"]), 2))))
chg("tasks", lambda r: ",".join(sorted(set(r["tasks"].values()))))
sp = [[s["f"] - E, s["slot"], s["ev"], s.get("cb"), s.get("tmpl")] for s in d["spawns"] if s["f"] >= E - 80]
out = {"scenario": d["scenario"], "E": E, "events": ev, "spawns": sp}
if len(sys.argv) > 2: json.dump(out, open(sys.argv[2], "w"), separators=(",", ":"))
else:
    for e in ev: print(*e)
    for s in sp: print("sp", *s)
