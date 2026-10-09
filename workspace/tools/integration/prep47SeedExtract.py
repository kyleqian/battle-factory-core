#!/usr/bin/env python3
"""prep47 (B): raw battle-start probe rows (prep47SeedProbe.py) -> the allocation windows from the battle's ResetSpriteData up to the first
MOVE body (pure python3, no mGBA). usage (from workspace/): prep47SeedExtract.py <out-dir> <seed-units.json>
Per job: identicalAB (run A and run B byte-identical files), sha256 of run A's rows, every allocation window before the first
gAnimScriptActive rising edge with a nonzero sAnimMoveIndex {f, act (inside an animation script), C [[slot, f|e]], D, F after}, and F0 =
the free order at that first move body's first frame.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import spriteOrderBodyPlans as P
import prep47SeedProbe as J

if __name__ == "__main__":
    out = Path(sys.argv[1])
    result = {"schema": "prep47-seed-units/v1", "jobs": {}}
    for cls, job, leads in J.JOBS:
        a, b = out / "raw" / f"{job}-A.json", out / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        _, W = P.windows(a)
        first = next((i for i, w in enumerate(W) if w["act"] and w["mv"] != 0 and (i == 0 or not W[i - 1]["act"])), None)
        wins = [{"f": w["n"], "act": bool(w["act"]), "C": [[s, m] for s, m in P.create_modes(w["pmask"], w["C"])], "D": w["D"], "F": w["obsF"]}
                for w in W[:first if first is not None else len(W)] if w["C"] or w["D"]]
        result["jobs"][job] = {"class": cls, "leads": {k: list(v) for k, v in leads.items()}, "identicalAB": same, "rowsSha256A": rows,
                               "firstMoveFrame": None if first is None else W[first]["n"], "firstMove": None if first is None else W[first]["mv"],
                               "F0": None if first is None else W[first]["F"], "windows": wins}
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
