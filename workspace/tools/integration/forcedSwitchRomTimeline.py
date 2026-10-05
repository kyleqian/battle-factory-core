#!/usr/bin/env python3
"""forced-switch: print the ROM continuation timeline per scenario from the compact fixtures (E+k, E = first frame after the body)."""
import json, sys
from pathlib import Path
for p in sorted(Path(sys.argv[1] if len(sys.argv) > 1 else "tools/integration/fixtures/forced-switch/rom").glob("*.json")):
    d = json.loads(p.read_text()); print("==", d["scenario"], "E", d["E"])
    tg = None
    for e in d["events"]:
        k = e["k"]
        if k < 0: continue
        parts = []
        if "ctrl" in e: parts.append("ctrl=" + "/".join(e["ctrl"]))
        if "pidx" in e: parts.append("pidx=%s" % e["pidx"])
        if "species" in e: parts.append("species=%s" % e["species"])
        if "tgt" in e: parts.append("battler(slot,x,y,x2,y2,inv,inuse,mtx)=%s" % e["tgt"])
        if "hb" in e: parts.append("hb=%s" % e["hb"])
        if "txt" in e: parts.append("txt=%s" % e["txt"])
        if "main" in e: parts.append("main=%s" % e["main"])
        if parts and ("ctrl" in e or "pidx" in e or "species" in e or "hb" in e or "txt" in e or "main" in e or (("tgt" in e) and k < 14)): print("  +%d %s" % (k, " ".join(parts)))
    sp = [s for s in d["spawns"] if s["k"] >= 0]
    groups = {}
    for s in sp:
        key = (s["ev"], s.get("cb"))
        groups.setdefault(key, []).append((s["k"], s["slot"]))
    for (ev, cb), v in groups.items(): print("  spawn" if ev == "+" else "  free", cb or "", v[0][0], "..", v[-1][0], "n=%d" % len(v), "slots", sorted({x[1] for x in v})[:3])
