#!/usr/bin/env python3
"""prep49: probe rows (prep49Probe.py) -> every allocation window of each job (pure python3, no mGBA).

usage (from workspace/): prep49Extract.py <out-dir> <units.json>
Per job: identicalAB (run A bytes == run B bytes), sha256 of run A's rows, F0 (the free order at the first kept frame: the battle's last
ResetSpriteData, i.e. the party-menu exit when a menu opened), every allocation window {f, act, mv, C (slot, f|e), D, F} and the
gAnimScriptActive rising edges {f, mv, F (the free order at the edge's first frame)}.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import prep49Probe as J

if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "prep49-units/v1", "jobs": {}}
    for cls, job, base, *_ in J.JOBS:
        a, b = out / "raw" / f"{job}-A.json", out / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        _, W = P.windows(a)
        edges = [{"f": w["n"], "mv": w["mv"], "F": w["F"]} for i, w in enumerate(W) if w["act"] and (i == 0 or not W[i - 1]["act"])]
        wins = [{"f": w["n"], "act": w["act"], "mv": w["mv"], "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"],
                 "F": w["obsF"]} for w in W if w["C"] or w["D"]]
        result["jobs"][job] = {"class": cls, "base": base, "identicalAB": b.exists() and a.read_bytes() == b.read_bytes(),
                               "rowsSha256A": hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest(),
                               "firstFrame": W[0]["n"], "F0": W[0]["F"], "windows": wins, "edges": edges}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
