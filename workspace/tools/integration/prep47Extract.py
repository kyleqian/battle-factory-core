#!/usr/bin/env python3
"""prep47: raw sSpriteOrder probe rows (prep47Probe.py) -> compact unit receipts, via prep43Extract.units_of (pure python3, no mGBA).

usage (from workspace/): prep47Extract.py <out-dir> <units.json>
Units as prep43Extract: body = a gAnimScriptActive interval from its rising edge, gap = up to the next rising edge; every allocation
window {f, C, D, F}. Run A and run B of every job must be byte-identical files (identicalAB; sha256 of run A's rows recorded).
"""
import hashlib, json, sys, types
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import prep43Probe as P43
import prep47Probe as J

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    X.J = types.SimpleNamespace(JOBS=J.JOBS, scenario=J.scenario)
    result = {"schema": "prep47-units/v1", "jobs": {}}
    for unit, job, move, base, variant in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "variant": variant, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
