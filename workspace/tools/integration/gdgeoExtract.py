#!/usr/bin/env python3
"""gdgeo: raw probe rows (gdgeoProbe.py) -> prep43-format unit receipts, through prep43Extract.units_of with gdgeoProbe's JOBS.

usage (from workspace/): gdgeoExtract.py <out-dir> <units.json>   (pure python3, no mGBA; A == B byte-identical required per job)
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import gdgeoProbe as G

if __name__ == "__main__":
    X.J = G
    X.OUT = Path(sys.argv[1])
    result = {"schema": "prep43-units/v1", "jobs": {}}
    for unit, job, move, base, variant in G.JOBS:
        a, b = X.OUT / "raw" / f"{job}-A.json", X.OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "variant": list(variant), "rowsSha256A": rows, "identicalAB": same,
                 "predicted": G.PREDICTED[job]}
        entry.update(X.units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
