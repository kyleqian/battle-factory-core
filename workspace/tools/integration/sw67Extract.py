#!/usr/bin/env python3
"""sw67: raw sSpriteOrder probe rows (sw67Probe.py) -> compact unit receipts (pure python3, no mGBA).

usage (from workspace/): sw67Extract.py <out-dir> <units.json> [--predictions <predictions.json>]
prep43Extract's unit split and plan encoding, driven by sw67Probe.jobs; run A == run B byte-identical recorded per job. Each job entry
carries its (player, opponent) species, so sw67ShockWaveFit.ts checks it without the scenario files.
"""
import hashlib, json, sys
from pathlib import Path

sys.path.insert(0, "tools/integration")
import prep43Extract as X
import sw67Probe as J

X.J = J

if __name__ == "__main__":
    OUT = Path(sys.argv[1])
    X.OUT = OUT
    argv = sys.argv[3:]
    predictions = Path(argv[argv.index("--predictions") + 1]) if "--predictions" in argv else Path("tools/integration/fixtures/sw67/predictions.json")
    J.JOBS = J.jobs(predictions)  # prep43Extract.units_of resolves the job (and its scenario) through J.JOBS
    result = {"schema": "sw67-units/v1", "jobs": {}}
    for unit, job, move, base, row in J.JOBS:
        a, b = OUT / "raw" / f"{job}-A.json", OUT / "raw" / f"{job}-B.json"
        if not a.exists():
            continue
        same = b.exists() and a.read_bytes() == b.read_bytes()
        rows = hashlib.sha256(json.dumps(json.loads(a.read_text())["rows"], separators=(",", ":")).encode()).hexdigest()
        entry = {"unit": unit, "move": move, "base": base, "species": {"player": row["player"], "opponent": row["opponent"]},
                 "seed": J.SEED, "rowsSha256A": rows, "identicalAB": same}
        entry.update(X.units_of(job, a))
        result["jobs"][job] = entry
    Path(sys.argv[2]).write_text(json.dumps(result, separators=(",", ":"), sort_keys=True) + "\n")
    print(len(result["jobs"]), "jobs;", sum(not j["identicalAB"] for j in result["jobs"].values()), "A/B differ")
