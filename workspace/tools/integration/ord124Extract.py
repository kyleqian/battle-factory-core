#!/usr/bin/env python3
"""ord124: raw sSpriteOrder probe rows (ord124Probe.py) -> compact unit receipts (pure python3, no mGBA), prep43Extract's unit split and
plan encoding (as plans69Extract.py). usage (from workspace/): ord124Extract.py <out-dir> <units.json>"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import ord124Probe as J

X.J = J

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    result = {"schema": "ord124-units/v1", "jobs": {}}
    for unit, job, move, base, ops in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "ops": [list(o) for o in ops], "rowsSha256A": rows,
                 "identicalAB": b.exists() and a.read_bytes() == b.read_bytes()}
        entry.update(X.units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
