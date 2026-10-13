#!/usr/bin/env python3
"""ord149 B1 analysis: per-row scanout split of Extrasensory bodies (ord149XsLineProbe.py receipts).
usage: ord149XsSplit.py <out.json> <probe.json>...
Bodies = runs of stepped rows (a gap > 5 trace frames starts a new body); stages = the distortion task's write phases (data[1] 0..23).
Per row: S = the last line that still shows the previous row's word (data[14] - 1 when none). Reports, per route, every body's S
sequence per stage, and whether S is a function of (stage, data[1]) across that route's bodies (it would have to be for a production rule
keyed by row and body class)."""
import json, sys
from pathlib import Path

out = {"schema": "ord149-xs-split/v1", "routes": {}}
for path in sys.argv[2:]:
    rows = [r for r in json.loads(Path(path).read_text())["rows"]]
    bodies, prev = [], None
    for r in rows:
        if prev is None or r[0] - prev > 5:
            bodies.append([])
        prev = r[0]
        if r[1] == 0 and isinstance(r[7], list):
            bodies[-1].append(r)
    route = {"bodies": []}
    for b in bodies:
        stages, cur = [], []
        for r in b:
            if r[2] == 0 and cur:
                stages.append(cur); cur = []
            cur.append(r)
        if cur:
            stages.append(cur)
        route["bodies"].append({"firstTraceFrame": b[0][0] if b else None, "window": [b[0][3], b[0][4]] if b else None,
                                "entryVcount": [[r[5] for r in s] for s in stages],
                                "split": [[max(r[7]) if r[7] else r[3] - 1 for r in s] for s in stages]})
    keyed = {}
    for b in route["bodies"]:
        for si, s in enumerate(b["split"]):
            for k, v in enumerate(s):
                keyed.setdefault((si, k), set()).add(v)
    route["rowKeys"] = len(keyed)
    route["rowKeysWithOneSplit"] = sum(len(v) == 1 for v in keyed.values())
    route["maxSplitPerBody"] = [max(max(s) for s in b["split"]) for b in route["bodies"]]
    out["routes"][Path(path).stem] = route
    print(Path(path).stem, "bodies", len(route["bodies"]), "rows", [sum(len(s) for s in b["split"]) for b in route["bodies"]],
          "split a function of (stage, row):", route["rowKeysWithOneSplit"], "/", route["rowKeys"], "max S per body", route["maxSplitPerBody"])
    for b in route["bodies"]:
        print("   body @", b["firstTraceFrame"], "window", b["window"], "S per stage:", " | ".join(",".join(map(str, s)) for s in b["split"]))
Path(sys.argv[1]).write_text(json.dumps(out, indent=1) + "\n")
