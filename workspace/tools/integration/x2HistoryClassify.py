#!/usr/bin/env python3
"""x2-history #148: per-move end-state table (machine-readable) from fixtures/x2-history/bodies-x2.json -> move-end-state-x2.json.
For every body, the ONIX-held role (species 95 on that battler) gives the observable x2 transition (start -> end+1 -> before next body); all roles give y2.
Class per (move, role): 'zeroed' (ONIX x2 1 -> 0 and stays 0 until the next body), 'unchanged' (stays 1 through the body and to the next body), 'transient' (leaves 1 inside the
body but is back at 1 at end+1), 'rest0' (ONIX already 0 at start: carries no information), 'mixed' (different bodies disagree).  y2Class: 'zero' always 0 at end+1/next, 'nonzero' otherwise."""
import json, collections, sys
SRC = sys.argv[1] if len(sys.argv) > 1 else "bodies-x2"; DST = sys.argv[2] if len(sys.argv) > 2 else "move-end-state-x2"  # tags under fixtures/x2-history
from pathlib import Path
D = json.loads(Path(f"tools/integration/fixtures/x2-history/{SRC}.json").read_text())["scenarios"]
tab = collections.defaultdict(lambda: collections.defaultdict(list))
for sc, v in D.items():
    for b in v["bodies"]:
        for role in ("attacker", "target"):
            r = b[role]; onix = b["species"][r["battler"]] == 95
            tab[b["move"]][role].append({"scenario": sc, "start": b["start"], "onix": onix, "x2": [r["atStart"][0], r["atEnd1"][0] if r["atEnd1"] else None, r["beforeNext"][0] if r["beforeNext"] else None],
                                         "y2": [r["atStart"][1], r["atEnd1"][1] if r["atEnd1"] else None, r["beforeNext"][1] if r["beforeNext"] else None], "leftX2": r["firstX2ChangeAge"] is not None, "firstX2ChangeAge": r["firstX2ChangeAge"]})
def cls(obs):
    o = [x for x in obs if x["onix"]]
    if not o: return "no-onix-obs", None
    kinds = set()
    for x in o:
        s, e, n = x["x2"]
        kinds.add("rest0" if s == 0 else "zeroed" if n == 0 else "unchanged" if (e == 1 and n == 1 and not x["leftX2"]) else "transient" if (e == 1 and n == 1) else "other:%s" % x["x2"])
    k = sorted(kinds - {"rest0"})
    return ("rest0" if not k else k[0] if len(k) == 1 else "mixed:" + "+".join(k)), len(o)
out, counts = {}, collections.Counter()
for mv in sorted(tab):
    row = {}
    for role in ("attacker", "target"):
        c, n = cls(tab[mv][role]); y = [x["y2"] for x in tab[mv][role]]
        yc = "zero" if all(v[1] in (0, None) and v[2] in (0, None) for v in y) else "nonzero"
        row[role] = {"x2Class": c, "onixObservations": n, "y2EndClass": yc, "bodies": len(tab[mv][role]), "samples": [x["scenario"] for x in tab[mv][role] if x["onix"]][:3]}
        counts[(role, c.split(":")[0])] += 1
    out[str(mv)] = row
Path(f"tools/integration/fixtures/x2-history/{DST}.json").write_text(json.dumps({"moves": len(out), "counts": {"%s/%s" % k: v for k, v in sorted(counts.items())}, "table": out}, indent=1))
print(len(out), dict(counts))
